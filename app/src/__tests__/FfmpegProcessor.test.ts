import { processWithFfmpeg, processVideoWithFfmpeg } from '../data/ffmpeg/FfmpegProcessor';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetReturnCode = jest.fn();
const mockGetAllLogsAsString = jest.fn().mockResolvedValue('');
const mockExecute = jest.fn();

jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: {
    execute: (...args: unknown[]) => mockExecute(...args),
  },
  ReturnCode: {
    isSuccess: jest.fn().mockReturnValue(true),
  },
}));

jest.mock('expo-file-system', () => ({
  Paths: {
    cache: { uri: 'file:///cache/' },
  },
}));

const mockGetInfoAsync = jest.fn();
const mockReadDirectoryAsync = jest.fn().mockResolvedValue([]);
const mockDeleteAsync = jest.fn().mockResolvedValue(undefined);

jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: (...args: unknown[]) => mockGetInfoAsync(...args),
  readDirectoryAsync: (...args: unknown[]) => mockReadDirectoryAsync(...args),
  deleteAsync: (...args: unknown[]) => mockDeleteAsync(...args),
}));

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  generateUniqueFileSuffix: jest.fn().mockReturnValue('12345_abc'),
  extractErrorFromLogs: jest.fn().mockResolvedValue(''),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Capture the command string passed to FFmpegKit.execute */
function capturedCmd(): string {
  return mockExecute.mock.calls[mockExecute.mock.calls.length - 1][0] as string;
}

function setupSuccessSession() {
  mockGetReturnCode.mockResolvedValue({});
  mockExecute.mockResolvedValue({
    getReturnCode: mockGetReturnCode,
    getAllLogsAsString: mockGetAllLogsAsString,
  });
}

/**
 * Call order inside processWithFfmpeg / processVideoWithFfmpeg:
 *   1. getInfoAsync(inputUri)      — input check
 *   2. getInfoAsync(cacheDir)      — cleanupCachedTempFiles
 *   3. getInfoAsync(outputUri)     — output file check
 */
function setupFileInfo({
  inputSize = 50000,
  outputSize = 10000,
}: { inputSize?: number; outputSize?: number } = {}) {
  mockGetInfoAsync
    .mockResolvedValueOnce({ exists: true, size: inputSize }) // 1. input
    .mockResolvedValueOnce({ exists: true })                  // 2. cache dir
    .mockResolvedValueOnce({ exists: true, size: outputSize });// 3. output
}

// ---------------------------------------------------------------------------
// processWithFfmpeg
// ---------------------------------------------------------------------------

