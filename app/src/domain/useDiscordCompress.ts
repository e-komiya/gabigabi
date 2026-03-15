import {
  compressForDiscord as ffmpegCompressForDiscord,
  compressToTargetSize as ffmpegCompressToTargetSize,
  CompressResult,
} from '../data/ffmpeg/FfmpegCompressor';

export type { CompressResult };

/**
 * Discord の10MB制限に合わせてファイルを圧縮するUseCase。
 * 画像: JPEG品質をバイナリサーチで調整。
 * 動画: ビットレート計算で圧縮。
 * すでに10MB以下の場合は元のURIをそのまま返す。
 *
 * @param inputUri      入力ファイルのfile:// URI
 * @param videoFormat   動画の場合の出力フォーマット
 */
export async function compressForDiscord(
  inputUri: string,
  videoFormat: string = 'mp4',
): Promise<CompressResult> {
  return ffmpegCompressForDiscord(inputUri, videoFormat);
}

/**
 * 任意の目標サイズにファイルを圧縮するUseCase（汎用）。
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
  return ffmpegCompressToTargetSize(inputUri, targetBytes, videoFormat);
}
