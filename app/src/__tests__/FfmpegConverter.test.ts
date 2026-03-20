import { convertImage } from '../data/ffmpeg/FfmpegConverter';

const mockExecute = jest.fn();
const mockGetReturnCode = jest.fn();
const mockGetAllLogsAsString = jest.fn().mockResolvedValue('');
const mockGetOutput = jest.fn().mockResolvedValue('');

jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
  ReturnCode: {
    isSuccess: jest.fn().mockReturnValue(true),
  },
}));

const mockGetInfoAsync = jest.fn();
const mockDeleteAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  generateUniqueFileSuffix: jest.fn().mockReturnValue('12345_abc'),
  extractErrorFromLogs: jest.fn().mockResolvedValue('mock logs'),
  getCacheDir: jest.fn().mockReturnValue('file:///cache/'),
  getFileSizeBytes: jest.fn().mockImplementation((info: { size?: number }) => info?.size ?? 0),
}));

function setupSuccessSession() {
  const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
  ReturnCode.isSuccess.mockReturnValue(true);
  mockGetReturnCode.mockResolvedValue({});
  mockExecute.mockResolvedValue({
    getReturnCode: mockGetReturnCode,
    getAllLogsAsString: mockGetAllLogsAsString,
    getOutput: mockGetOutput,
  });
}

describe('convertImage', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    const ffmpegUtils = jest.requireMock('../data/ffmpeg/ffmpegUtils');
    ffmpegUtils.generateUniqueFileSuffix.mockReturnValue('12345_abc');
    ffmpegUtils.extractErrorFromLogs.mockResolvedValue('mock logs');
    ffmpegUtils.getCacheDir.mockReturnValue('file:///cache/');
    ffmpegUtils.getFileSizeBytes.mockImplementation((info: { size?: number }) => info?.size ?? 0);
    setupSuccessSession();
  });

  it('JPEG変換時に -q:v を使う', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 1000 })
      .mockResolvedValueOnce({ exists: true, size: 500 });

    const result = await convertImage('file:///photos/in.png', { outputFormat: 'jpeg', quality: 99 });

    expect(mockExecute.mock.calls[0][0]).toContain('-q:v');
    expect(result.outputUri).toMatch(/\.jpg$/);
  });

  it('PNG変換時に -compression_level 6 を使う', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 1000 })
      .mockResolvedValueOnce({ exists: true, size: 900 });

    await convertImage('file:///photos/in.jpg', { outputFormat: 'png' });

    expect(mockExecute.mock.calls[0][0]).toContain('-compression_level 6');
  });

  it('GIF変換時に2パス実行しパレットを削除する', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 1000 })
      .mockResolvedValueOnce({ exists: true, size: 700 });

    const result = await convertImage('file:///photos/in.mp4', { outputFormat: 'gif' });

    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect(mockExecute.mock.calls[0][0]).toContain('palettegen');
    expect(mockExecute.mock.calls[1][0]).toContain('paletteuse');
    expect(mockDeleteAsync).toHaveBeenCalledWith('file:///cache/in_converted_12345_abc.gif.palette.png', { idempotent: true });
    expect(result.outputUri).toMatch(/\.gif$/);
  });

  it('入力ファイルが存在しない場合はエラー', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false });
    await expect(convertImage('file:///photos/in.jpg', { outputFormat: 'webp' })).rejects.toThrow('入力ファイルが存在しません');
  });

  it('入力ファイルが0バイトの場合はエラー', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 0 });
    await expect(convertImage('file:///photos/in.jpg', { outputFormat: 'webp' })).rejects.toThrow('入力ファイルが空（0バイト）です');
  });

  it('FFmpeg失敗時に出力を削除してエラー', async () => {
    const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
    ReturnCode.isSuccess.mockReturnValue(false);
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 1000 });

    await expect(convertImage('file:///photos/in.jpg', { outputFormat: 'webp' })).rejects.toThrow('FFmpegフォーマット変換に失敗しました');
    expect(mockDeleteAsync).toHaveBeenCalledWith('file:///cache/in_converted_12345_abc.webp', { idempotent: true });
  });
});
