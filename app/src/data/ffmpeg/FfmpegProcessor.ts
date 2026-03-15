import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { generateUniqueFileSuffix, extractErrorFromLogs, getCacheDir } from './ffmpegUtils';
import { VideoFormat } from '../../state/store';

export interface FfmpegProcessResult {
  outputUri: string;
  outputBytes: number;
}


/**
 * ガビガビレベルに対応するJPEG品質値（FFmpeg -q:v, 1=最高品質, 31=最低品質）
 * compressionRateをqv = round(1 + 30 * (compressionRate/100)^2.5)で変換した値。
 * (#167) 圧縮率表示に合わせて非線形マッピングに更新。
 */
const GABIGABI_QUALITY: Record<number, number> = {
  0: 1,  // 圧縮率 0% → q:v=1（ほぼ劣化なし）
  1: 8,  // 圧縮率55% → q:v=8
  2: 13, // 圧縮率70% → q:v=13
  3: 21, // 圧縮率85% → q:v=21
  4: 25, // 圧縮率92% → q:v=25
  5: 30, // 圧縮率99% → q:v=30
};

/**
 * FFmpegを使って画像をガビガビ化する。
 * スケール縮小 + 低品質JPEG圧縮でガビガビ効果を出す。
 *
 * @param inputUri   入力画像のファイルURI
 * @param scalePct   縮小率（1〜100 %）
 * @param gabigabiLevel  ガビガビレベル（1〜5、省略時 2）
 */

/**
 * ガビガビレベルに対応するH.264 CRF値（23=標準品質, 51=最低品質）
 */
const GABIGABI_CRF_H264: Record<number, number> = {
  0: 23, // ほぼ劣化なし
  1: 35,
  2: 40,
  3: 45,
  4: 48,
  5: 51, // 最低品質
};

/**
 * ガビガビレベルに対応するVP9 CRF値（0〜63、33=標準品質, 63=最低品質）
 * VP9はH.264と異なりCRF範囲が0〜63のため専用テーブルを使用する。
 */
const GABIGABI_CRF_VP9: Record<number, number> = {
  0: 33, // ほぼ劣化なし
  1: 45,
  2: 50,
  3: 55,
  4: 60,
  5: 63, // 最低品質
};


/**
 * FFmpegを使って動画をガビガビ化する。
 * スケール縮小 + 低品質H.264エンコードでガビガビ効果を出す。
 *
 * @param inputUri       入力動画のファイルURI
 * @param scalePct       縮小率（1〜100 %）
 * @param gabigabiLevel  ガビガビレベル（0〜5、省略時 2）
 */
/**
 * 動画フォーマットに対応するFFmpegコーデック設定
 */
const VIDEO_FORMAT_CODECS: Record<VideoFormat, string[]> = {
  mp4:  ['-c:v', 'libx264', '-c:a', 'aac'],
  mov:  ['-c:v', 'libx264', '-c:a', 'aac'],
  mkv:  ['-c:v', 'libx264', '-c:a', 'aac'],
  webm: ['-c:v', 'libvpx-vp9', '-c:a', 'libvorbis'],
};

