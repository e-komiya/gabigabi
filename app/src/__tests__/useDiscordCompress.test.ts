import {
  compressForDiscord,
  compressToTargetSize,
} from '../domain/useDiscordCompress';

const mockCompressForDiscord = jest.fn();
const mockCompressToTargetSize = jest.fn();

jest.mock('../data/ffmpeg/FfmpegCompressor', () => ({
  compressForDiscord: (...args: unknown[]) => mockCompressForDiscord(...args),
  compressToTargetSize: (...args: unknown[]) =>
    mockCompressToTargetSize(...args),
}));

const defaultResult = {
  outputUri: 'file:///output/result.mp4',
  outputBytes: 5000000,
};

describe('compressForDiscord', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompressForDiscord.mockResolvedValue(defaultResult);
  });

  it('calls FfmpegCompressor.compressForDiscord with inputUri and videoFormat', async () => {
    await compressForDiscord('file:///input/test.mp4', 'mp4');
    expect(mockCompressForDiscord).toHaveBeenCalledWith(
      'file:///input/test.mp4',
      'mp4',
    );
  });

  it('uses default videoFormat "mp4" when not specified', async () => {
    await compressForDiscord('file:///input/test.mp4');
    expect(mockCompressForDiscord).toHaveBeenCalledWith(
      'file:///input/test.mp4',
      'mp4',
    );
  });

  it('returns the result from FfmpegCompressor.compressForDiscord', async () => {
    const result = await compressForDiscord('file:///input/test.mp4', 'mp4');
    expect(result).toEqual(defaultResult);
  });

  it('propagates error when FfmpegCompressor.compressForDiscord throws', async () => {
    mockCompressForDiscord.mockRejectedValue(new Error('compress error'));
    await expect(
      compressForDiscord('file:///input/test.mp4', 'mp4'),
    ).rejects.toThrow('compress error');
  });
});

describe('compressToTargetSize', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompressToTargetSize.mockResolvedValue(defaultResult);
  });

  it('calls FfmpegCompressor.compressToTargetSize with inputUri, targetBytes, and videoFormat', async () => {
    await compressToTargetSize('file:///input/test.mp4', 8000000, 'mp4');
    expect(mockCompressToTargetSize).toHaveBeenCalledWith(
      'file:///input/test.mp4',
      8000000,
      'mp4',
    );
  });

  it('uses default videoFormat "mp4" when not specified', async () => {
    await compressToTargetSize('file:///input/test.mp4', 8000000);
    expect(mockCompressToTargetSize).toHaveBeenCalledWith(
      'file:///input/test.mp4',
      8000000,
      'mp4',
    );
  });

  it('returns the result from FfmpegCompressor.compressToTargetSize', async () => {
    const result = await compressToTargetSize(
      'file:///input/test.mp4',
      8000000,
      'mp4',
    );
    expect(result).toEqual(defaultResult);
  });

  it('propagates error when FfmpegCompressor.compressToTargetSize throws', async () => {
    mockCompressToTargetSize.mockRejectedValue(new Error('compress error'));
    await expect(
      compressToTargetSize('file:///input/test.mp4', 8000000, 'mp4'),
    ).rejects.toThrow('compress error');
  });
});
