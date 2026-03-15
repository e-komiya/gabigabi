import { FFmpegKit, FFprobeKit, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { generateUniqueFileSuffix, extractErrorFromLogs, getCacheDir, getPasslogConfig } from './ffmpegUtils';

export interface CompressResult {
  outputUri: string;
  outputBytes: number;
  compressionRatio: number;
}

const DISCORD_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * ファイルの拡張子から動画かどうかを判定する。
 */
function isVideoFile(uri: string): boolean {
  const lower = uri.toLowerCase();
  return /\.(mp4|mov|avi|mkv|webm|m4v|3gp|mpg|mpeg)$/.test(lower);
}

/**
 * FFprobeKitを使って動画の長さ（秒）を取得する。
 * (#46) FFmpeg エラーログのパースから FFprobeKit.getMediaInformation() に移行。
 */
async function getVideoDurationSec(inputPath: string): Promise<number> {
  const session = await FFprobeKit.getMediaInformation(inputPath);
  const info = await session.getMediaInformation();
  if (info) {
    const duration = info.getDuration();
    if (duration != null && !isNaN(Number(duration))) {
      return Number(duration);
    }
  }
  throw new Error('動画の長さを取得できませんでした');
}

/**
 * 画像を指定バイト数以下に圧縮する（JPEG品質をバイナリサーチ）。
 *
 * @param inputUri    入力画像ファイルURI
 * @param targetBytes 目標ファイルサイズ（バイト）
 * @param forceJpeg   true の場合は入力形式に関わらず JPEG で出力する（Discord送信など）
 */
async function compressImageToTarget(
  inputUri: string,
  targetBytes: number,
  forceJpeg: boolean = false,
): Promise<CompressResult> {
  // 入力ファイルの存在確認とサイズチェック
  const inputInfo = await FileSystem.getInfoAsync(inputUri, { size: true });
  if (!inputInfo.exists) {
    throw new Error('入力ファイルが存在しません');
  }
  const originalBytes = (inputInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
  if (originalBytes === 0) {
    throw new Error('入力ファイルが空（0バイト）です');
  }

  const inputPath = inputUri.replace('file://', '');

  if (originalBytes <= targetBytes) {
    return {
      outputUri: inputUri,
      outputBytes: originalBytes,
      compressionRatio: 1,
    };
  }

  const stem = inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'image';
  // forceJpeg が false の場合は入力ファイルの拡張子を保持する
  const inputExt = inputPath.split('.').pop()?.toLowerCase() ?? 'jpg';
  const outputExt = forceJpeg ? 'jpg' : inputExt;
  const cacheDir = getCacheDir();
  const suffix = generateUniqueFileSuffix();
  const outputUri = `${cacheDir}${stem}_compressed_${suffix}.${outputExt}`;
  const outputPath = outputUri.replace('file://', '');

  let lo = 1;
  let hi = 31; // FFmpeg -q:v range: 1 (best) to 31 (worst)
  let bestQv = hi;
  let bestBytes = 0;

  // バイナリサーチで targetBytes 以下に収まる最高品質を探す
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const cmd = [
      '-y',
      '-i', `"${inputPath}"`,
      '-q:v', String(mid),
      '-update', '1',
      '-frames:v', '1',
      `"${outputPath}"`,
    ].join(' ');

    const session = await FFmpegKit.execute(cmd);
    const rc = await session.getReturnCode();
    if (!ReturnCode.isSuccess(rc)) {
      throw new Error('FFmpeg画像圧縮に失敗しました');
    }

    const outInfo = await FileSystem.getInfoAsync(outputUri, { size: true });
    const outBytes = (outInfo as FileSystem.FileInfo & { size: number }).size ?? 0;

    if (outBytes <= targetBytes) {
      bestQv = mid;
      bestBytes = outBytes;
      hi = mid - 1; // より高品質（低い qv）を試す
    } else {
      lo = mid + 1; // さらに圧縮（高い qv）を試す
    }
  }

  if (bestBytes === 0) {
    // 最低品質でも超えてしまう場合はスケールダウンも加える
    const cmd = [
      '-y',
      '-i', `"${inputPath}"`,
      '-vf', '"scale=iw*0.5:ih*0.5"',
      '-q:v', '31',
      '-update', '1',
      '-frames:v', '1',
      `"${outputPath}"`,
    ].join(' ');
    const session = await FFmpegKit.execute(cmd);
    const rc = await session.getReturnCode();
    if (!ReturnCode.isSuccess(rc)) {
      throw new Error('FFmpeg画像圧縮（スケールダウン）に失敗しました');
    }
    const outInfo = await FileSystem.getInfoAsync(outputUri, { size: true });
    bestBytes = (outInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
  }

  // リトライ後も目標サイズを超えている場合はエラーを投げる (#290)
  if (bestBytes > targetBytes) {
    await FileSystem.deleteAsync(outputUri, { idempotent: true });
    const targetMB = (targetBytes / (1024 * 1024)).toFixed(1);
    throw new Error(`画像を目標サイズ（${targetMB}MB）以下に圧縮できませんでした。`);
  }

  return {
    outputUri,
    outputBytes: bestBytes,
    compressionRatio: originalBytes > 0 ? bestBytes / originalBytes : 1,
  };
}

/**
 * 動画を指定バイト数以下にビットレート制御で圧縮する。
 *
 * @param inputUri      入力動画ファイルURI
 * @param targetBytes   目標ファイルサイズ（バイト）
 * @param outputFormat  出力拡張子 (mp4, webm, mov, etc...)
 */
async function compressVideoToTarget(
  inputUri: string,
  targetBytes: number,
  outputFormat: string = 'mp4',
): Promise<CompressResult> {
  // 入力ファイルの存在確認とサイズチェック
  const inputInfo = await FileSystem.getInfoAsync(inputUri, { size: true });
  if (!inputInfo.exists) {
    throw new Error('入力ファイルが存在しません');
  }
  const originalBytes = (inputInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
  if (originalBytes === 0) {
    throw new Error('入力ファイルが空（0バイト）です');
  }

  const inputPath = inputUri.replace('file://', '');

  if (originalBytes <= targetBytes) {
    return {
      outputUri: inputUri,
      outputBytes: originalBytes,
      compressionRatio: 1,
    };
  }

  const durationSec = await getVideoDurationSec(inputPath);
  if (durationSec <= 0) {
    throw new Error('動画の長さが取得できませんでした');
  }

  // 目標ビットレートを計算（オーバーヘッド10%マージン + オーディオビットレート分を差し引く）
  const audioBitrateKbps = 64;
  const targetBits = targetBytes * 8 * 0.90;
  const videoBitrateKbps = Math.floor(targetBits / durationSec / 1000) - audioBitrateKbps;

  if (videoBitrateKbps < 50) {
    const targetMB = Math.round(targetBytes / (1024 * 1024));
    throw new Error(`動画が長すぎて${targetMB}MB以下には圧縮できません`);
  }

  const stem = inputPath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'video';
  const cacheDir = getCacheDir();
  const suffix = generateUniqueFileSuffix();
  const outputUri = `${cacheDir}${stem}_compressed_${suffix}.${outputFormat}`;
  const outputPath = outputUri.replace('file://', '');
  const { uri: passlogUri, path: passlogFilesystemPath } = getPasslogConfig(stem, suffix);

  // pass1 開始前に古い passlog ファイルを削除して再試行時の混入を防ぐ (#216)
  // deleteAsync は file:// URI が必要なため passlogUri を使用する (#276)
  await FileSystem.deleteAsync(`${passlogUri}-0.log`, { idempotent: true });
  await FileSystem.deleteAsync(`${passlogUri}-0.log.mbtree`, { idempotent: true });

  // コーデック設定: webm の場合は libvpx-vp9/libopus, それ以外は libx264/aac
  const isWebm = outputFormat.toLowerCase() === 'webm';
  let vcodec = isWebm ? 'libvpx-vp9' : 'libx264';
  const acodec = isWebm ? 'libopus' : 'aac';

  // Android ハードウェア加速 (MediaCodec) の試行
  // H.264 かつ Android 環境（ffmpeg-kit-react-native が利用可能と想定）の場合
  if (!isWebm) {
    try {
      const hardwareConfig = await FFmpegKit.execute('-encoders');
      const output = await hardwareConfig.getOutput();
      if (output.includes('h264_mediacodec')) {
        vcodec = 'h264_mediacodec';
      }
    } catch (e) {
      // エンコーダ一覧の取得に失敗した場合はデフォルトの libx264 を使用
    }
  }

  // プリセット設定 (H.264 libx264 の場合のみ)
  const preset = (vcodec === 'libx264') ? ['-preset', 'superfast'] : [];

  // 1パス目: CRFモードで高速圧縮を試行 (CRF=28をデフォルトとする)
  const crfCmd = [
    '-y',
    '-i', `"${inputPath}"`,
    '-c:v', vcodec,
    ...preset,
    '-crf', '28',
    '-c:a', acodec,
    '-b:a', '64k',
    `"${outputPath}"`,
  ].join(' ');

  let useTwoPass = true;
  try {
    const crfSession = await FFmpegKit.execute(crfCmd);
    const crfRc = await crfSession.getReturnCode();
    if (ReturnCode.isSuccess(crfRc)) {
      const crfInfo = await FileSystem.getInfoAsync(outputUri, { size: true });
      const crfBytes = (crfInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
      if (crfBytes > 0 && crfBytes <= targetBytes) {
        useTwoPass = false;
      }
    }
  } catch (e) {
    // CRF試行に失敗した場合は2パスにフォールバック
  }

  if (useTwoPass) {
    // 2パスエンコードで精度の高いビットレート制御
    const pass1Cmd = [
      '-y',
      '-i', `"${inputPath}"`,
      '-c:v', vcodec,
      ...preset,
      '-b:v', `${videoBitrateKbps}k`,
      '-pass', '1',
      '-passlogfile', `"${passlogFilesystemPath}"`,
      '-an',
      '-f', isWebm ? 'webm' : 'null', isWebm ? '/dev/null' : '/dev/null',
    ].join(' ');

    const pass2Cmd = [
      '-y',
      '-i', `"${inputPath}"`,
      '-c:v', vcodec,
      ...preset,
      '-b:v', `${videoBitrateKbps}k`,
      '-pass', '2',
      '-passlogfile', `"${passlogFilesystemPath}"`,
      '-c:a', acodec,
      '-b:a', '64k',
      `"${outputPath}"`,
    ].join(' ');

    try {
      const pass1Session = await FFmpegKit.execute(pass1Cmd);
      const pass1Rc = await pass1Session.getReturnCode();
      if (!ReturnCode.isSuccess(pass1Rc)) {
        const logs = await extractErrorFromLogs(pass1Session);
        throw new Error(`FFmpeg 1パス目に失敗しました: ${logs}`);
      }

      const pass2Session = await FFmpegKit.execute(pass2Cmd);
      const pass2Rc = await pass2Session.getReturnCode();
      if (!ReturnCode.isSuccess(pass2Rc)) {
        const logs = await extractErrorFromLogs(pass2Session);
        throw new Error(`FFmpeg 2パス目に失敗しました: ${logs}`);
      }
    } catch (err) {
      await FileSystem.deleteAsync(outputUri, { idempotent: true });
      throw err;
    } finally {
      // 成功・失敗・キャンセルいずれの場合も passlog 一時ファイルを削除する (#234)
      await FileSystem.deleteAsync(`${passlogUri}-0.log`, { idempotent: true });
      await FileSystem.deleteAsync(`${passlogUri}-0.log.mbtree`, { idempotent: true });
    }
  }

  let outInfo = await FileSystem.getInfoAsync(outputUri, { size: true });
  let outputBytes = (outInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
  let currentOutputUri = outputUri;

  // 出力サイズ検証: 目標を超えていたらビットレートを下げてリトライ（最大10回）
  let retryBitrate = videoBitrateKbps;
  let scaleFactor = 1.0;
  for (let attempt = 0; attempt < 10 && outputBytes > targetBytes; attempt++) {
    retryBitrate = Math.floor(retryBitrate * 0.80);
    if (retryBitrate < 50) break;

    // 3回リトライしてもダメな場合は段階的にリサイズ (0.75x) を適用
    if (attempt >= 3) {
      scaleFactor *= 0.75;
    }

    const scaleFilter = scaleFactor < 1.0 ? ['-vf', `scale=iw*${scaleFactor.toFixed(2)}:ih*${scaleFactor.toFixed(2)}`] : [];

    const retrySuffix = generateUniqueFileSuffix();
    const retryOutputUri = `${cacheDir}${stem}_compressed_${retrySuffix}.${outputFormat}`;
    const retryOutputPath = retryOutputUri.replace('file://', '');
    const { uri: retryPasslogUri, path: retryPasslogPath } = getPasslogConfig(stem, retrySuffix);

    const retry1Cmd = [
      '-y', '-i', `"${inputPath}"`,
      '-c:v', vcodec,
      ...preset,
      ...scaleFilter,
      '-b:v', `${retryBitrate}k`,
      '-pass', '1', '-passlogfile', `"${retryPasslogPath}"`,
      '-an', '-f', isWebm ? 'webm' : 'null', isWebm ? '/dev/null' : '/dev/null',
    ].join(' ');
    const retry2Cmd = [
      '-y', '-i', `"${inputPath}"`,
      '-c:v', vcodec,
      ...preset,
      ...scaleFilter,
      '-b:v', `${retryBitrate}k`,
      '-pass', '2', '-passlogfile', `"${retryPasslogPath}"`,
      '-c:a', acodec, '-b:a', '64k',
      `"${retryOutputPath}"`,
    ].join(' ');

    const r1 = await FFmpegKit.execute(retry1Cmd);
    if (!ReturnCode.isSuccess(await r1.getReturnCode())) {
      // passlog を確実に削除してから次のリトライへ
      await FileSystem.deleteAsync(`${retryPasslogUri}-0.log`, { idempotent: true });
      await FileSystem.deleteAsync(`${retryPasslogUri}-0.log.mbtree`, { idempotent: true });
      continue;
    }
    const r2 = await FFmpegKit.execute(retry2Cmd);
    // リトライの passlog 一時ファイルを削除（成功・失敗いずれも）(#234)
    await FileSystem.deleteAsync(`${retryPasslogUri}-0.log`, { idempotent: true });
    await FileSystem.deleteAsync(`${retryPasslogUri}-0.log.mbtree`, { idempotent: true });
    if (!ReturnCode.isSuccess(await r2.getReturnCode())) {
      await FileSystem.deleteAsync(retryOutputUri, { idempotent: true });
      continue;
    }

    const retryInfo = await FileSystem.getInfoAsync(retryOutputUri, { size: true });
    const retryBytes = (retryInfo as FileSystem.FileInfo & { size: number }).size ?? 0;
    if (retryBytes > 0) {
      outputBytes = retryBytes;
      outInfo = retryInfo;
      currentOutputUri = retryOutputUri;
    } else {
      // 0バイトの無効な出力ファイルを削除してキャッシュに残らないようにする
      await FileSystem.deleteAsync(retryOutputUri, { idempotent: true });
    }
  }

  // リトライ成功により初回出力ファイルが不要になった場合は削除する (#206)
  if (currentOutputUri !== outputUri) {
    await FileSystem.deleteAsync(outputUri, { idempotent: true });
  }

  // リトライ後も目標サイズを超えている場合はエラーを投げてサイレント超過を防ぐ (#286)
  if (outputBytes > targetBytes) {
    await FileSystem.deleteAsync(currentOutputUri, { idempotent: true });
    const targetMB = Math.round(targetBytes / (1024 * 1024));
    throw new Error(`リトライを繰り返しましたが、目標サイズ（${targetMB}MB）以下に圧縮できませんでした。`);
  }

  return {
    outputUri: currentOutputUri,
    outputBytes,
    compressionRatio: originalBytes > 0 ? outputBytes / originalBytes : 1,
  };
}

/**
 * Discord の10MB制限に合わせてファイルを圧縮する。
 * 画像・動画両対応。すでに10MB以下の場合は元のURIをそのまま返す。
 *
 * @param inputUri      入力ファイルのfile:// URI
 * @param videoFormat   動画の場合の出力フォーマット
 */
export async function compressForDiscord(
  inputUri: string,
  videoFormat: string = 'mp4',
): Promise<CompressResult> {
  if (isVideoFile(inputUri)) {
    return compressVideoToTarget(inputUri, DISCORD_MAX_BYTES, videoFormat);
  } else {
    // Discord 送信用: JPEG に変換して圧縮（互換性優先）
    return compressImageToTarget(inputUri, DISCORD_MAX_BYTES, true);
  }
}

/**
 * 任意の目標サイズにファイルを圧縮する汎用関数。
 *
 * @param inputUri      入力ファイルのfile:// URI
 * @param targetBytes   目標ファイルサイズ（バイト）
 * @param videoFormat   動画の場合の出力フォーマット
 */
export async function compressToTargetSize(
  inputUri: string,
  targetBytes: number,
  videoFormat: string = 'mp4',
): Promise<CompressResult> {
  if (isVideoFile(inputUri)) {
    return compressVideoToTarget(inputUri, targetBytes, videoFormat);
  } else {
    return compressImageToTarget(inputUri, targetBytes);
  }
}

