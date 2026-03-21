import { FFmpegKit, ReturnCode } from 'ffmpeg-kit-react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { buildFfmpegCommand, generateUniqueFileSuffix, extractErrorFromLogs, getCacheDir, getFileSizeBytes } from './ffmpegUtils';

export type ImageFormat = 'jpeg' | 'png' | 'webp' | 'bmp' | 'gif';

export interface ConvertOptions {
  outputFormat: ImageFormat;
  quality?: number; // compressionRate 0-99 for jpeg/webp (ignored for png)
  gifFps?: number; // GIF出力フレームレート（デフォルト10）
  gifScale?: number; // GIFスケール率（1-100, デフォルト100）
}

export interface FfmpegConvertResult {
  outputUri: string;
  outputBytes: number;
}

/**
 * FFmpegを使って画像フォーマットを変換する。
 * JPEG, PNG, WebP への出力に対応。
 *
 * @param inputUri     入力画像のファイルURI
 * @param options      変換オプション（出力フォーマット、品質）
 */
export async function convertImage(
  inputUri: string,
  options: ConvertOptions,
): Promise<FfmpegConvertResult> {
  // 入力ファイルの存在確認とサイズチェック
  const inputInfo = await FileSystem.getInfoAsync(inputUri, { size: true });
  if (!inputInfo.exists) {
    throw new Error('入力ファイルが存在しません');
  }
  const inputBytes = getFileSizeBytes(inputInfo);
  if (inputBytes === 0) {
    throw new Error('入力ファイルが空（0バイト）です');
  }

  // 前回の一時ファイルをクリーンアップ（#214: アプリ起動時に移動したため削除）
  const { outputFormat, quality = 0, gifFps = 10, gifScale = 100 } = options;

  const inputPath = inputUri.replace('file://', '');
  const fileName = inputPath.split('/').pop() ?? 'image';
  const stem = fileName.replace(/\.[^.]+$/, '');

  const extMap: Record<ImageFormat, string> = {
    jpeg: '.jpg',
    png: '.png',
    webp: '.webp',
    bmp: '.bmp',
    gif: '.gif',
  };
  const ext = extMap[outputFormat];
  const cacheDir = getCacheDir();
  const suffix = generateUniqueFileSuffix();
  const outputUri = `${cacheDir}${stem}_converted_${suffix}${ext}`;
  const outputPath = outputUri.replace('file://', '');

  // フォーマット別のFFmpegオプションを構築
  let qualityArgs: string;
  switch (outputFormat) {
    case 'jpeg': {
      // compressionRate(0-99)を非線形カーブでFFmpeg -q:v(1-31)に変換。
      // compressionRate=0 → q:v=1(最高品質), compressionRate=99 → q:v=31(最低品質)
      const qv = Math.round(1 + 30 * Math.pow(quality / 100, 2.5));
      qualityArgs = `-q:v ${qv}`;
      break;
    }
    case 'png':
      // PNG はロスレス。-compression_level 0-9 (デフォルト6)
      qualityArgs = '-compression_level 6';
      break;
    case 'webp':
      // compressionRate(0-99)を線形変換。WebPの-qualityは100=最高品質。
      qualityArgs = `-quality ${Math.max(1, Math.min(100, 100 - quality))}`;
      break;
    case 'bmp':
      // BMP はロスレス。品質パラメータ不要。
      qualityArgs = '';
      break;
    case 'gif':
      // GIF はパレット変換。品質パラメータ不要。
      qualityArgs = '';
      break;
    default:
      qualityArgs = '';
  }

  let session;
  let rc;

  if (outputFormat === 'gif') {
    const fps = Math.max(1, Math.min(30, Math.round(gifFps)));
    const scalePercent = Math.max(1, Math.min(100, Math.round(gifScale)));
    const scaleFilter = scalePercent === 100
      ? 'scale=iw:ih:flags=lanczos'
      : `scale=trunc(iw*${scalePercent}/100/2)*2:trunc(ih*${scalePercent}/100/2)*2:flags=lanczos`;
    const paletteFilter = `fps=${fps},${scaleFilter},palettegen`;
    const renderFilter = `fps=${fps},${scaleFilter} [x]; [x][1:v] paletteuse`;
    // GIF はパレット生成の2パス方式でアニメーションを保持する
    const palettePath = `${outputPath}.palette.png`;
    const pass1 = buildFfmpegCommand([
      '-y',
      '-i', `"${inputPath}"`,
      '-vf', `"${paletteFilter}"`,
      `"${palettePath}"`,
    ]);

    try {
      const pass1Session = await FFmpegKit.execute(pass1);
      const pass1Rc = await pass1Session.getReturnCode();

      if (!ReturnCode.isSuccess(pass1Rc)) {
        const logs = await extractErrorFromLogs(pass1Session);
        throw new Error(`GIF パレット生成に失敗しました: ${logs}`);
      }

      const pass2 = buildFfmpegCommand([
        '-y',
        '-i', `"${inputPath}"`,
        '-i', `"${palettePath}"`,
        '-lavfi', `"${renderFilter}"`,
        `"${outputPath}"`,
      ]);

      session = await FFmpegKit.execute(pass2);
      rc = await session.getReturnCode();
    } finally {
      // パレットファイルをクリーンアップ（結果に関わらず）
      await FileSystem.deleteAsync(`file://${palettePath}`, { idempotent: true });
    }
  } else {
    const cmd = buildFfmpegCommand([
      '-y',
      '-i', `"${inputPath}"`,
      qualityArgs,
      '-update', '1',
      '-frames:v', '1',
      `"${outputPath}"`,
    ]);

    session = await FFmpegKit.execute(cmd);
    rc = await session.getReturnCode();
  }

  if (!ReturnCode.isSuccess(rc)) {
    const logs = await extractErrorFromLogs(session);
    await FileSystem.deleteAsync(outputUri, { idempotent: true });
    throw new Error(`FFmpegフォーマット変換に失敗しました: ${logs}`);
  }

  const info = await FileSystem.getInfoAsync(outputUri, { size: true });
  if (!info.exists) {
    throw new Error('FFmpeg出力ファイルが見つかりません');
  }
  return {
    outputUri,
    outputBytes: getFileSizeBytes(info),
  };
}
