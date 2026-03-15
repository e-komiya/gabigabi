import { processWithFfmpeg, ProcessWithFfmpegOptions } from '../data/ffmpeg/FfmpegProcessor';

export interface ResizeResult {
  outputUri: string;
  outputBytes: number;
  engine: 'ffmpeg';
}

/**
 * 画像リサイズのUseCase。
 * FFmpegを使って画像をガビガビ化する。
 *
 * @param inputUri      入力画像のファイルURI
 * @param scalePct      縮小率（1〜100 %）
 * @param gabigabiLevel ガビガビレベル（1〜5）
 * @param options       縮小→再拡大・多重圧縮オプション
 */
export async function resizeImage(
  inputUri: string,
  scalePct: number,
  gabigabiLevel: number = 2,
  options: ProcessWithFfmpegOptions = {},
): Promise<ResizeResult> {
  const result = await processWithFfmpeg(inputUri, scalePct, gabigabiLevel, options);
  return { outputUri: result.outputUri, outputBytes: result.outputBytes, engine: 'ffmpeg' };
}