describe('processWithFfmpeg', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSuccessSession();
  });

  it('throws when scalePct <= 0', async () => {
    await expect(processWithFfmpeg('file:///input/img.jpg', 0, 2)).rejects.toThrow('scalePct');
  });

  it('throws when scalePct > 100', async () => {
    await expect(processWithFfmpeg('file:///input/img.jpg', 101, 2)).rejects.toThrow('scalePct');
  });

  it('throws when gabigabiLevel is out of range', async () => {
    await expect(processWithFfmpeg('file:///input/img.jpg', 50, 6)).rejects.toThrow('gabigabiLevel');
  });

  it('throws when input file does not exist', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false }); // 1. input → not found
    await expect(processWithFfmpeg('file:///input/img.jpg', 50, 2)).rejects.toThrow('入力ファイルが存在しません');
  });

  it('throws when input file is empty', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 0 }); // 1. input → 0 bytes
    await expect(processWithFfmpeg('file:///input/img.jpg', 50, 2)).rejects.toThrow('入力ファイルが空（0バイト）です');
  });

  it('includes -q:v 27 for gabigabiLevel=3', async () => {
    setupFileInfo();
    await processWithFfmpeg('file:///input/img.jpg', 100, 3);
    expect(capturedCmd()).toContain('-q:v 27');
  });

  it('includes -q:v 31 for gabigabiLevel=5', async () => {
    setupFileInfo();
    await processWithFfmpeg('file:///input/img.jpg', 100, 5);
    expect(capturedCmd()).toContain('-q:v 31');
  });

  it('includes -q:v 2 for gabigabiLevel=0', async () => {
    setupFileInfo();
    await processWithFfmpeg('file:///input/img.jpg', 100, 0);
    expect(capturedCmd()).toContain('-q:v 2');
  });

  it('includes scale vf for resizePercent=50', async () => {
    setupFileInfo();
    await processWithFfmpeg('file:///input/img.jpg', 50, 2);
    expect(capturedCmd()).toContain('-vf');
    expect(capturedCmd()).toContain('scale=iw*0.5:ih*0.5');
  });

  it('includes scale=iw*1:ih*1 for resizePercent=100', async () => {
    setupFileInfo();
    await processWithFfmpeg('file:///input/img.jpg', 100, 2);
    expect(capturedCmd()).toContain('scale=iw*1:ih*1');
  });

  it('includes -q:v 27 and scale=iw*0.5:ih*0.5 for gabigabiLevel=3 resizePercent=50', async () => {
    setupFileInfo();
    await processWithFfmpeg('file:///input/img.jpg', 50, 3);
    const cmd = capturedCmd();
    expect(cmd).toContain('-q:v 27');
    expect(cmd).toContain('scale=iw*0.5:ih*0.5');
  });

  it('outputs a JPEG path for PNG input (PNG→JPEG conversion)', async () => {
    setupFileInfo();
    const result = await processWithFfmpeg('file:///input/img.png', 100, 2);
    expect(result.outputUri).toMatch(/\.jpg$/);
  });

  it('returns outputUri and outputBytes on success', async () => {
    setupFileInfo({ outputSize: 9999 });
    const result = await processWithFfmpeg('file:///input/img.jpg', 100, 2);
    expect(result.outputUri).toMatch(/gabigabi/);
    expect(result.outputBytes).toBe(9999);
  });

  it('uses -update 1 and -frames:v 1 flags', async () => {
    setupFileInfo();
    await processWithFfmpeg('file:///input/img.jpg', 100, 2);
    const cmd = capturedCmd();
    expect(cmd).toContain('-update 1');
    expect(cmd).toContain('-frames:v 1');
  });

  // ── gabigabiLevel → q:v mapping ──────────────────────────────────────────
  describe('gabigabiLevel → -q:v mapping', () => {
    const cases: [number, number][] = [
      [0, 2],
      [1, 18],
      [2, 23],
      [3, 27],
      [4, 29],
      [5, 31],
    ];

    test.each(cases)('gabigabiLevel=%i → -q:v %i', async (level, expectedQv) => {
      setupFileInfo();
      await processWithFfmpeg('file:///input/img.jpg', 100, level);
      expect(capturedCmd()).toContain(`-q:v ${expectedQv}`);
    });
  });
});

// ---------------------------------------------------------------------------
// processVideoWithFfmpeg
// ---------------------------------------------------------------------------

