/**
 * ConversionHistoryModal コンポーネントのユニットテスト
 * Issue #110
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Alert} from 'react-native';

// ---- モック ----

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../data/history/conversionHistory', () => ({
  getConversionHistory: jest.fn(),
  clearConversionHistory: jest.fn(),
}));

// ---- インポート ----

import ConversionHistoryModal from '../screens/components/ConversionHistoryModal';
import {getConversionHistory, clearConversionHistory} from '../data/history/conversionHistory';
import {ConversionHistoryItem} from '../data/history/conversionHistory';

const mockedGetHistory = getConversionHistory as jest.Mock;
const mockedClearHistory = clearConversionHistory as jest.Mock;

const sampleItem: ConversionHistoryItem = {
  id: 'test-1',
  createdAt: '2026-04-01T10:00:00.000Z',
  inputPath: 'file:///in/sample.jpg',
  outputPath: 'file:///out/sample_out.jpg',
  inputBytes: 2048 * 1024,
  outputBytes: 512 * 1024,
  mediaType: 'image',
  params: {action: 'gabigabi'},
};

/** clearButton を見つけるヘルパー（accessibilityRole=button + clearHistoryTitle の値） */
function findClearButton(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAll(
    (node: ReactTestRenderer.ReactTestInstance) =>
      node.props.accessibilityRole === 'button' &&
      (
        node.props.accessibilityLabel === 'Clear all history' ||
        node.props.accessibilityLabel === '履歴を全削除'
      ),
  );
}

/** コンポーネントを作成してデータ読み込みまで待つ */
async function createWithData(
  items: ConversionHistoryItem[],
  props?: {onClose?: jest.Mock; visible?: boolean},
): Promise<ReactTestRenderer.ReactTestRenderer> {
  mockedGetHistory.mockResolvedValue(items);
  const onClose = props?.onClose ?? jest.fn();
  const visible = props?.visible ?? true;
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(
      <ConversionHistoryModal visible={visible} onClose={onClose} />,
    );
  });
  // useEffect の非同期ロードが完了するまで追加フラッシュ
  await ReactTestRenderer.act(async () => {});
  return renderer!;
}

// ---- テスト ----

describe('ConversionHistoryModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('visible=true のとき正常にレンダリングされる', async () => {
    const renderer = await createWithData([]);
    expect(renderer.toJSON()).not.toBeNull();
  });

  it('visible=false のとき Modal が閉じた状態でレンダリングされる', async () => {
    const renderer = await createWithData([], {visible: false});
    const json = renderer.toJSON() as ReactTestRenderer.ReactTestRendererJSON | null;
    expect(json).toBeNull();
  });

  it('履歴が空のとき空を示すメッセージが表示される', async () => {
    const renderer = await createWithData([]);
    const json = JSON.stringify(renderer.toJSON());
    // i18n の "noHistory" キー（en: "No conversion history", ja: "変換履歴がありません"）
    expect(json).toMatch(/No conversion history|変換履歴がありません/);
  });

  it('履歴アイテムが正しくレンダリングされる（ファイル名表示）', async () => {
    const renderer = await createWithData([sampleItem]);
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('sample_out.jpg');
  });

  it('「クリア」ボタンは履歴ありのときのみ表示される', async () => {
    const renderer = await createWithData([sampleItem]);
    const clearBtns = findClearButton(renderer);
    expect(clearBtns.length).toBeGreaterThan(0);
  });

  it('「クリア」ボタンは履歴がないとき表示されない', async () => {
    const renderer = await createWithData([]);
    const clearBtns = findClearButton(renderer);
    expect(clearBtns.length).toBe(0);
  });

  it('閉じるボタン押下で onClose が呼ばれる', async () => {
    const onClose = jest.fn();
    const renderer = await createWithData([], {onClose});
    // onClose を onPress に持つ TouchableOpacity を探す
    const allTouchable = renderer.root.findAll(
      (node: ReactTestRenderer.ReactTestInstance) =>
        typeof node.props.onPress === 'function',
    );
    // children に "Close" / "閉じる" テキストを持つ Text が兄弟か子孫にあるものを探す
    const closeBtn = allTouchable.find((node: ReactTestRenderer.ReactTestInstance) => {
      // クリアボタンは除外
      if (
        node.props.accessibilityLabel === 'Clear all history' ||
        node.props.accessibilityLabel === '履歴を全削除'
      ) return false;
      // テキスト子孫に "Close" か "閉じる" があるか確認
      const descendants = node.findAll(
        (n: ReactTestRenderer.ReactTestInstance) =>
          n.type === 'Text' &&
          (n.props.children === 'Close' || n.props.children === '閉じる'),
        {deep: true},
      );
      return descendants.length > 0;
    });
    expect(closeBtn).toBeDefined();
    await ReactTestRenderer.act(async () => {
      closeBtn!.props.onPress?.();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clearConversionHistory 後に履歴が空になる', async () => {
    mockedClearHistory.mockResolvedValueOnce(undefined);

    let alertCallback: (() => void) | undefined;
    jest.spyOn(Alert, 'alert').mockImplementation((_title, _msg, buttons) => {
      const deleteBtn = buttons?.find(b => b.style === 'destructive');
      alertCallback = deleteBtn?.onPress as (() => void) | undefined;
    });

    const renderer = await createWithData([sampleItem]);

    // クリアボタンを押す
    const clearBtns = findClearButton(renderer);
    expect(clearBtns.length).toBeGreaterThan(0);
    await ReactTestRenderer.act(async () => {
      clearBtns[0].props.onPress?.();
    });

    expect(Alert.alert).toHaveBeenCalled();

    // 「削除」コールバックを実行
    await ReactTestRenderer.act(async () => {
      alertCallback?.();
    });
    await ReactTestRenderer.act(async () => {});

    expect(mockedClearHistory).toHaveBeenCalledTimes(1);
    const json = JSON.stringify(renderer.toJSON());
    expect(json).not.toContain('sample_out.jpg');
  });
});
