import { processWithFfmpeg, processVideoWithFfmpeg } from '../data/ffmpeg/FfmpegProcessor';

const mockGetReturnCode = jest.fn();
const mockExecute = jest.fn();

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
const mockMoveAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
  moveAsync: (...args: unknown[]) => mockMoveAsync(...args),
}));

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  generateUniqueFileSuffix: jest.fn().mockReturnValue('12345_abc'),
  extractErrorFromLogs: jest.fn().mockResolvedValue(''),
  getCacheDir: jest.fn().mockReturnValue('file:///cache/'),
  getFileSizeBytes: jest.fn().mockImplementation((info: { size?: number }) => info?.size ?? 0),
}));

function setupSuccess() {
  const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
  ReturnCode.isSuccess.mockReturnValue(true);
  mockGetReturnCode.mockResolvedValue({});
  mockExecute.mockResolvedValue({ getReturnCode: mockGetReturnCode });
}

function lastCmd() {
  return mockExecute.mock.calls[mockExecute.mock.calls.length - 1][0] as string;
}

describe('processWithFfmpeg', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setupSuccess();
  });

  it('gabigabiLevelマッピングを使う（level=3 -> q:v 24）', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 1000 })
      .mockResolvedValueOnce({ exists: true, size: 800 });

    await processWithFfmpeg('file:///in.jpg', 100, 3);
    expect(lastCmd()).toContain('-q:v 24');
  });

  it('shrinkExpandEnabledで縮小→再拡大フィルタを追加する', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 1000 })
      .mockResolvedValueOnce({ exists: true, size: 800 });

    await processWithFfmpeg('file:///in.jpg', 100, 2, { shrinkExpandEnabled: true, shrinkExpandRate: 40 });
    const cmd = lastCmd();
    expect(cmd).toContain('scale=trunc(iw*0.4/2)*2:trunc(ih*0.4/2)*2');
    expect(cmd).toContain('scale=trunc(iw/0.4/2)*2:trunc(ih/0.4/2)*2');
  });

  it('multiCompressEnabledで複数回再圧縮する', async () => {
    const ffmpegUtils = jest.requireMock('../data/ffmpeg/ffmpegUtils');
    ffmpegUtils.generateUniqueFileSuffix
      .mockReturnValueOnce('base')
      .mockReturnValueOnce('p2')
      .mockReturnValueOnce('p3');

    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 2000 })
      .mockResolvedValueOnce({ exists: true, size: 700 });

    await processWithFfmpeg('file:///in.jpg', 100, 2, { multiCompressEnabled: true, multiCompressCount: 3 });

    expect(mockExecute).toHaveBeenCalledTimes(3);
    expect(mockMoveAsync).toHaveBeenCalled();
  });
});

describe('processVideoWithFfmpeg', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    setupSuccess();
  });

  it('mp4でlibx264/aacとcrfを使う', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 1000 })
      .mockResolvedValueOnce({ exists: true, size: 700 });

    await processVideoWithFfmpeg('file:///in.mp4', 50, 2, 'mp4');
    const cmd = lastCmd();
    expect(cmd).toContain('libx264');
    expect(cmd).toContain('aac');
    expect(cmd).toContain('-crf 43');
  });

  it('webmでvp9とb:v 0を使う', async () => {
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 1000 })
      .mockResolvedValueOnce({ exists: true, size: 700 });

    await processVideoWithFfmpeg('file:///in.webm', 100, 2, 'webm');
    const cmd = lastCmd();
    expect(cmd).toContain('libvpx-vp9');
    expect(cmd).toContain('-b:v 0');
    expect(cmd).toContain('-crf 55');
  });
});
