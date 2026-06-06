import { resizeImage } from '../domain/useResizeImage';

const mockProcessWithFfmpeg = jest.fn();

jest.mock('../data/ffmpeg/FfmpegProcessor', () => ({
  processWithFfmpeg: (...args: unknown[]) => mockProcessWithFfmpeg(...args),
}));

describe('resizeImage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockProcessWithFfmpeg.mockResolvedValue({
      outputUri: 'file:///output/result.jpg',
      outputBytes: 12345,
    });
  });

  it('returns outputUri, outputBytes, and engine="ffmpeg" from processWithFfmpeg result', async () => {
    const result = await resizeImage('file:///input/test.jpg', 50, 2);
    expect(result).toEqual({
      outputUri: 'file:///output/result.jpg',
      outputBytes: 12345,
      engine: 'ffmpeg',
    });
  });

  it('passes inputUri, scalePct, and gabigabiLevel to processWithFfmpeg', async () => {
    await resizeImage('file:///input/test.jpg', 75, 3);
    expect(mockProcessWithFfmpeg).toHaveBeenCalledWith(
      'file:///input/test.jpg',
      75,
      3,
      {},
    );
  });

  it('passes options to processWithFfmpeg', async () => {
    const options = {
      shrinkExpandEnabled: true,
      shrinkExpandRate: 50,
      multiCompressEnabled: true,
      multiCompressCount: 5,
    };
    await resizeImage('file:///input/test.jpg', 80, 2, options);
    expect(mockProcessWithFfmpeg).toHaveBeenCalledWith(
      'file:///input/test.jpg',
      80,
      2,
      options,
    );
  });

  it('uses gabigabiLevel default of 2 when not specified', async () => {
    await resizeImage('file:///input/test.jpg', 60);
    expect(mockProcessWithFfmpeg).toHaveBeenCalledWith(
      'file:///input/test.jpg',
      60,
      2,
      {},
    );
  });

  it('propagates error when processWithFfmpeg throws', async () => {
    mockProcessWithFfmpeg.mockRejectedValue(new Error('FFmpeg error'));
    await expect(resizeImage('file:///input/test.jpg', 50, 2)).rejects.toThrow(
      'FFmpeg error',
    );
  });
});
