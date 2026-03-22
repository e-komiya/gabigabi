import AsyncStorage from '@react-native-async-storage/async-storage';
import {getConversionHistory, saveConversionHistoryItem} from '../data/history/conversionHistory';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
};

describe('conversionHistory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('保存済み履歴を返す', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([{id: '1'}]));
    const rows = await getConversionHistory();
    expect(rows).toEqual([{id: '1'}]);
  });

  it('履歴が壊れていたら空配列を返す', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce('{broken');
    const rows = await getConversionHistory();
    expect(rows).toEqual([]);
  });

  it('新しい履歴を先頭に追加して保存する', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([{id: 'old'}]));

    await saveConversionHistoryItem({
      id: 'new',
      createdAt: '2026-03-22T00:00:00.000Z',
      inputPath: 'file:///in.jpg',
      outputPath: 'file:///out.jpg',
      inputBytes: 100,
      outputBytes: 50,
      mediaType: 'image',
      params: {action: 'gabigabi'},
    });

    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'conversion-history-v1',
      JSON.stringify([{id: 'new', createdAt: '2026-03-22T00:00:00.000Z', inputPath: 'file:///in.jpg', outputPath: 'file:///out.jpg', inputBytes: 100, outputBytes: 50, mediaType: 'image', params: {action: 'gabigabi'}}, {id: 'old'}]),
    );
  });
});
