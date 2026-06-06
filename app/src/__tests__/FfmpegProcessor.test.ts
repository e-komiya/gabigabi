import {
  processWithFfmpeg,
  processVideoWithFfmpeg,
} from '../data/ffmpeg/FfmpegProcessor';

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

// Per-URI file info store for the File mock
const mockFileInfoMap = new Map<string, { exists: boolean; size: number }>();

jest.mock('expo-file-system', () => {
  class MockFile {
    _uri: string;
    constructor(uri: string) {
      this._uri = uri;
    }
    get exists() {
      return mockFileInfoMap.get(this._uri)?.exists ?? true;
    }
    get size() {
      return mockFileInfoMap.get(this._uri)?.size ?? 0;
    }
    delete() {}
    move(_dest: unknown) {}
  }
  return { File: MockFile };
});

const mockGetFileSizeBytes = jest.fn().mockReturnValue(0);

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  generateUniqueFileSuffix: jest.fn().mockReturnValue('12345_abc'),
  extractErrorFromLogs: jest.fn().mockResolvedValue(''),
  getCacheDir: jest.fn().mockReturnValue('file:///cache/'),
  getFileSizeBytes: (...args: unknown[]) => mockGetFileSizeBytes(...args),
}));

function setupSuccess() {
  const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
  const ffmpegUtils = jest.requireMock('../data/ffmpeg/ffmpegUtils');
  ReturnCode.isSuccess.mockReturnValue(true);
  mockGetReturnCode.mockResolvedValue({});
  mockExecute.mockResolvedValue({ getReturnCode: mockGetReturnCode });
  ffmpegUtils.generateUniqueFileSuffix.mockReturnValue('12345_abc');
  ffmpegUtils.extractErrorFromLogs.mockResolvedValue('');
  ffmpegUtils.getCacheDir.mockReturnValue('file:///cache/');
}

function lastCmd() {
  return mockExecute.mock.calls[mockExecute.mock.calls.length - 1][0] as string;
}

describe('processWithFfmpeg', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFileInfoMap.clear();
    mockGetFileSizeBytes.mockReturnValue(1000); // default: files exist with size
    const ffmpegUtils = jest.requireMock('../data/ffmpeg/ffmpegUtils');
    ffmpegUtils.generateUniqueFileSuffix.mockReturnValue('12345_abc');
    ffmpegUtils.extractErrorFromLogs.mockResolvedValue('');
    ffmpegUtils.getCacheDir.mockReturnValue('file:///cache/');
    setupSuccess();
  });

  it('gabigabiLevelマッピングを使う（level=3 -> q:v 24）', async () => {
    mockGetFileSizeBytes.mockReturnValue(1000);

    await processWithFfmpeg('file:///in.jpg', 100, 3);
    expect(lastCmd()).toContain('-q:v 24');
  });

  it('shrinkExpandEnabledで縮小→再拡大フィルタを追加する', async () => {
    mockGetFileSizeBytes.mockReturnValue(1000);

    await processWithFfmpeg('file:///in.jpg', 100, 2, {
      shrinkExpandEnabled: true,
      shrinkExpandRate: 40,
    });
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

    mockGetFileSizeBytes.mockReturnValue(700);

    await processWithFfmpeg('file:///in.jpg', 100, 2, {
      multiCompressEnabled: true,
      multiCompressCount: 3,
    });

    expect(mockExecute).toHaveBeenCalledTimes(3);
  });

  it.each([
    { input: 'file:///in.jpg', expectedExt: '.jpg' },
    { input: 'file:///in.png', expectedExt: '.jpg' },
    { input: 'file:///in.webp', expectedExt: '.webp' },
    { input: 'file:///in.bmp', expectedExt: '.bmp' },
    { input: 'file:///in.gif', expectedExt: '.gif' },
  ])(
    'gabigabi経路で出力拡張子が期待通り($input)',
    async ({ input, expectedExt }) => {
      mockGetFileSizeBytes.mockReturnValue(500);

      const result = await processWithFfmpeg(input, 80, 2);

      expect(result.outputUri).toBe(
        `file:///cache/in_gabigabi_12345_abc${expectedExt}`,
      );
      expect(lastCmd()).toContain(`in_gabigabi_12345_abc${expectedExt}`);
      expect(lastCmd()).toContain('-q:v 18');
    },
  );
});

describe('processVideoWithFfmpeg', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFileInfoMap.clear();
    mockGetFileSizeBytes.mockReturnValue(700);
    const ffmpegUtils = jest.requireMock('../data/ffmpeg/ffmpegUtils');
    ffmpegUtils.generateUniqueFileSuffix.mockReturnValue('12345_abc');
    ffmpegUtils.extractErrorFromLogs.mockResolvedValue('');
    ffmpegUtils.getCacheDir.mockReturnValue('file:///cache/');
    setupSuccess();
  });

  it('mp4でlibx264/aacとcrfを使う', async () => {
    mockGetFileSizeBytes.mockReturnValue(700);

    await processVideoWithFfmpeg('file:///in.mp4', 50, 2, 'mp4');
    const cmd = lastCmd();
    expect(cmd).toContain('libx264');
    expect(cmd).toContain('aac');
    expect(cmd).toContain('-crf 43');
  });

  it('webmでvp9とb:v 0を使う', async () => {
    mockGetFileSizeBytes.mockReturnValue(700);

    await processVideoWithFfmpeg('file:///in.webm', 100, 2, 'webm');
    const cmd = lastCmd();
    expect(cmd).toContain('libvpx-vp9');
    expect(cmd).toContain('-b:v 0');
    expect(cmd).toContain('-crf 55');
  });

  it('compressionRate指定時はmp4のCRFを線形マッピングする', async () => {
    mockGetFileSizeBytes.mockReturnValue(700);

    await processVideoWithFfmpeg('file:///in.mp4', 100, 0, 'mp4', 99);
    expect(lastCmd()).toContain('-crf 51');
  });

  it('compressionRate指定時はwebmのCRFを線形マッピングする', async () => {
    mockGetFileSizeBytes.mockReturnValue(700);

    await processVideoWithFfmpeg('file:///in.webm', 100, 0, 'webm', 0);
    expect(lastCmd()).toContain('-crf 33');
  });
});
