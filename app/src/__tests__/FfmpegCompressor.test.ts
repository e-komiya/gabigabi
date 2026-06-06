import {
  compressForDiscord,
  compressToTargetSize,
  resetH264CodecCache,
} from '../data/ffmpeg/FfmpegCompressor';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockExecute = jest.fn();
const mockGetReturnCode = jest.fn();
const mockGetAllLogsAsString = jest.fn().mockResolvedValue('');
const mockProbeExecute = jest.fn();

jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
  FFprobeKit: {
    getMediaInformation: (...args: unknown[]) => mockProbeExecute(...args),
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
  class MockDirectory {
    _uri: string;
    constructor(uri: string) {
      this._uri = uri;
    }
    get exists() {
      return mockFileInfoMap.get(this._uri)?.exists ?? true;
    }
    list() {
      return [];
    }
  }
  return {
    Paths: { cache: { uri: 'file:///cache/' } },
    File: MockFile,
    Directory: MockDirectory,
  };
});

const mockGetFileSizeBytes = jest.fn().mockReturnValue(0);

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  generateUniqueFileSuffix: jest.fn().mockReturnValue('12345_abc'),
  extractErrorFromLogs: jest.fn().mockResolvedValue(''),
  getCacheDir: jest.fn().mockReturnValue('file:///cache/'),
  getPasslogConfig: jest
    .fn()
    .mockImplementation((stem: string, suffix: string) => ({
      uri: `file:///cache/${stem}_${suffix}`,
      path: `/cache/${stem}_${suffix}`,
    })),
  getFileSizeBytes: (...args: unknown[]) => mockGetFileSizeBytes(...args),
  buildFfmpegCommand: jest
    .fn()
    .mockImplementation((parts: (string | number | null | undefined)[]) =>
      parts.filter(p => p != null).join(' '),
    ),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function capturedCmd(callIndex = -1): string {
  const calls = mockExecute.mock.calls;
  const idx = callIndex < 0 ? calls.length + callIndex : callIndex;
  return calls[idx][0] as string;
}

function setupSuccessSession() {
  const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
  const ffmpegUtils = jest.requireMock('../data/ffmpeg/ffmpegUtils');
  ffmpegUtils.generateUniqueFileSuffix.mockReturnValue('12345_abc');
  ffmpegUtils.extractErrorFromLogs.mockResolvedValue('');
  ffmpegUtils.getCacheDir.mockReturnValue('file:///cache/');
  ffmpegUtils.getPasslogConfig.mockImplementation(
    (stem: string, suffix: string) => ({
      uri: `file:///cache/${stem}_${suffix}`,
      path: `/cache/${stem}_${suffix}`,
    }),
  );
  ffmpegUtils.buildFfmpegCommand.mockImplementation(
    (parts: (string | number | null | undefined)[]) =>
      parts.filter(p => p != null).join(' '),
  );
  ReturnCode.isSuccess.mockReturnValue(true);
  mockGetReturnCode.mockResolvedValue({});
  mockExecute.mockResolvedValue({
    getReturnCode: mockGetReturnCode,
    getAllLogsAsString: mockGetAllLogsAsString,
    getOutput: jest.fn().mockResolvedValue(''),
  });
}

/**
 * Image compressor: set up File mock and getFileSizeBytes mock.
 * - inputUri: exists=true, getFileSizeBytes returns inputSize
 * - outputUri: exists=true, getFileSizeBytes returns outputSize on each call
 */
function setupImageFileInfo({
  inputSize = 20 * 1024 * 1024,
  outputSize = 5 * 1024 * 1024, // small enough to be ≤ targetBytes during binary search
}: { inputSize?: number; outputSize?: number } = {}) {
  mockFileInfoMap.clear();
  // getFileSizeBytes: first call = inputSize (inputUri), subsequent = outputSize (outputUri)
  mockGetFileSizeBytes
    .mockReturnValueOnce(inputSize)
    .mockReturnValue(outputSize);
}

/**
 * Video compressor: set up File mock and getFileSizeBytes mock.
 */
function setupVideoFileInfo({
  inputSize = 20 * 1024 * 1024,
  outputSize = 5 * 1024 * 1024,
  durationSec = 30,
}: { inputSize?: number; outputSize?: number; durationSec?: number } = {}) {
  mockFileInfoMap.clear();
  mockProbeExecute.mockResolvedValue({
    getMediaInformation: jest.fn().mockResolvedValue({
      getDuration: jest.fn().mockReturnValue(String(durationSec)),
    }),
  });
  // getFileSizeBytes: input, CRF output (target超過), 2パス後 output
  mockGetFileSizeBytes
    .mockReturnValueOnce(inputSize)
    .mockReturnValueOnce(outputSize * 3) // CRF output: 3x outputSize to ensure > DISCORD_MAX_BYTES
    .mockReturnValue(outputSize);
}

