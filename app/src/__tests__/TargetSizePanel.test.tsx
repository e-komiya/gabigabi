/**
 * TargetSizePanel コンポーネントのユニットテスト
 * Issue #192
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../../i18n', () => ({
  t: (key: string) => key,
}));

import TargetSizePanel from '../screens/components/TargetSizePanel';

const defaultProps = {
  targetSizeValue: '10',
  targetSizeUnit: 'MB' as const,
  onValueChange: jest.fn(),
  onUnitChange: jest.fn(),
};

describe('TargetSizePanel', () => {
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
    const templates = renderer!.root.findAll(el => el.props.children === 'Discord 10MB');
    expect(templates.length).toBeGreaterThan(0);
  });

  it('targetSizeUnit=KB でクラッシュしない', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <TargetSizePanel {...defaultProps} targetSizeUnit="KB" />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });
});
