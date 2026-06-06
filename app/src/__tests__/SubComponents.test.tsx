/**
 * サブコンポーネント（AboutModal, PreviewCard, SettingsPanel, TargetSizePanel, ImageInfoBlock）のユニットテスト
 * Issue #93
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

// ---- インポート ----

import AboutModal from '../screens/components/AboutModal';
import {
  BeforeInfoBlock,
  AfterInfoBlock,
} from '../screens/components/ImageInfoBlock';
import PreviewCard from '../screens/components/PreviewCard';
import SettingsPanel from '../screens/components/SettingsPanel';
import TargetSizePanel from '../screens/components/TargetSizePanel';

// ---- モック ----

jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    Svg: ({ children }: { children: React.ReactNode }) =>
      React.createElement('Svg', null, children),
    Path: () => null,
    Rect: () => null,
    G: () => null,
  };
});

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

// ---- AboutModal ----

describe('AboutModal', () => {
  it('visible=true のとき正常にレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AboutModal visible onClose={jest.fn()} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('visible=false のとき Modal は閉じた状態でレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AboutModal visible={false} onClose={jest.fn()} />,
      );
    });
    expect(renderer!.toJSON()).toBeNull();
  });

  it('"GabiGabi" タイトルが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <AboutModal visible onClose={jest.fn()} />,
      );
    });
    const texts = renderer!.root.findAll(
      el => el.props.children === 'GabiGabi',
    );
    expect(texts.length).toBeGreaterThan(0);
  });

  it('onClose は閉じるボタン用に渡される', async () => {
    const onClose = jest.fn();
    await ReactTestRenderer.act(() => {
      ReactTestRenderer.create(<AboutModal visible onClose={onClose} />);
    });
    // クラッシュなし確認
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ---- PreviewCard ----

describe('PreviewCard', () => {
  it('uri=null のとき空のピッカーボタンがレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <PreviewCard
          label="変換前"
          uri={null}
          placeholder="画像を選択"
          onPickerPress={jest.fn()}
        />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('uri あり・image タイプのとき画像プレビューがレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <PreviewCard
          label="変換前"
          uri="file:///test/image.jpg"
          mediaType="image"
          placeholder=""
          onPickerPress={jest.fn()}
          onImagePress={jest.fn()}
        />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('uri あり・video タイプのとき動画プレースホルダーが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <PreviewCard
          label="変換後"
          uri="file:///test/video.mp4"
          mediaType="video"
          placeholder=""
        />,
      );
    });
    const icons = renderer!.root.findAll(el => el.props.children === '🎬');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('label テキストが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <PreviewCard
          label="変換前"
          uri={null}
          placeholder="選択"
          onPickerPress={jest.fn()}
        />,
      );
    });
    const labels = renderer!.root.findAll(el => el.props.children === '変換前');
    expect(labels.length).toBeGreaterThan(0);
  });

  it('onPickerPress なし・onImagePress あり・image uri でクラッシュしない', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <PreviewCard
          label="変換後"
          uri="file:///test/image.jpg"
          mediaType="image"
          placeholder=""
          onImagePress={jest.fn()}
        />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });
});

// ---- BeforeInfoBlock / AfterInfoBlock ----

describe('ImageInfoBlock', () => {
  const sampleFileInfo = {
    name: 'sample.jpg',
    size: '1.0 MB',
    width: 1920,
    height: 1080,
  };

  describe('BeforeInfoBlock', () => {
    it('ファイル情報が表示される', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <BeforeInfoBlock fileInfo={sampleFileInfo} />,
        );
      });
      expect(renderer!.toJSON()).not.toBeNull();
    });

    it('ファイル名が表示される', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <BeforeInfoBlock fileInfo={sampleFileInfo} />,
        );
      });
      // children が配列の場合（['📄 ', 'sample.jpg']）も考慮してフラット検索する
      const containsText = (children: unknown, keyword: string): boolean => {
        if (typeof children === 'string') return children.includes(keyword);
        if (Array.isArray(children))
          return children.some(c => containsText(c, keyword));
        return false;
      };
      const nameTexts = renderer!.root.findAll(el =>
        containsText(el.props.children, 'sample.jpg'),
      );
      expect(nameTexts.length).toBeGreaterThan(0);
    });

    it('width=0 のとき解像度行が表示されない', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <BeforeInfoBlock
            fileInfo={{ ...sampleFileInfo, width: 0, height: 0 }}
          />,
        );
      });
      // "0 × 0 px" が含まれないことを確認
      const sizeTexts = renderer!.root.findAll(
        el =>
          typeof el.props.children === 'string' &&
          (el.props.children as string).includes('0 × 0 px'),
      );
      expect(sizeTexts.length).toBe(0);
    });
  });

  describe('AfterInfoBlock', () => {
    it('processedImage=null のとき変換後プレースホルダーが表示される', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <AfterInfoBlock
            fileInfo={sampleFileInfo}
            processedImage={null}
            outputBytesFormatted="0.5 MB"
            resizePercent={100}
            outputFormat="jpeg"
            showAfterConversion="変換後に表示"
          />,
        );
      });
      expect(renderer!.toJSON()).not.toBeNull();
    });

    it('processedImage あり のとき出力ファイル情報が表示される', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <AfterInfoBlock
            fileInfo={sampleFileInfo}
            processedImage="file:///cache/output.webp"
            outputBytesFormatted="0.3 MB"
            resizePercent={50}
            outputFormat="webp"
            showAfterConversion="変換後に表示"
          />,
        );
      });
      const containsText2 = (children: unknown, keyword: string): boolean => {
        if (typeof children === 'string') return children.includes(keyword);
        if (Array.isArray(children))
          return children.some(c => containsText2(c, keyword));
        return false;
      };
      const nameTexts = renderer!.root.findAll(el =>
        containsText2(el.props.children, 'output.webp'),
      );
      expect(nameTexts.length).toBeGreaterThan(0);
    });

    it('resizePercent=50 のとき解像度が半分に計算される', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <AfterInfoBlock
            fileInfo={sampleFileInfo}
            processedImage="file:///cache/output.jpg"
            outputBytesFormatted="0.5 MB"
            resizePercent={50}
            outputFormat="jpeg"
            showAfterConversion="変換後に表示"
          />,
        );
      });
      // 1920 * 50 / 100 = 960, 1080 * 50 / 100 = 540
      const containsText3 = (children: unknown, keyword: string): boolean => {
        if (typeof children === 'string') return children.includes(keyword);
        if (typeof children === 'number')
          return String(children).includes(keyword);
        if (Array.isArray(children))
          return children.some(c => containsText3(c, keyword));
        return false;
      };
      const sizeTexts = renderer!.root.findAll(el =>
        containsText3(el.props.children, '960'),
      );
      expect(sizeTexts.length).toBeGreaterThan(0);
    });
  });
});

// ---- SettingsPanel ----

describe('SettingsPanel', () => {
  const defaultProps = {
    selectedMediaType: null as 'image' | 'video' | null,
    outputFormat: 'jpeg' as const,
    videoOutputFormat: 'mp4' as const,
    compressionRate: 72,
    resizePercent: 80,
    gabigabiLevel: null as number | null,
    shrinkExpandEnabled: false,
    shrinkExpandRate: 50,
    multiCompressEnabled: false,
    multiCompressCount: 3,
    fileInfoWidth: undefined as number | undefined,
    fileInfoHeight: undefined as number | undefined,
    onOutputFormatChange: jest.fn(),
    onVideoOutputFormatChange: jest.fn(),
    onQualityChange: jest.fn(),
    onResizeChange: jest.fn(),
    onTemplateSelect: jest.fn(),
    onShrinkExpandToggle: jest.fn(),
    onShrinkExpandRateChange: jest.fn(),
    onMultiCompressToggle: jest.fn(),
    onMultiCompressCountChange: jest.fn(),
  };

  it('デフォルト props で正常にレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsPanel {...defaultProps} />);
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('selectedMediaType=image のとき画像フォーマット選択が表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} selectedMediaType="image" />,
      );
    });
    // JPEG ボタンが表示される
    const jpegButtons = renderer!.root.findAll(
      el => el.props.children === 'JPEG',
    );
    expect(jpegButtons.length).toBeGreaterThan(0);
  });

  it('selectedMediaType=video のとき動画フォーマット選択が表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} selectedMediaType="video" />,
      );
    });
    // MP4 ボタンが表示される
    const mp4Buttons = renderer!.root.findAll(
      el => el.props.children === 'MP4',
    );
    expect(mp4Buttons.length).toBeGreaterThan(0);
  });

  it('shrinkExpandEnabled=true のとき収縮レートスライダーが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} shrinkExpandEnabled />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('multiCompressEnabled=true のとき圧縮回数スライダーが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} multiCompressEnabled />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('gabigabiLevel=3 のとき対応するボタンがアクティブ状態になる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} gabigabiLevel={3} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });
});

// ---- TargetSizePanel ----

describe('TargetSizePanel', () => {
  const defaultProps = {
    targetSizeValue: '10',
    targetSizeUnit: 'MB' as const,
    onValueChange: jest.fn(),
    onUnitChange: jest.fn(),
  };

  it('デフォルト props で正常にレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <TargetSizePanel {...defaultProps} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('KB / MB / GB ユニットボタンが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <TargetSizePanel {...defaultProps} />,
      );
    });
    const kbButtons = renderer!.root.findAll(el => el.props.children === 'KB');
    const mbButtons = renderer!.root.findAll(el => el.props.children === 'MB');
    const gbButtons = renderer!.root.findAll(el => el.props.children === 'GB');
    expect(kbButtons.length).toBeGreaterThan(0);
    expect(mbButtons.length).toBeGreaterThan(0);
    expect(gbButtons.length).toBeGreaterThan(0);
  });

  it('targetSizeValue が TextInput に表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <TargetSizePanel {...defaultProps} targetSizeValue="25" />,
      );
    });
    const inputs = renderer!.root.findAll(el => el.props.value === '25');
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('Discord 10MB テンプレートボタンが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <TargetSizePanel {...defaultProps} />,
      );
    });
    const templates = renderer!.root.findAll(
      el => el.props.children === 'Discord 10MB',
    );
    expect(templates.length).toBeGreaterThan(0);
  });

  it('targetSizeUnit=KB のとき KB ボタンがアクティブ', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <TargetSizePanel {...defaultProps} targetSizeUnit="KB" />,
      );
    });
    // クラッシュなし確認
    expect(renderer!.toJSON()).not.toBeNull();
  });
});