// ---------------------------------------------------------------------------
// compressForDiscord — image
// ---------------------------------------------------------------------------

describe('compressForDiscord (image)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFileInfoMap.clear();
    mockGetFileSizeBytes.mockReturnValue(0);
    setupSuccessSession();
  });

  it('returns original URI when already below 10 MB', async () => {
    const smallSize = 1 * 1024 * 1024;
    mockGetFileSizeBytes.mockReturnValue(smallSize);
    const result = await compressForDiscord('file:///photos/img.jpg');
    expect(result.outputUri).toBe('file:///photos/img.jpg');
    expect(result.compressionRatio).toBe(1);
  });

  it('uses -q:v in FFmpeg command for image compression', async () => {
    setupImageFileInfo();
    await compressForDiscord('file:///photos/img.jpg');
    expect(capturedCmd()).toContain('-q:v');
  });

  it('uses -update 1 and -frames:v 1 in command', async () => {
    setupImageFileInfo();
    await compressForDiscord('file:///photos/img.jpg');
    const cmd = capturedCmd();
    expect(cmd).toContain('-update 1');
    expect(cmd).toContain('-frames:v 1');
  });

  it('throws when input does not exist', async () => {
    mockFileInfoMap.set('file:///photos/img.jpg', { exists: false, size: 0 });
    await expect(compressForDiscord('file:///photos/img.jpg')).rejects.toThrow(
      '入力ファイルが存在しません',
    );
  });

  it('throws when input file is empty', async () => {
    // exists=true (default from mock), getFileSizeBytes returns 0
    mockGetFileSizeBytes.mockReturnValue(0);
    await expect(compressForDiscord('file:///photos/img.jpg')).rejects.toThrow(
      '入力ファイルが空（0バイト）です',
    );
  });

  it('outputs jpeg for forceJpeg (png input → .jpg output)', async () => {
    setupImageFileInfo();
    const result = await compressForDiscord('file:///photos/img.png');
    expect(result.outputUri).toMatch(/\.jpg$/);
  });

  it('includes _compressed_ in output filename', async () => {
    setupImageFileInfo();
    const result = await compressForDiscord('file:///photos/img.jpg');
    expect(result.outputUri).toContain('_compressed_');
  });
});

// ---------------------------------------------------------------------------
// compressForDiscord — video
// ---------------------------------------------------------------------------

