/**
 * CustomSlider コンポーネントのユニットテスト
 * Issue #87
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import CustomSlider from '../components/CustomSlider';

describe('CustomSlider', () => {
  const defaultProps = {
    minimumValue: 0,
    maximumValue: 100,
    value: 50,
    onValueChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('レンダリング', () => {
    it('デフォルト props で正常にレンダリングされる', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(<CustomSlider {...defaultProps} />);
      });
      expect(renderer!.toJSON()).not.toBeNull();
    });

    it('accessibilityRole が "adjustable" である', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider
            {...defaultProps}
            accessibilityLabel="テストスライダー"
          />,
        );
      });
      const instance = renderer!.root;
      const container = instance.findAll(
        el => el.props.accessibilityRole === 'adjustable',
      );
      expect(container.length).toBeGreaterThan(0);
    });

    it('accessibilityValue に min/max/now が反映される', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider
            minimumValue={0}
            maximumValue={200}
            value={75}
            onValueChange={jest.fn()}
          />,
        );
      });
      const instance = renderer!.root;
      const el = instance.find(e => e.props.accessibilityRole === 'adjustable');
      expect(el.props.accessibilityValue).toEqual({
        min: 0,
        max: 200,
        now: 75,
      });
    });

    it('値が変更されると accessibilityValue.now が更新される', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      const onValueChange = jest.fn();
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider
            minimumValue={0}
            maximumValue={100}
            value={30}
            onValueChange={onValueChange}
          />,
        );
      });
      await ReactTestRenderer.act(() => {
        renderer!.update(
          <CustomSlider
            minimumValue={0}
            maximumValue={100}
            value={80}
            onValueChange={onValueChange}
          />,
        );
      });
      const instance = renderer!.root;
      const el = instance.find(e => e.props.accessibilityRole === 'adjustable');
      expect(el.props.accessibilityValue).toEqual({
        min: 0,
        max: 100,
        now: 80,
      });
    });

    it('accessibilityLabel が props から反映される', async () => {
      const label = 'リサイズスライダー';
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider {...defaultProps} accessibilityLabel={label} />,
        );
      });
      const instance = renderer!.root;
      const el = instance.find(e => e.props.accessibilityLabel === label);
      expect(el).toBeTruthy();
    });
  });

  describe('value に応じたスタイル', () => {
    it('value=0 のときクラッシュしない', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider {...defaultProps} value={0} />,
        );
      });
      expect(renderer!.toJSON()).not.toBeNull();
    });

    it('value=maximumValue のときクラッシュしない', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider {...defaultProps} value={100} />,
        );
      });
      expect(renderer!.toJSON()).not.toBeNull();
    });

    it('minimumValue === maximumValue のとき NaN にならずレンダリングされる', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider
            minimumValue={50}
            maximumValue={50}
            value={50}
            onValueChange={jest.fn()}
          />,
        );
      });
      expect(renderer!.toJSON()).not.toBeNull();
    });
  });

  describe('カスタムカラー', () => {
    it('minimumTrackTintColor / maximumTrackTintColor / thumbTintColor が反映される', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider
            {...defaultProps}
            minimumTrackTintColor="#00ff00"
            maximumTrackTintColor="#0000ff"
            thumbTintColor="#ff0000"
          />,
        );
      });
      // thumb の backgroundColor は thumbTintColor
      const thumb = renderer!.root.findAll(
        el =>
          el.props.style && JSON.stringify(el.props.style).includes('#ff0000'),
      );
      expect(thumb.length).toBeGreaterThan(0);
    });
  });

  describe('step プロパティ', () => {
    it('step=10 で正常にレンダリングされる', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider
            minimumValue={0}
            maximumValue={100}
            step={10}
            value={50}
            onValueChange={jest.fn()}
          />,
        );
      });
      expect(renderer!.toJSON()).not.toBeNull();
    });

    it('step=0 でもクラッシュしない', async () => {
      let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
      await ReactTestRenderer.act(() => {
        renderer = ReactTestRenderer.create(
          <CustomSlider {...defaultProps} step={0} />,
        );
      });
      expect(renderer!.toJSON()).not.toBeNull();
    });
  });
});
