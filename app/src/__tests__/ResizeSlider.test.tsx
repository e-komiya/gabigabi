/**
 * ResizeSlider コンポーネントのユニットテスト
 * Issue #191
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../i18n', () => ({
  t: (key: string) => key,
}));

import ResizeSlider from '../components/ResizeSlider';

describe('ResizeSlider', () => {
  it('originalWidth/Height なしで正常にレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ResizeSlider value={50} onValueChange={jest.fn()} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('originalWidth/Height ありで解像度タブが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ResizeSlider
          value={50}
          onValueChange={jest.fn()}
          originalWidth={1920}
          originalHeight={1080}
        />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('value=100 でクラッシュしない', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ResizeSlider
          value={100}
          onValueChange={jest.fn()}
          originalWidth={800}
          originalHeight={600}
        />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('value=1 でクラッシュしない', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ResizeSlider value={1} onValueChange={jest.fn()} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('パーセントタブの accessibilityRole が "tab" である', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ResizeSlider value={50} onValueChange={jest.fn()} />,
      );
    });
    const tabs = renderer!.root.findAll(
      node => node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function',
    );
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('初期状態でパーセントタブの accessibilityState.selected が true', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ResizeSlider value={50} onValueChange={jest.fn()} />,
      );
    });
    const percentTab = renderer!.root.findAll(
      node => node.props.accessibilityRole === 'tab' && typeof node.props.onPress === 'function',
    )[0];
    expect(percentTab.props.accessibilityState).toEqual(
      expect.objectContaining({selected: true}),
    );
  });

  it('originalWidth/Height あり: 解像度タブの accessibilityRole が "tab"', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ResizeSlider
          value={50}
          onValueChange={jest.fn()}
          originalWidth={1920}
          originalHeight={1080}
        />,
      );
    });
    const resolutionTab = renderer!.root.findAll(
      node =>
        node.props.accessibilityRole === 'tab' &&
        node.props.accessibilityLabel === 'resizeResolutionTab',
    );
    expect(resolutionTab.length).toBeGreaterThan(0);
  });

  it('タブ切り替え後に selected が更新される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ResizeSlider
          value={50}
          onValueChange={jest.fn()}
          originalWidth={1920}
          originalHeight={1080}
        />,
      );
    });
    const instance = renderer!.root;
    const findPercentTab = () =>
      instance.findAll(
        node =>
          node.props.accessibilityRole === 'tab' &&
          node.props.accessibilityLabel === 'resizePercentTab',
      )[0];
    const findResolutionTab = () =>
      instance.findAll(
        node =>
          node.props.accessibilityRole === 'tab' &&
          node.props.accessibilityLabel === 'resizeResolutionTab',
      )[0];

    expect(findPercentTab().props.accessibilityState).toEqual(
      expect.objectContaining({selected: true}),
    );
    expect(findResolutionTab().props.accessibilityState).toEqual(
      expect.objectContaining({selected: false}),
    );

    await ReactTestRenderer.act(() => {
      findResolutionTab().props.onPress();
    });

    expect(findPercentTab().props.accessibilityState).toEqual(
      expect.objectContaining({selected: false}),
    );
    expect(findResolutionTab().props.accessibilityState).toEqual(
      expect.objectContaining({selected: true}),
    );
  });
});