describe('processVideoWithFfmpeg', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupSuccessSession();
  });

  it('throws when scalePct <= 0', async () => {
    await expect(processVideoWithFfmpeg('file:///input/vid.mp4', 0, 2, 'mp4')).rejects.toThrow('scalePct');
  });

  it('throws when gabigabiLevel is out of range', async () => {
    await expect(processVideoWithFfmpeg('file:///input/vid.mp4', 50, 6, 'mp4')).rejects.toThrow('gabigabiLevel');
  });

  it('throws when input file does not exist', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false }); // 1. input
    await expect(processVideoWithFfmpeg('file:///input/vid.mp4', 50, 2, 'mp4')).rejects.toThrow('入力ファイルが存在しません');
  });

  it('throws when input file is empty', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 0 }); // 1. input
    await expect(processVideoWithFfmpeg('file:///input/vid.mp4', 50, 2, 'mp4')).rejects.toThrow('入力ファイルが空（0バイト）です');
  });

  // ── MP4 ────────────────────────────────────────────────────────────────
  describe('outputFormat=mp4', () => {
    it('uses libx264 codec and -crf', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.mp4', 100, 2, 'mp4');
      const cmd = capturedCmd();
      expect(cmd).toContain('libx264');
      expect(cmd).toContain('-crf');
      expect(cmd).not.toContain('-q:v');
    });

    it('uses aac audio codec', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.mp4', 100, 2, 'mp4');
      expect(capturedCmd()).toContain('aac');
    });
  });

  // ── AVI ────────────────────────────────────────────────────────────────
  describe('outputFormat=avi', () => {
    it('uses libx264 and mp3 audio', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.avi', 100, 2, 'avi');
      const cmd = capturedCmd();
      expect(cmd).toContain('libx264');
      expect(cmd).toContain('mp3');
      expect(cmd).toContain('-crf');
    });
  });

  // ── WMV ────────────────────────────────────────────────────────────────
  describe('outputFormat=wmv', () => {
    it('uses wmv2 video codec and wmav2 audio', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.wmv', 100, 2, 'wmv');
      const cmd = capturedCmd();
      expect(cmd).toContain('wmv2');
      expect(cmd).toContain('wmav2');
      expect(cmd).toContain('-crf');
    });
  });

  // ── MOV ────────────────────────────────────────────────────────────────
  describe('outputFormat=mov', () => {
    it('uses libx264 and aac audio', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.mov', 100, 2, 'mov');
      const cmd = capturedCmd();
      expect(cmd).toContain('libx264');
      expect(cmd).toContain('aac');
    });
  });

  // ── MPG ────────────────────────────────────────────────────────────────
  describe('outputFormat=mpg', () => {
    it('uses mpeg2video codec', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.mpg', 100, 2, 'mpg');
      expect(capturedCmd()).toContain('mpeg2video');
    });

    it('uses -q:v (not -crf) for quality', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.mpg', 100, 2, 'mpg');
      const cmd = capturedCmd();
      expect(cmd).toContain('-q:v');
      expect(cmd).not.toContain('-crf');
    });

    it('uses mp2 audio codec', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.mpg', 100, 2, 'mpg');
      expect(capturedCmd()).toContain('mp2');
    });
  });

  // ── MKV ────────────────────────────────────────────────────────────────
  describe('outputFormat=mkv', () => {
    it('uses libx264 and aac audio with -crf', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.mkv', 100, 2, 'mkv');
      const cmd = capturedCmd();
      expect(cmd).toContain('libx264');
      expect(cmd).toContain('aac');
      expect(cmd).toContain('-crf');
    });
  });

  // ── WebM ───────────────────────────────────────────────────────────────
  describe('outputFormat=webm', () => {
    it('uses libvpx-vp9 codec', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.webm', 100, 2, 'webm');
      expect(capturedCmd()).toContain('libvpx-vp9');
    });

    it('uses -crf quality parameter', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.webm', 100, 2, 'webm');
      expect(capturedCmd()).toContain('-crf');
    });

    it('includes -b:v 0 for constrained quality mode', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.webm', 100, 2, 'webm');
      expect(capturedCmd()).toContain('-b:v 0');
    });

    it('uses libvorbis audio codec', async () => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.webm', 100, 2, 'webm');
      expect(capturedCmd()).toContain('libvorbis');
    });
  });

  // ── gabigabiLevel → CRF mapping ────────────────────────────────────────
  describe('gabigabiLevel → CRF mapping (mp4)', () => {
    const cases: [number, number][] = [
      [0, 23],
      [1, 35],
      [2, 40],
      [3, 45],
      [4, 48],
      [5, 51],
    ];

    test.each(cases)('gabigabiLevel=%i → -crf %i', async (level, expectedCrf) => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.mp4', 100, level, 'mp4');
      expect(capturedCmd()).toContain(`-crf ${expectedCrf}`);
    });
  });

  // ── gabigabiLevel → CRF mapping (webm/VP9) ──────────────────────────────
  describe('gabigabiLevel → CRF mapping (webm/VP9)', () => {
    const cases: [number, number][] = [
      [0, 33],
      [1, 45],
      [2, 50],
      [3, 55],
      [4, 60],
      [5, 63],
    ];

    test.each(cases)('gabigabiLevel=%i → -crf %i (VP9)', async (level, expectedCrf) => {
      setupFileInfo();
      await processVideoWithFfmpeg('file:///input/vid.webm', 100, level, 'webm');
      expect(capturedCmd()).toContain(`-crf ${expectedCrf}`);
    });
  });

  // ── scale vf ───────────────────────────────────────────────────────────
  it('includes scale vf for resize at 50%', async () => {
    setupFileInfo();
    await processVideoWithFfmpeg('file:///input/vid.mp4', 50, 2, 'mp4');
    expect(capturedCmd()).toContain('scale=');
    expect(capturedCmd()).toContain('0.5');
  });

  it('returns outputUri with correct extension', async () => {
    setupFileInfo();
    const result = await processVideoWithFfmpeg('file:///input/vid.mp4', 100, 2, 'webm');
    expect(result.outputUri).toMatch(/\.webm$/);
  });
});
