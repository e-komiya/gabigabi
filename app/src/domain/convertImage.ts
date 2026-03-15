import { convertImage as ffmpegConvertImage, ImageFormat, ConvertOptions, FfmpegConvertResult } from '../data/ffmpeg/FfmpegConverter';

export type { ImageFormat };

export interface ConvertImageResult {
  outputUri: string;
  outputBytes: number;
  engine: 'ffmpeg';
}

/**
 * 画像フォーマット変換のUseCase。
 * FFmpegを使ってJPEG/PNG/WebPへの変換を行う。
 *
 * @param inputUri   入力画像のファイルURI
 * @param options    変換オプション（フォーマット・品質）
 */
export async function convertImage(
  inputUri: string,
  options: ConvertOptions,
): Promise<ConvertImageResult> {
  const result: FfmpegConvertResult = await ffmpegConvertImage(inputUri, options);
  return {
    outputUri: result.outputUri,
    outputBytes: result.outputBytes,
    engine: 'ffmpeg',
  };
}

/**
 * ファイルサイズを人間が読みやすい文字列に変換する。
 */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
