import AsyncStorage from '@react-native-async-storage/async-storage';
import {getConversionHistory, saveConversionHistoryItem, clearConversionHistory, deleteConversionHistoryItem} from '../data/history/conversionHistory';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedAsyncStorage = AsyncStorage as unknown as {
  getItem: jest.Mock;
  setItem: jest.Mock;
  removeItem: jest.Mock;
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

  it('clearConversionHistory を呼ぶと removeItem が正しいキーで呼ばれる', async () => {
    mockedAsyncStorage.removeItem.mockResolvedValueOnce(undefined);
    await clearConversionHistory();
    expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('conversion-history-v1');
  });

  it('clearConversionHistory 後に getConversionHistory が空配列を返す', async () => {
    mockedAsyncStorage.removeItem.mockResolvedValueOnce(undefined);
    mockedAsyncStorage.getItem.mockResolvedValueOnce(null);
    await clearConversionHistory();
    const rows = await getConversionHistory();
    expect(rows).toEqual([]);
  });

  it('50件を超えた場合に古い履歴を切り捨てる', async () => {
    const existing = Array.from({length: 50}, (_, i) => ({
      id: `old-${i}`,
      createdAt: '2026-01-01T00:00:00.000Z',
      inputPath: 'file:///in.jpg',
      outputPath: 'file:///out.jpg',
      inputBytes: 100,
      outputBytes: 50,
      mediaType: 'image' as const,
      params: {action: 'gabigabi' as const},
    }));
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify(existing));

    const newItem = {
      id: 'newest',
      createdAt: '2026-03-22T00:00:00.000Z',
      inputPath: 'file:///in.jpg',
      outputPath: 'file:///out.jpg',
      inputBytes: 200,
      outputBytes: 100,
      mediaType: 'image' as const,
      params: {action: 'gabigabi' as const},
    };
    await saveConversionHistoryItem(newItem);

    const saved = JSON.parse(mockedAsyncStorage.setItem.mock.calls[0][1]);
    expect(saved).toHaveLength(50);
    expect(saved[0].id).toBe('newest');
    // 最古のold-49が切り捨てられ、old-48が末尾になること
    expect(saved[49].id).toBe('old-48');
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

describe('deleteConversionHistoryItem', () => {
  it('指定IDの履歴アイテムを削除して保存する', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([{id: 'a'}, {id: 'b'}, {id: 'c'}]));
    await deleteConversionHistoryItem('b');
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'conversion-history-v1',
      JSON.stringify([{id: 'a'}, {id: 'c'}]),
    );
  });

  it('存在しないIDを指定しても残りのアイテムはそのまま', async () => {
    mockedAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify([{id: 'a'}, {id: 'b'}]));
    await deleteConversionHistoryItem('z');
    expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
      'conversion-history-v1',
      JSON.stringify([{id: 'a'}, {id: 'b'}]),
    );
  });
});
