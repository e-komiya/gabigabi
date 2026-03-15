import { compressForDiscord, compressToTargetSize } from '../data/ffmpeg/FfmpegCompressor';

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

function capturedCmd(callIndex = -1): string {
  const calls = mockExecute.mock.calls;
  const idx = callIndex < 0 ? calls.length + callIndex : callIndex;
  return calls[idx][0] as string;
}

function setupSuccessSession() {
  const { ReturnCode } = jest.requireMock('ffmpeg-kit-react-native');
  ReturnCode.isSuccess.mockReturnValue(true);
  mockGetReturnCode.mockResolvedValue({});
  mockExecute.mockResolvedValue({
    getReturnCode: mockGetReturnCode,
    getAllLogsAsString: mockGetAllLogsAsString,
  });
}

/**
 * Image compressor call order:
 *   1. getInfoAsync(inputUri)   — input check
 *   2. getInfoAsync(cacheDir)   — cleanupCachedTempFiles
 *   3+. getInfoAsync(outputUri) — binary search iterations
 */
function setupImageFileInfo({
  inputSize = 20 * 1024 * 1024,
  outputSize = 5 * 1024 * 1024, // small enough to be ≤ targetBytes during binary search
}: { inputSize?: number; outputSize?: number } = {}) {
  mockGetInfoAsync
    .mockResolvedValueOnce({ exists: true, size: inputSize }) // 1. input
    .mockResolvedValueOnce({ exists: true })                  // 2. cache dir
    .mockResolvedValue({ exists: true, size: outputSize });   // 3+. output (all iterations)
}

/**
 * Video compressor call order:
 *   1. getInfoAsync(inputUri)   — input check
 *   2. getInfoAsync(cacheDir)   — cleanupCachedTempFiles
 *   3. getInfoAsync(outputUri)  — after compress
 */
function setupVideoFileInfo({
  inputSize = 20 * 1024 * 1024,
  outputSize = 5 * 1024 * 1024,
  durationSec = 30,
}: { inputSize?: number; outputSize?: number; durationSec?: number } = {}) {
  mockProbeExecute.mockResolvedValue({
    getMediaInformation: jest.fn().mockResolvedValue({
      getDuration: jest.fn().mockReturnValue(String(durationSec)),
    }),
  });
  mockGetInfoAsync
    .mockResolvedValueOnce({ exists: true, size: inputSize }) // 1. input
    .mockResolvedValueOnce({ exists: true })                  // 2. cache dir
    .mockResolvedValueOnce({ exists: true, size: outputSize });// 3. output
}

// ---------------------------------------------------------------------------
// compressForDiscord — image
// ---------------------------------------------------------------------------

describe('compressForDiscord (image)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockReadDirectoryAsync.mockResolvedValue([]);
    mockDeleteAsync.mockResolvedValue(undefined);
    setupSuccessSession();
  });

  it('returns original URI when already below 10 MB', async () => {
    const smallSize = 1 * 1024 * 1024;
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: smallSize }) // 1. input
      .mockResolvedValueOnce({ exists: true });                  // 2. cache dir
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
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false }); // 1. input
    await expect(compressForDiscord('file:///photos/img.jpg')).rejects.toThrow('入力ファイルが存在しません');
  });

  it('throws when input file is empty', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: true, size: 0 }); // 1. input
    await expect(compressForDiscord('file:///photos/img.jpg')).rejects.toThrow('入力ファイルが空（0バイト）です');
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
    mockReadDirectoryAsync.mockResolvedValue([]);
    mockDeleteAsync.mockResolvedValue(undefined);
    setupSuccessSession();
  });

  it('returns original URI when video already below 10 MB', async () => {
    const smallSize = 5 * 1024 * 1024;
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: smallSize }) // 1. input
      .mockResolvedValueOnce({ exists: true });                  // 2. cache dir
    const result = await compressForDiscord('file:///videos/clip.mp4');
    expect(result.outputUri).toBe('file:///videos/clip.mp4');
    expect(result.compressionRatio).toBe(1);
  });

  it('uses -b:v bitrate flag in video compress command', async () => {
    setupVideoFileInfo();
    await compressForDiscord('file:///videos/clip.mp4');
    const cmd = capturedCmd();
    expect(cmd).toContain('-b:v');
    expect(cmd).toContain('-maxrate');
    expect(cmd).toContain('-bufsize');
  });

  it('uses AAC audio codec in video compress command', async () => {
    setupVideoFileInfo();
    await compressForDiscord('file:///videos/clip.mp4');
    const cmd = capturedCmd();
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
    await expect(compressForDiscord('file:///videos/clip.mp4')).rejects.toThrow('圧縮できません');
  });

  it('includes _compressed_ in output filename', async () => {
    setupVideoFileInfo();
    const result = await compressForDiscord('file:///videos/clip.mp4');
    expect(result.outputUri).toContain('_compressed_');
  });

  it('throws when input does not exist', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false }); // 1. input
    await expect(compressForDiscord('file:///videos/clip.mp4')).rejects.toThrow('入力ファイルが存在しません');
  });
});

// ---------------------------------------------------------------------------
// compressToTargetSize
// ---------------------------------------------------------------------------

describe('compressToTargetSize', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockReadDirectoryAsync.mockResolvedValue([]);
    mockDeleteAsync.mockResolvedValue(undefined);
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
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size }) // 1. input
      .mockResolvedValueOnce({ exists: true });        // 2. cache dir
    const result = await compressToTargetSize('file:///photos/img.jpg', target);
    expect(result.compressionRatio).toBe(1);
  });

  it('throws when input file does not exist', async () => {
    mockGetInfoAsync.mockResolvedValueOnce({ exists: false }); // 1. input
    await expect(compressToTargetSize('file:///photos/img.jpg', 5 * 1024 * 1024)).rejects.toThrow('入力ファイルが存在しません');
  });

  it('falls back to scale-down when quality-only compression is insufficient', async () => {
    // Binary search: output always exceeds target → bestBytes = 0 → fallback cmd with scale
    const hugeOutput = 15 * 1024 * 1024;
    const target = 5 * 1024 * 1024;
    mockGetInfoAsync
      .mockResolvedValueOnce({ exists: true, size: 20 * 1024 * 1024 }) // 1. input
      .mockResolvedValueOnce({ exists: true })                          // 2. cache dir
      .mockResolvedValue({ exists: true, size: hugeOutput });           // 3+. all outputs oversized

    await compressToTargetSize('file:///photos/img.jpg', target);
    // The final (fallback) command should contain scale=iw*0.5:ih*0.5 and -q:v 31
    const lastCmd = capturedCmd();
    expect(lastCmd).toContain('scale=iw*0.5:ih*0.5');
    expect(lastCmd).toContain('-q:v 31');
  });
});
