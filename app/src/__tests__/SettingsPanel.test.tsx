/**
 * SettingsPanel コンポーネントのユニットテスト
 * Issue #192
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../../i18n', () => ({
  t: (key: string) => key,
}));

import SettingsPanel from '../screens/components/SettingsPanel';

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
  gifFps: 15,
  gifScale: 100,
  onOutputFormatChange: jest.fn(),
  onVideoOutputFormatChange: jest.fn(),
  onQualityChange: jest.fn(),
  onResizeChange: jest.fn(),
  onTemplateSelect: jest.fn(),
  onShrinkExpandToggle: jest.fn(),
  onShrinkExpandRateChange: jest.fn(),
  onMultiCompressToggle: jest.fn(),
  onMultiCompressCountChange: jest.fn(),
  onGifFpsChange: jest.fn(),
  onGifScaleChange: jest.fn(),
};

describe('SettingsPanel', () => {
  it('デフォルト props で正常にレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('selectedMediaType=image のとき JPEG フォーマットボタンが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} selectedMediaType="image" />,
      );
    });
    const jpegButtons = renderer!.root.findAll(el => el.props.children === 'JPEG');
    expect(jpegButtons.length).toBeGreaterThan(0);
  });

  it('selectedMediaType=video のとき MP4 フォーマットボタンが表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} selectedMediaType="video" />,
      );
    });
    const mp4Buttons = renderer!.root.findAll(el => el.props.children === 'MP4');
    expect(mp4Buttons.length).toBeGreaterThan(0);
  });

  it('shrinkExpandEnabled=true でクラッシュしない', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} shrinkExpandEnabled={true} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('multiCompressEnabled=true でクラッシュしない', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} multiCompressEnabled={true} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('gabigabiLevel=3 でクラッシュしない', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <SettingsPanel {...defaultProps} gabigabiLevel={3} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });
});
