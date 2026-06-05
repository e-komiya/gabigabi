/**
 * ConversionHistoryModal コンポーネントのユニットテスト
 * Issue #110
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Alert} from 'react-native';

jest.mock('react-native/Libraries/Lists/FlatList', () => {
  const React = require('react');
  const {View} = require('react-native');

  const MockFlatList = ({
    data,
    renderItem,
    keyExtractor,
    ListEmptyComponent,
    contentContainerStyle,
    ...props
  }: any) => React.createElement(
    View,
    {...props, style: contentContainerStyle},
    Array.isArray(data) && data.length > 0
      ? data.map((item, index) => React.createElement(
        React.Fragment,
        {key: keyExtractor ? keyExtractor(item, index) : String(index)},
        renderItem({
          item,
          index,
          separators: {
            highlight: jest.fn(),
            unhighlight: jest.fn(),
            updateProps: jest.fn(),
          },
        }),
      ))
      : ListEmptyComponent ?? null,
  );

  return {
    __esModule: true,
    default: MockFlatList,
  };
});

// ---- モック ----

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('expo-file-system', () => {
  class MockFile {
    exists: boolean = true;
    size: number = 1024;
    uri: string;
    constructor(uri: string) { this.uri = uri; this.exists = true; }
    delete() {}
    move(dest: any) {}
  }
  return {
    Paths: { cache: { uri: 'file:///cache/' }, join: (...args: string[]) => args.join('/') },
    File: MockFile,
    Directory: class {
      exists = true;
      constructor() {}
      list() { return []; }
    },
  };
});

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('expo-video-thumbnails', () => ({
  getThumbnailAsync: jest.fn().mockResolvedValue({uri: 'file:///thumb.jpg'}),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
  SafeAreaProvider: ({children}: {children: React.ReactNode}) => children,
}));

jest.mock('../data/history/conversionHistory', () => ({
  getConversionHistory: jest.fn(),
  clearConversionHistory: jest.fn(),
}));

// ---- インポート ----

import ConversionHistoryModal from '../screens/components/ConversionHistoryModal';
import {
  getConversionHistory,
  clearConversionHistory,
  ConversionHistoryItem,
} from '../data/history/conversionHistory';

const mockedGetHistory = getConversionHistory as jest.Mock;
const mockedClearHistory = clearConversionHistory as jest.Mock;

const mountedRenderers = new Set<ReactTestRenderer.ReactTestRenderer>();

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
  mountedRenderers.add(renderer!);
  // useEffect の非同期ロードが完了するまで追加フラッシュ
  await ReactTestRenderer.act(async () => {});
  return renderer!;
}

// ---- テスト ----

describe('ConversionHistoryModal', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(async () => {
    for (const renderer of mountedRenderers) {
      await ReactTestRenderer.act(async () => {
        renderer.unmount();
      });
    }
    mountedRenderers.clear();
    await ReactTestRenderer.act(async () => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
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

  it('サムネイル画像が正しいURIでレンダリングされる', async () => {
    const renderer = await createWithData([sampleItem]);
    const images = renderer.root.findAll(
      (node: ReactTestRenderer.ReactTestInstance) =>
        node.type === 'Image' &&
        node.props.accessibilityLabel === '変換後画像のサムネイル',
    );
    expect(images.length).toBeGreaterThan(0);
    expect(images[0].props.source.uri).toBe('file:///out/sample_out.jpg');
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

describe('ビデオサムネイル', () => {
  it('mediaType=videoのアイテムで getThumbnailAsync が呼ばれる', async () => {
    const VideoThumbnails = require('expo-video-thumbnails');
    const mockedGetHistory = require('../data/history/conversionHistory').getConversionHistory as jest.Mock;
    const videoItem: ConversionHistoryItem = {
      id: 'vid-1',
      createdAt: new Date().toISOString(),
      inputBytes: 5000,
      outputBytes: 3000,
      outputPath: '/cache/out.mp4',
      mediaType: 'video',
      params: {action: 'convert'},
    };
    mockedGetHistory.mockResolvedValueOnce([videoItem]);
    await createWithData([videoItem]);
    // 非同期処理の完了を待つ
    await ReactTestRenderer.act(async () => {});
    expect(VideoThumbnails.getThumbnailAsync).toHaveBeenCalledWith(
      expect.stringContaining('out.mp4'),
      {time: 0},
    );
  });
});


describe('formatParams 表示ロジック (Issue #166)', () => {
  it('gabigabi: level + resizePercent + outputFormat がすべて揃うと "Lv.X / Y% / format" で表示される', async () => {
    const item: ConversionHistoryItem = {
      id: 'gabi-full',
      createdAt: '2026-04-01T10:00:00.000Z',
      inputPath: 'file:///in/a.jpg',
      outputPath: 'file:///out/a_out.jpeg',
      inputBytes: 1024,
      outputBytes: 512,
      mediaType: 'image',
      params: {action: 'gabigabi', gabigabiLevel: 4, resizePercent: 50, outputFormat: 'jpeg'},
    };
    const renderer = await createWithData([item]);
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('Lv.4');
    expect(json).toContain('50%');
    expect(json).toContain('jpeg');
  });

  it('convert: outputFormat が表示される', async () => {
    const item: ConversionHistoryItem = {
      id: 'conv-full',
      createdAt: '2026-04-02T10:00:00.000Z',
      inputPath: 'file:///in/b.png',
      outputPath: 'file:///out/b_out.webp',
      inputBytes: 2048,
      outputBytes: 1024,
      mediaType: 'image',
      params: {action: 'convert', outputFormat: 'webp'},
    };
    const renderer = await createWithData([item]);
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('webp');
  });

  it('targetSize: targetBytes から目標サイズ表示が正しい', async () => {
    const item: ConversionHistoryItem = {
      id: 'target-full',
      createdAt: '2026-04-03T10:00:00.000Z',
      inputPath: 'file:///in/c.jpg',
      outputPath: 'file:///out/c_out.jpg',
      inputBytes: 4096,
      outputBytes: 102400,
      mediaType: 'image',
      params: {action: 'targetSize', targetBytes: 204800},
    };
    const renderer = await createWithData([item]);
    const json = JSON.stringify(renderer.toJSON());
    expect(json).toContain('目標:');
    expect(json).toContain('結果:');
  });
});

describe('フィルタータブ機能', () => {
  const gabiItem: ConversionHistoryItem = {
    id: 'gabi-1',
    createdAt: '2026-04-01T10:00:00.000Z',
    inputPath: 'file:///in/gabi.jpg',
    outputPath: 'file:///out/gabi_out.jpg',
    inputBytes: 1024,
    outputBytes: 512,
    mediaType: 'image',
    params: {action: 'gabigabi'},
  };
  const convertItem: ConversionHistoryItem = {
    id: 'conv-1',
    createdAt: '2026-04-02T10:00:00.000Z',
    inputPath: 'file:///in/conv.png',
    outputPath: 'file:///out/conv_out.jpg',
    inputBytes: 2048,
    outputBytes: 1024,
    mediaType: 'image',
    params: {action: 'convert'},
  };
  const targetSizeItem: ConversionHistoryItem = {
    id: 'target-1',
    createdAt: '2026-04-03T10:00:00.000Z',
    inputPath: 'file:///in/target.jpg',
    outputPath: 'file:///out/target_out.jpg',
    inputBytes: 4096,
    outputBytes: 2048,
    mediaType: 'image',
    params: {action: 'targetSize'},
  };
  const allItems = [gabiItem, convertItem, targetSizeItem];

  /** filterRow 直下の tab を i18nテキストで特定する */
  function findFilterTab(
    renderer: ReactTestRenderer.ReactTestRenderer,
    label: string,
  ): ReactTestRenderer.ReactTestInstance | undefined {
    return renderer.root.findAll(
      (node: ReactTestRenderer.ReactTestInstance) =>
        node.props.accessibilityRole === 'tab' &&
        node.findAll(
          (child: ReactTestRenderer.ReactTestInstance) =>
            child.type === 'Text' && child.props.children === label,
          {deep: true},
        ).length > 0,
    )[0];
  }

  it('「すべて」タブが初期選択されている', async () => {
    const renderer = await createWithData(allItems);
    const allTab = findFilterTab(renderer, 'All');
    expect(allTab).toBeDefined();
    expect(allTab!.props.accessibilityState?.selected).toBe(true);
  });

  it('「ガビガビ化」タブ選択時にガビガビ化のみ選択される', async () => {
    const renderer = await createWithData(allItems);
    const gabiTab = findFilterTab(renderer, 'Blocky');
    expect(gabiTab).toBeDefined();
    await ReactTestRenderer.act(async () => { gabiTab!.props.onPress?.(); });

    const allTab2 = findFilterTab(renderer, 'All');
    const gabiTab2 = findFilterTab(renderer, 'Blocky');
    expect(allTab2!.props.accessibilityState?.selected).toBe(false);
    expect(gabiTab2!.props.accessibilityState?.selected).toBe(true);
  });

  it('「変換」タブ選択時に変換タブが選択される', async () => {
    const renderer = await createWithData(allItems);
    const convertTab = findFilterTab(renderer, 'Convert');
    expect(convertTab).toBeDefined();
    await ReactTestRenderer.act(async () => { convertTab!.props.onPress?.(); });

    const convertTab2 = findFilterTab(renderer, 'Convert');
    const allTab2 = findFilterTab(renderer, 'All');
    expect(convertTab2!.props.accessibilityState?.selected).toBe(true);
    expect(allTab2!.props.accessibilityState?.selected).toBe(false);
  });

  it('「サイズ指定」タブ選択時にサイズ指定タブが選択される', async () => {
    const renderer = await createWithData(allItems);
    const targetTab = findFilterTab(renderer, 'Target size');
    expect(targetTab).toBeDefined();
    await ReactTestRenderer.act(async () => { targetTab!.props.onPress?.(); });

    const targetTab2 = findFilterTab(renderer, 'Target size');
    const allTab2 = findFilterTab(renderer, 'All');
    expect(targetTab2!.props.accessibilityState?.selected).toBe(true);
    expect(allTab2!.props.accessibilityState?.selected).toBe(false);
  });

  it('タブ切り替え後に「すべて」タブに戻ると「すべて」が選択状態になる', async () => {
    const renderer = await createWithData(allItems);
    const gabiTab = findFilterTab(renderer, 'Blocky');
    const allTab = findFilterTab(renderer, 'All');
    await ReactTestRenderer.act(async () => { gabiTab!.props.onPress?.(); });
    await ReactTestRenderer.act(async () => { allTab!.props.onPress?.(); });

    const allTab2 = findFilterTab(renderer, 'All');
    const gabiTab2 = findFilterTab(renderer, 'Blocky');
    expect(allTab2!.props.accessibilityState?.selected).toBe(true);
    expect(gabiTab2!.props.accessibilityState?.selected).toBe(false);
  });
});

