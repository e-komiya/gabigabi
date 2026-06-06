import {
  convertImage as ffmpegConvertImage,
  ImageFormat,
  ConvertOptions,
  FfmpegConvertResult,
  InputImageFormat,
} from '../data/ffmpeg/FfmpegConverter';
export { formatBytes } from '../utils/formatBytes';

export type { ImageFormat, InputImageFormat };

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
  const result: FfmpegConvertResult = await ffmpegConvertImage(
    inputUri,
    options,
  );
  return {
    outputUri: result.outputUri,
    outputBytes: result.outputBytes,
    engine: 'ffmpeg',
  };
}
