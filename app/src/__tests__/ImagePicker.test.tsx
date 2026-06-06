/**
 * ImagePicker コンポーネントのユニットテスト
 * Issue #191
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import ImagePicker from '../components/ImagePicker';

jest.mock('../i18n', () => ({
  t: (key: string) => key,
}));

jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest
    .fn()
    .mockResolvedValue({ status: 'granted' }),
  launchImageLibraryAsync: jest.fn().mockResolvedValue({ canceled: true }),
}));

describe('ImagePicker', () => {
  it('selectedImage なしで正常にレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImagePicker onImageSelect={jest.fn()} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('selectedImage あり・image タイプでレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImagePicker
          onImageSelect={jest.fn()}
          selectedImage="file:///test/image.jpg"
          selectedMediaType="image"
        />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('selectedMediaType=video のとき動画アイコン 🎬 が表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImagePicker
          onImageSelect={jest.fn()}
          selectedImage="file:///test/video.mp4"
          selectedMediaType="video"
        />,
      );
    });
    const icons = renderer!.root.findAll(el => el.props.children === '🎬');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('selectedMediaType=image のとき画像アイコン 🖼️ が表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImagePicker
          onImageSelect={jest.fn()}
          selectedImage="file:///test/image.jpg"
          selectedMediaType="image"
        />,
      );
    });
    const icons = renderer!.root.findAll(el => el.props.children === '🖼️');
    expect(icons.length).toBeGreaterThan(0);
  });

  it('ボタンの accessibilityRole が "button"', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImagePicker onImageSelect={jest.fn()} />,
      );
    });
    const buttons = renderer!.root.findAll(
      node => node.props.accessibilityRole === 'button',
    );
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('launchImageLibraryAsync がキャンセルしたとき onImageSelect は呼ばれない', async () => {
    const onImageSelect = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImagePicker onImageSelect={onImageSelect} />,
      );
    });
    const button = renderer!.root.find(
      node => node.props.accessibilityRole === 'button',
    );
    await ReactTestRenderer.act(async () => {
      await button.props.onPress();
    });
    expect(onImageSelect).not.toHaveBeenCalled();
  });
});