describe('compressForDiscord (video)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFileInfoMap.clear();
    mockGetFileSizeBytes.mockReturnValue(0);
    resetH264CodecCache();
    setupSuccessSession();
  });

  it('returns original URI when video already below 10 MB', async () => {
    const smallSize = 5 * 1024 * 1024;
    mockGetFileSizeBytes.mockReturnValue(smallSize);
    const result = await compressForDiscord('file:///videos/clip.mp4');
    expect(result.outputUri).toBe('file:///videos/clip.mp4');
    expect(result.compressionRatio).toBe(1);
  });

  it('uses two-pass options in video compress command', async () => {
    setupVideoFileInfo();
    await compressForDiscord('file:///videos/clip.mp4');
    const pass1Cmd = capturedCmd(2);
    const pass2Cmd = capturedCmd(3);
    expect(pass1Cmd).toContain('-pass 1');
    expect(pass2Cmd).toContain('-pass 2');
    expect(pass2Cmd).toContain('-b:v');
  });

  it('uses AAC audio codec in pass2 command', async () => {
    setupVideoFileInfo();
    await compressForDiscord('file:///videos/clip.mp4');
    const cmd = capturedCmd(3);
    expect(cmd).toContain('aac');
    expect(cmd).toContain('-b:a 64k');
  });

  it('outputs .mp4 for video compression', async () => {
    setupVideoFileInfo();
    const result = await compressForDiscord('file:///videos/clip.mp4');
    expect(result.outputUri).toMatch(/\.mp4$/);
  });

  it('throws when video is too long to compress under target', async () => {
    // very long duration → very low bitrate → throws
    setupVideoFileInfo({ inputSize: 20 * 1024 * 1024, durationSec: 100000 });
    await expect(compressForDiscord('file:///videos/clip.mp4')).rejects.toThrow(
      '圧縮できません',
    );
  });

  it('includes _compressed_ in output filename', async () => {
    setupVideoFileInfo();
    const result = await compressForDiscord('file:///videos/clip.mp4');
    expect(result.outputUri).toContain('_compressed_');
  });

  it('applies scale-down retry filter after repeated oversized outputs', async () => {
    const target = 10 * 1024 * 1024;
    mockProbeExecute.mockResolvedValue({
      getMediaInformation: jest.fn().mockResolvedValue({
        getDuration: jest.fn().mockReturnValue('30'),
      }),
    });

    mockGetFileSizeBytes
      .mockReturnValueOnce(50 * 1024 * 1024) // input
      .mockReturnValueOnce(20 * 1024 * 1024) // CRF output
      .mockReturnValueOnce(18 * 1024 * 1024) // 2pass output
      .mockReturnValueOnce(17 * 1024 * 1024)
      .mockReturnValueOnce(16 * 1024 * 1024)
      .mockReturnValueOnce(15 * 1024 * 1024)
      .mockReturnValueOnce(8 * 1024 * 1024);

    const result = await compressToTargetSize(
      'file:///videos/clip.mp4',
      target,
    );

    const executed = mockExecute.mock.calls.map(c => c[0] as string).join('\n');
    expect(executed).toContain('scale=iw*0.75:ih*0.75');
    expect(result.outputBytes).toBeLessThanOrEqual(target);
  });

  it('出力サイズ比率に応じてリトライビットレートを再計算する', async () => {
    const target = 10 * 1024 * 1024;
    mockProbeExecute.mockResolvedValue({
      getMediaInformation: jest.fn().mockResolvedValue({
        getDuration: jest.fn().mockReturnValue('30'),
      }),
    });

    mockGetFileSizeBytes
      .mockReturnValueOnce(50 * 1024 * 1024) // input
      .mockReturnValueOnce(20 * 1024 * 1024) // CRF出力（目標超過→2パスへ）
      .mockReturnValueOnce(18 * 1024 * 1024) // 2パス後出力（目標超過→リトライ）
      .mockReturnValueOnce(9 * 1024 * 1024); // リトライ後出力（目標以下）

    await compressToTargetSize('file:///videos/clip.mp4', target);

    const executed = mockExecute.mock.calls.map(c => c[0] as string).join('\n');
    expect(executed).toContain('-b:v 1253k');
  });

  it('throws when input does not exist', async () => {
    mockFileInfoMap.set('file:///videos/clip.mp4', { exists: false, size: 0 });
    await expect(compressForDiscord('file:///videos/clip.mp4')).rejects.toThrow(
      '入力ファイルが存在しません',
    );
  });
});

// ---------------------------------------------------------------------------
// compressToTargetSize
// ---------------------------------------------------------------------------

describe('compressToTargetSize', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockFileInfoMap.clear();
    mockGetFileSizeBytes.mockReturnValue(0);
    resetH264CodecCache();
    setupSuccessSession();
  });

  it('routes image files through image compression (uses -q:v)', async () => {
    setupImageFileInfo();
    await compressToTargetSize('file:///photos/img.jpg', 5 * 1024 * 1024);
    expect(capturedCmd()).toContain('-q:v');
  });

  it('routes video files through video compression (uses -b:v)', async () => {
    setupVideoFileInfo({ inputSize: 20 * 1024 * 1024 });
    await compressToTargetSize('file:///videos/clip.mp4', 5 * 1024 * 1024);
    expect(capturedCmd()).toContain('-b:v');
  });

  it('returns original when image is already below target', async () => {
    const size = 1 * 1024 * 1024;
    const target = 5 * 1024 * 1024;
    mockGetFileSizeBytes.mockReturnValue(size);
    const result = await compressToTargetSize('file:///photos/img.jpg', target);
    expect(result.compressionRatio).toBe(1);
  });

  it('throws when input file does not exist', async () => {
    mockFileInfoMap.set('file:///photos/img.jpg', { exists: false, size: 0 });
    await expect(
      compressToTargetSize('file:///photos/img.jpg', 5 * 1024 * 1024),
    ).rejects.toThrow('入力ファイルが存在しません');
  });

  it('falls back to scale-down when quality-only compression is insufficient', async () => {
    const hugeOutput = 15 * 1024 * 1024;
    const target = 5 * 1024 * 1024;
    mockGetFileSizeBytes
      .mockReturnValueOnce(20 * 1024 * 1024) // input
      .mockReturnValue(hugeOutput); // all output iterations

    await expect(
      compressToTargetSize('file:///photos/img.jpg', target),
    ).rejects.toThrow('圧縮できませんでした');
    const lastCmd = capturedCmd();
    expect(lastCmd).toContain('scale=iw*0.5:ih*0.5');
    expect(lastCmd).toContain('-q:v 31');
  });
});
