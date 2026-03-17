import { convertImage } from '../data/ffmpeg/FfmpegConverter';

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  deleteAsync: jest.fn(),
  cacheDirectory: 'file:///tmp/',
}));

jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: { execute: jest.fn() },
  ReturnCode: { isSuccess: jest.fn(() => true) },
}));

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  generateUniqueFileSuffix: jest.fn(() => 'u1'),
  extractErrorFromLogs: jest.fn(async () => 'err'),
  getCacheDir: jest.fn(() => 'file:///tmp/'),
  getFileSizeBytes: jest.fn((info: { size?: number }) => info.size ?? 0),
}));

const FileSystem = jest.requireMock('expo-file-system/legacy');

describe('convertImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('入力ファイルが存在しない場合はエラー', async () => {
    FileSystem.getInfoAsync.mockResolvedValueOnce({ exists: false, size: 0 });

    await expect(convertImage('file:///in.png', { outputFormat: 'jpeg' }))
      .rejects.toThrow('入力ファイルが存在しません');
  });

  it('入力ファイルが0バイトの場合はエラー', async () => {
    FileSystem.getInfoAsync.mockResolvedValueOnce({ exists: true, size: 0 });

    await expect(convertImage('file:///in.png', { outputFormat: 'jpeg' }))
      .rejects.toThrow('入力ファイルが空（0バイト）です');
  });
});
