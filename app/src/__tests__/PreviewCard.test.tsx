/**
 * PreviewCard コンポーネントのユニットテスト
 * Issue #192
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../../i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('react-native-svg', () => {
  const React = require('react');
  return {
    Svg: ({children}: {children: React.ReactNode}) => React.createElement('Svg', null, children),
    Path: () => null,
    Rect: () => null,
    G: () => null,
  };
});

import PreviewCard from '../screens/components/PreviewCard';

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

  it('uri あり・image タイプのとき正常にレンダリングされる', async () => {
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

  it('uri あり・video タイプのとき 🎬 アイコンが表示される', async () => {
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
});
