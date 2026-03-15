import { convertImage, formatBytes } from '../domain/convertImage';
import { convertImage as ffmpegConvertImage } from '../data/ffmpeg/FfmpegConverter';

// Mock the FfmpegConverter module
jest.mock('../data/ffmpeg/FfmpegConverter', () => ({
  convertImage: jest.fn(),
}));

// Mock ffmpeg-kit-react-native (transitive dependency)
jest.mock('ffmpeg-kit-react-native', () => ({
  FFmpegKit: { execute: jest.fn() },
  ReturnCode: { isSuccess: jest.fn() },
}));

// Mock expo-file-system/legacy (transitive dependency)
jest.mock('expo-file-system/legacy', () => ({
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

// Mock expo-file-system (for Paths)
jest.mock('expo-file-system', () => ({
  Paths: {
    cache: { uri: 'file:///cache/' },
  },
}));

const mockFfmpegConvertImage = ffmpegConvertImage as jest.MockedFunction<typeof ffmpegConvertImage>;

describe('convertImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns ConvertImageResult with engine=ffmpeg on success', async () => {
    mockFfmpegConvertImage.mockResolvedValue({
      outputUri: 'file:///cache/output.jpg',
      outputBytes: 12345,
    });

    const result = await convertImage('file:///input.png', { outputFormat: 'jpeg', quality: 80 });

    expect(result).toEqual({
      outputUri: 'file:///cache/output.jpg',
      outputBytes: 12345,
      engine: 'ffmpeg',
    });
  });

  it('passes inputUri and options to ffmpegConvertImage', async () => {
    mockFfmpegConvertImage.mockResolvedValue({
      outputUri: 'file:///cache/out.png',
      outputBytes: 999,
    });

    const options = { outputFormat: 'png' as const };
    await convertImage('file:///test.jpg', options);

    expect(mockFfmpegConvertImage).toHaveBeenCalledWith('file:///test.jpg', options);
  });

  it('propagates errors from ffmpegConvertImage', async () => {
    mockFfmpegConvertImage.mockRejectedValue(new Error('FFmpeg失敗'));

    await expect(
      convertImage('file:///bad.jpg', { outputFormat: 'webp' }),
    ).rejects.toThrow('FFmpeg失敗');
  });
});

describe('formatBytes', () => {
  it('formats bytes under 1024 as B', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats KB range', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
  });

  it('formats MB range', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(1024 * 1024 * 2.5)).toBe('2.50 MB');
  });
});
