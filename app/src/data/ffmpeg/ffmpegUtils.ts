import { FFmpegSession } from 'ffmpeg-kit-react-native';
import { Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system';

/**
 * ユニークなファイル名サフィックスを生成する。
 * Date.now() のみだと同一ミリ秒内で衝突する可能性があるため、
 * ランダム文字列を組み合わせて一意性を保証する。
 *
 * @returns `{timestamp}_{random6chars}` 形式の文字列
 */
export function generateUniqueFileSuffix(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * FFmpegセッションのログからエラーメッセージを取得する。
 *
 * @param session FFmpegKit セッション
 * @returns ログ文字列
 */
export async function extractErrorFromLogs(session: FFmpegSession): Promise<string> {
  return session.getAllLogsAsString();
}

/**
 * FFmpegのログ文字列から動画の長さ（秒）を取得する。
 * ログに "Duration: HH:MM:SS.ss" 形式が含まれている場合に解析する。
 *
 * @param logs FFmpegログ文字列
 * @returns 動画の長さ（秒）、見つからない場合は null
 */
export function extractDurationFromLogs(logs: string): number | null {
  const match = logs.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const s = parseFloat(match[3]);
  return h * 3600 + m * 60 + s;
}

/**
 * キャッシュディレクトリのURIを返す（末尾スラッシュ付き）。
 */
export function getCacheDir(): string {
  const dir = Paths.cache.uri;
  return dir.endsWith('/') ? dir : dir + '/';
}

/**
 * FFmpegの2パスログファイルのパスを生成する。
 * @param stem ファイル名の幹部分
 * @param suffix ユニークなサフィックス
 * @returns { uri: string, path: string }
 */
export function getPasslogConfig(stem: string, suffix: string): { uri: string, path: string } {
  const cacheDir = getCacheDir();
  const uri = `${cacheDir}${stem}_passlog_${suffix}`;
  const path = uri.replace('file://', '');
  return { uri, path };
}

/**
 * キャッシュディレクトリ内の古い一時出力ファイルを削除する。
 * 対象: `_compressed_`, `_gabigabi_`, `_converted_`, `_passlog` を含むファイル名。
 * (#177) FfmpegCompressor/Converter/Processor の重複実装を統合。
 * (#183) passlogファイルもクリーンアップ対象に追加。
 */
export async function cleanupCachedTempFiles(): Promise<void> {
  try {
    const cacheDir = getCacheDir();
    const dirInfo = await FileSystem.getInfoAsync(cacheDir);
    if (!dirInfo.exists) return;
    const result = await FileSystem.readDirectoryAsync(cacheDir);
    const tempPattern = /_(compressed|gabigabi|converted)_|_passlog/;
    await Promise.all(
      result
        .filter(name => tempPattern.test(name))
        .map(name => FileSystem.deleteAsync(cacheDir + name, { idempotent: true })),
    );
  } catch {
    // クリーンアップ失敗は無視して処理を続行する
  }
}