export async function processVideoWithFfmpeg(
  inputUri: string,
  scalePct: number,
  gabigabiLevel: number = 2,
  outputFormat: VideoFormat = 'mp4',
): Promise<FfmpegProcessResult> {
  if (scalePct <= 0 || scalePct > 100) {
    throw new Error('scalePct must be within (0, 100]');
  }
  if (gabigabiLevel < 0 || gabigabiLevel > 5) {
    throw new Error('gabigabiLevel must be 0-5');
  }

  const inputInfo = await FileSystem.getInfoAsync(inputUri, { size: true });
  if (!inputInfo.exists) {
    throw new Error('入力ファイルが存在しません');
  }
  const inputBytes = (inputInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
  if (inputBytes === 0) {
    throw new Error('入力ファイルが空（0バイト）です');
  }


  const inputPath = inputUri.replace('file://', '');
  const fileName = inputPath.split('/').pop() ?? 'video.mp4';
  const stem = fileName.replace(/\.[^.]+$/, '');
  const cacheDir = getCacheDir();
  const suffix = generateUniqueFileSuffix();
  const outputUri = `${cacheDir}${stem}_gabigabi_${suffix}.${outputFormat}`;
  const outputPath = outputUri.replace('file://', '');

  if (__DEV__) console.log('[FFmpeg] video outputPath:', outputPath);

  const crf = outputFormat === 'webm'
    ? (GABIGABI_CRF_VP9[gabigabiLevel] ?? 50)
    : (GABIGABI_CRF_H264[gabigabiLevel] ?? 40);
  const scale = scalePct / 100;

  const codecArgs = VIDEO_FORMAT_CODECS[outputFormat] ?? VIDEO_FORMAT_CODECS.mp4;

  // フォーマットに応じた品質パラメータを選択する
  // - libvpx-vp9 (webm): -crf + -b:v 0 (constrained quality mode)
  // - libx264: -crf
  let qualityArgs: string[];
  if (outputFormat === 'webm') {
    qualityArgs = ['-crf', String(crf), '-b:v', '0'];
  } else {
    qualityArgs = ['-crf', String(crf)];
  }

  // -vf scale でリサイズ、品質パラメータでガビガビ化
  // scale の値を偶数に丸める（H.264 の要件）
  const cmd = [
    '-y',
    '-i', `"${inputPath}"`,
    '-vf', `"scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2"`,
    ...codecArgs,
    ...qualityArgs,
    `"${outputPath}"`,
  ].join(' ');

  try {
    const session = await FFmpegKit.execute(cmd);
    const rc = await session.getReturnCode();

    if (!ReturnCode.isSuccess(rc)) {
      const logs = await extractErrorFromLogs(session);
      throw new Error(`FFmpeg処理に失敗しました: ${logs}`);
    }
  } catch (err) {
    await FileSystem.deleteAsync(outputUri, { idempotent: true });
    throw err;
  }

  const info = await FileSystem.getInfoAsync(outputUri, { size: true });
  if (!info.exists) {
    throw new Error('FFmpeg出力ファイルが見つかりません');
  }
  return {
    outputUri,
    outputBytes: (info as FileSystem.FileInfo & { size: number }).size ?? 0,
  };
}

export interface ProcessWithFfmpegOptions {
  shrinkExpandEnabled?: boolean;
  shrinkExpandRate?: number; // 10〜90 (%)
  multiCompressEnabled?: boolean;
  multiCompressCount?: number; // 1〜10
}

export async function processWithFfmpeg(
  inputUri: string,
  scalePct: number,
  gabigabiLevel: number = 2,
  options: ProcessWithFfmpegOptions = {},
): Promise<FfmpegProcessResult> {
  if (scalePct <= 0 || scalePct > 100) {
    throw new Error('scalePct must be within (0, 100]');
  }
  if (gabigabiLevel < 0 || gabigabiLevel > 5) {
    throw new Error('gabigabiLevel must be 0-5');
  }

  const {
    shrinkExpandEnabled = false,
    shrinkExpandRate = 50,
    multiCompressEnabled = false,
    multiCompressCount = 3,
  } = options;

  // 入力ファイルの存在確認とサイズチェック
  const inputInfo = await FileSystem.getInfoAsync(inputUri, { size: true });
  if (!inputInfo.exists) {
    throw new Error('入力ファイルが存在しません');
  }
  const inputBytes = (inputInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
  if (inputBytes === 0) {
    throw new Error('入力ファイルが空（0バイト）です');
  }

  // 前回の一時ファイルをクリーンアップ（#214: アプリ起動時に移動したため削除）

  const inputPath = inputUri.replace('file://', '');
  const fileName = inputPath.split('/').pop() ?? 'image.jpg';
  const stem = fileName.replace(/\.[^.]+$/, '');
  const inputExt = (fileName.match(/\.[^.]+$/)?.[0] ?? '.jpg').toLowerCase();
  // PNG はロスレスなので -q:v が無効になる。JPEG に変換して品質劣化を有効にする。
  const ext = inputExt === '.png' ? '.jpg' : inputExt;
  const cacheDir = getCacheDir();
  const suffix = generateUniqueFileSuffix();
  const outputUri = `${cacheDir}${stem}_gabigabi_${suffix}${ext}`;
  const outputPath = outputUri.replace('file://', '');

  if (__DEV__) console.log('[FFmpeg] outputPath:', outputPath);

  const quality = GABIGABI_QUALITY[gabigabiLevel] ?? 18;
  const scale = scalePct / 100;

  // -vf フィルターチェーンを構築
  // 1. リサイズ
  // 2. 縮小→再拡大（shrinkExpandEnabled の場合）
  const vfFilters: string[] = [];
  vfFilters.push(`scale=trunc(iw*${scale}/2)*2:trunc(ih*${scale}/2)*2`);
  if (shrinkExpandEnabled) {
    const shrinkRate = Math.max(10, Math.min(90, shrinkExpandRate)) / 100;
    // リサイズ後サイズからさらに shrinkRate% に縮小し、元のリサイズ後サイズに拡大
    vfFilters.push(`scale=trunc(iw*${shrinkRate}/2)*2:trunc(ih*${shrinkRate}/2)*2`);
    vfFilters.push(`scale=trunc(iw/${shrinkRate}/2)*2:trunc(ih/${shrinkRate}/2)*2`);
  }
  const vfChain = vfFilters.join(',');

  // 1回目の変換
  const buildCmd = (inPath: string, outPath: string) => [
    '-y',
    '-i', `"${inPath}"`,
    '-vf', `"${vfChain}"`,
    '-q:v', String(quality),
    '-update', '1',
    '-frames:v', '1',
    `"${outPath}"`,
  ].join(' ');

  try {
    const session = await FFmpegKit.execute(buildCmd(inputPath, outputPath));
    const rc = await session.getReturnCode();

    if (!ReturnCode.isSuccess(rc)) {
      const logs = await extractErrorFromLogs(session);
      throw new Error(`FFmpeg処理に失敗しました: ${logs}`);
    }
  } catch (err) {
    await FileSystem.deleteAsync(outputUri, { idempotent: true });
    throw err;
  }

  // 多重圧縮（2回目〜N回目）
  if (multiCompressEnabled && multiCompressCount > 1) {
    const totalPasses = Math.max(1, Math.min(10, multiCompressCount));
    let currentInput = outputUri;

    let finalTempUri: string | null = null;
    try {
      for (let pass = 2; pass <= totalPasses; pass++) {
        const passSuffix = generateUniqueFileSuffix();
        const passUri = `${cacheDir}${stem}_gabigabi_pass${pass}_${passSuffix}${ext}`;
        const passInputPath = currentInput.replace('file://', '');
        const passOutputPath = passUri.replace('file://', '');

        // 多重圧縮では vf フィルターなしで再圧縮のみ
        const passCmd = [
          '-y',
          '-i', `"${passInputPath}"`,
          '-q:v', String(quality),
          '-update', '1',
          '-frames:v', '1',
          `"${passOutputPath}"`,
        ].join(' ');

        const passSession = await FFmpegKit.execute(passCmd);
        const passRc = await passSession.getReturnCode();

        if (!ReturnCode.isSuccess(passRc)) {
          const logs = await extractErrorFromLogs(passSession);
          throw new Error(`FFmpeg多重圧縮(pass ${pass})に失敗しました: ${logs}`);
        }

        // 前の一時ファイルを削除
        // currentInput === outputUri の場合（pass2 の先頭）は outputUri を削除しない。
        // moveAsync 完了前に outputUri を削除すると moveAsync 失敗時にデータが消失する
        // リスクがある（Issue #195, #201）。
        if (currentInput !== outputUri) {
          await FileSystem.deleteAsync(currentInput, { idempotent: true });
        }
        currentInput = passUri;
        finalTempUri = passUri;
      }

      // 最終出力を outputUri にリネーム（move）
      // moveAsync の前に outputUri を削除しておくことで上書きを保証する。
      // この時点で currentInput !== outputUri が保証されているため安全に削除できる。
      if (finalTempUri) {
        await FileSystem.deleteAsync(outputUri, { idempotent: true });
        await FileSystem.moveAsync({ from: finalTempUri, to: outputUri });
        finalTempUri = null; // move 成功
      }
    } finally {
      // エラー発生時、または move 失敗時に残存した一時ファイルをクリーンアップする
      if (finalTempUri && finalTempUri !== outputUri) {
        await FileSystem.deleteAsync(finalTempUri, { idempotent: true });
      }
    }
  }

  const info = await FileSystem.getInfoAsync(outputUri, { size: true });
  if (!info.exists) {
    throw new Error('FFmpeg出力ファイルが見つかりません');
  }
  return {
    outputUri,
    outputBytes: (info as FileSystem.FileInfo & { size: number }).size ?? 0,
  };
}
