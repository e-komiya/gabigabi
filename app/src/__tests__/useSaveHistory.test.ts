import { renderHook, act } from '@testing-library/react-native';

import { saveConversionHistoryItem } from '../data/history/conversionHistory';
import { useSaveHistory } from '../hooks/useSaveHistory';

jest.mock('../data/history/conversionHistory', () => ({
  saveConversionHistoryItem: jest.fn(),
}));

const mockSave = saveConversionHistoryItem as jest.MockedFunction<
  typeof saveConversionHistoryItem
>;

describe('useSaveHistory', () => {
  const defaultOptions = {
    selectedMediaType: 'image' as const,
    outputFormat: 'jpeg',
    videoOutputFormat: 'mp4',
    gabigabiLevel: 2,
    resizePercent: 80,
    compressionRate: 70,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);
    jest.spyOn(Math, 'random').mockReturnValue(0.123456789);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('saveHistory を呼び出すと saveConversionHistoryItem が正しい引数で呼ばれること', async () => {
    const { result } = renderHook(() => useSaveHistory(defaultOptions));
    await act(async () => {
      await result.current.saveHistory(
        'convert',
        'file:///input/test.jpg',
        'file:///output/test.jpg',
        1000000,
        500000,
      );
    });
    expect(mockSave).toHaveBeenCalledTimes(1);
    const arg = mockSave.mock.calls[0][0];
    expect(arg.inputPath).toBe('file:///input/test.jpg');
    expect(arg.outputPath).toBe('file:///output/test.jpg');
    expect(arg.inputBytes).toBe(1000000);
    expect(arg.outputBytes).toBe(500000);
    expect(arg.mediaType).toBe('image');
    expect(arg.params.action).toBe('convert');
    expect(arg.params.outputFormat).toBe('jpeg');
    expect(arg.params.gabigabiLevel).toBe(2);
  });

  it('selectedMediaType が null の場合は "image" にフォールバックされること', async () => {
    const { result } = renderHook(() =>
      useSaveHistory({ ...defaultOptions, selectedMediaType: null }),
    );
    await act(async () => {
      await result.current.saveHistory(
        'convert',
        'file:///input/test.jpg',
        'file:///output/test.jpg',
        1000,
        800,
      );
    });
    expect(mockSave.mock.calls[0][0].mediaType).toBe('image');
  });

  it('targetBytes が省略可能であること（undefined でも動作すること）', async () => {
    const { result } = renderHook(() => useSaveHistory(defaultOptions));
    await act(async () => {
      await result.current.saveHistory(
        'convert',
        'file:///input/test.jpg',
        'file:///output/test.jpg',
        1000,
        800,
      );
    });
    expect(mockSave.mock.calls[0][0].params.targetBytes).toBeUndefined();
  });

  it('targetBytes が指定されたとき params に含まれること', async () => {
    const { result } = renderHook(() => useSaveHistory(defaultOptions));
    await act(async () => {
      await result.current.saveHistory(
        'compress',
        'file:///input/test.mp4',
        'file:///output/test.mp4',
        10000000,
        8000000,
        7000000,
      );
    });
    expect(mockSave.mock.calls[0][0].params.targetBytes).toBe(7000000);
  });

  it('id に Date.now と Math.random が使われること', async () => {
    const { result } = renderHook(() => useSaveHistory(defaultOptions));
    await act(async () => {
      await result.current.saveHistory(
        'convert',
        'file:///input/test.jpg',
        'file:///output/test.jpg',
        1000,
        800,
      );
    });
    expect(mockSave.mock.calls[0][0].id).toContain('1700000000000');
  });
});