describe('共有機能 (Issue #165)', () => {
  const Sharing = require('expo-sharing');
  const FileSystemMock = require('expo-file-system');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    Sharing.isAvailableAsync.mockResolvedValue(true);
    Sharing.shareAsync.mockResolvedValue(undefined);
    FileSystemMock.File = class { exists = true; size = 1024; uri: string; constructor(uri: string) { this.uri = uri; } delete() {} move() {} };
  });

  it('ファイルが存在する場合、共有ボタンが有効である', async () => {
    FileSystemMock.File = class { exists = true; size = 1024; uri: string; constructor(uri: string) { this.uri = uri; } delete() {} move() {} };
    const renderer = await createWithData([sampleItem]);
    await ReactTestRenderer.act(async () => {});

    const shareBtns = renderer.root.findAll(
      (node: ReactTestRenderer.ReactTestInstance) =>
        node.props.accessibilityRole === 'button' &&
        (node.props.accessibilityLabel === 'Share file' || node.props.accessibilityLabel === 'ファイルを共有'),
    );
    expect(shareBtns.length).toBeGreaterThan(0);
    expect(shareBtns[0].props.accessibilityState?.disabled).toBe(false);
  });

  it('ファイルが存在しない場合、共有ボタンが無効である', async () => {
    FileSystemMock.File = class { exists = false; size = 0; uri: string; constructor(uri: string) { this.uri = uri; } delete() {} move() {} };
    const renderer = await createWithData([sampleItem]);
    await ReactTestRenderer.act(async () => {});

    const shareBtns = renderer.root.findAll(
      (node: ReactTestRenderer.ReactTestInstance) =>
        node.props.accessibilityRole === 'button' &&
        (node.props.accessibilityLabel === 'Share file' || node.props.accessibilityLabel === 'ファイルを共有'),
    );
    expect(shareBtns.length).toBeGreaterThan(0);
    expect(shareBtns[0].props.accessibilityState?.disabled).toBe(true);
  });

  it('共有ボタンを押すと Sharing.shareAsync が呼ばれる', async () => {
    FileSystemMock.File = class { exists = true; size = 1024; uri: string; constructor(uri: string) { this.uri = uri; } delete() {} move() {} };
    const renderer = await createWithData([sampleItem]);
    await ReactTestRenderer.act(async () => {});

    const shareBtns = renderer.root.findAll(
      (node: ReactTestRenderer.ReactTestInstance) =>
        node.props.accessibilityRole === 'button' &&
        (node.props.accessibilityLabel === 'Share file' || node.props.accessibilityLabel === 'ファイルを共有'),
    );
    expect(shareBtns.length).toBeGreaterThan(0);

    await ReactTestRenderer.act(async () => {
      shareBtns[0].props.onPress?.();
    });

    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      expect.stringContaining('sample_out.jpg'),
    );
  });
});
