import {
  generateUniqueFileSuffix,
  extractErrorFromLogs,
  extractDurationFromLogs,
  getCacheDir,
  cleanupCachedTempFiles,
} from '../data/ffmpeg/ffmpegUtils';
import { Paths } from 'expo-file-system';

// Mock ffmpeg-kit-react-native
jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegSession: jest.fn(),
  FFmpegKit: { execute: jest.fn() },
  ReturnCode: { isSuccess: jest.fn() },
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  Paths: {
    get cache() {
      return { uri: 'file:///cache/' };
    },
  },
}));

// Mock expo-file-system/legacy
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

describe('generateUniqueFileSuffix', () => {
  it('returns a non-empty string', () => {
    const suffix = generateUniqueFileSuffix();
    expect(typeof suffix).toBe('string');
    expect(suffix.length).toBeGreaterThan(0);
  });

  it('matches the expected format {timestamp}_{random6chars}', () => {
    const suffix = generateUniqueFileSuffix();
    expect(suffix).toMatch(/^\d+_[a-z0-9]{1,8}$/);
  });

  it('generates unique values on consecutive calls', () => {
    const suffixes = Array.from({ length: 10 }, generateUniqueFileSuffix);
    const unique = new Set(suffixes);
    expect(unique.size).toBe(10);
  });
});

describe('extractErrorFromLogs', () => {
  it('returns log string from session', async () => {
    const mockSession = {
      getAllLogsAsString: jest.fn().mockResolvedValue('some error log'),
    } as any;

    const result = await extractErrorFromLogs(mockSession);
    expect(result).toBe('some error log');
    expect(mockSession.getAllLogsAsString).toHaveBeenCalledTimes(1);
  });

  it('returns empty string when logs are empty', async () => {
    const mockSession = {
      getAllLogsAsString: jest.fn().mockResolvedValue(''),
    } as any;

    const result = await extractErrorFromLogs(mockSession);
    expect(result).toBe('');
  });
});

describe('extractDurationFromLogs', () => {
  it('returns null when no duration found', () => {
    expect(extractDurationFromLogs('')).toBeNull();
    expect(extractDurationFromLogs('some log without duration')).toBeNull();
  });

  it('parses hours:minutes:seconds correctly', () => {
    const logs = '  Duration: 01:30:45.50, start: 0.000000, bitrate: 1234 kb/s';
    const result = extractDurationFromLogs(logs);
    // 1h*3600 + 30m*60 + 45.5s = 3600 + 1800 + 45.5 = 5445.5
    expect(result).toBeCloseTo(5445.5);
  });

  it('parses zero hours correctly', () => {
    const logs = 'Duration: 00:02:30.00';
    const result = extractDurationFromLogs(logs);
    // 0 + 2*60 + 30 = 150
    expect(result).toBe(150);
  });

  it('parses sub-second duration', () => {
    const logs = 'Duration: 00:00:05.25';
    const result = extractDurationFromLogs(logs);
    expect(result).toBeCloseTo(5.25);
  });

  it('parses duration at the beginning of string', () => {
    const logs = 'Duration: 00:00:10.00';
    expect(extractDurationFromLogs(logs)).toBe(10);
  });
});

describe('getCacheDir', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('末尾スラッシュ付きのURIを返す', () => {
    const dir = getCacheDir();
    expect(dir.endsWith('/')).toBe(true);
  });

  it('Paths.cache.uri が末尾スラッシュなしでも末尾スラッシュを付与する', () => {
    jest.spyOn(Paths, 'cache', 'get').mockReturnValue({ uri: 'file:///cache' } as any);
    expect(getCacheDir()).toBe('file:///cache/');
  });

  it('Paths.cache.uri が既に末尾スラッシュ付きなら重複しない', () => {
    jest.spyOn(Paths, 'cache', 'get').mockReturnValue({ uri: 'file:///cache/' } as any);
    expect(getCacheDir()).toBe('file:///cache/');
  });
});

describe('cleanupCachedTempFiles', () => {
  let getInfoAsync: jest.Mock;
  let readDirectoryAsync: jest.Mock;
  let deleteAsync: jest.Mock;

  beforeEach(() => {
    const FileSystem = require('expo-file-system/legacy');
    getInfoAsync = FileSystem.getInfoAsync as jest.Mock;
    readDirectoryAsync = FileSystem.readDirectoryAsync as jest.Mock;
    deleteAsync = FileSystem.deleteAsync as jest.Mock;
    jest.clearAllMocks();
  });

  it('キャッシュディレクトリが存在しない場合は何もしない', async () => {
    getInfoAsync.mockResolvedValue({ exists: false });
    await cleanupCachedTempFiles();
    expect(readDirectoryAsync).not.toHaveBeenCalled();
    expect(deleteAsync).not.toHaveBeenCalled();
  });

  it('対象パターンに一致するファイルを削除する', async () => {
    getInfoAsync.mockResolvedValue({ exists: true });
    readDirectoryAsync.mockResolvedValue([
      'video_compressed_123.mp4',
      'image_gabigabi_456.jpg',
      'output_converted_789.png',
      'video_passlog.log',
    ]);
    deleteAsync.mockResolvedValue(undefined);
    await cleanupCachedTempFiles();
    expect(deleteAsync).toHaveBeenCalledTimes(4);
  });

  it('対象外のファイルは削除しない', async () => {
    getInfoAsync.mockResolvedValue({ exists: true });
    readDirectoryAsync.mockResolvedValue([
      'photo.jpg',
      'document.pdf',
      'video_compressed_123.mp4',
    ]);
    deleteAsync.mockResolvedValue(undefined);
    await cleanupCachedTempFiles();
    expect(deleteAsync).toHaveBeenCalledTimes(1);
    expect(deleteAsync).toHaveBeenCalledWith(
      expect.stringContaining('video_compressed_123.mp4'),
      { idempotent: true },
    );
  });

  it('deleteAsyncが失敗してもエラーを投げない', async () => {
    getInfoAsync.mockResolvedValue({ exists: true });
    readDirectoryAsync.mockResolvedValue(['video_gabigabi_123.mp4']);
    deleteAsync.mockRejectedValue(new Error('delete failed'));
    await expect(cleanupCachedTempFiles()).resolves.toBeUndefined();
  });

  it('空のキャッシュディレクトリでも正常終了する', async () => {
    getInfoAsync.mockResolvedValue({ exists: true });
    readDirectoryAsync.mockResolvedValue([]);
    await cleanupCachedTempFiles();
    expect(deleteAsync).not.toHaveBeenCalled();
  });
});
