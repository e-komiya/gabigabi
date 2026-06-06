/**
 * AboutModal コンポーネントのユニットテスト
 * Issue #192
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import AboutModal from '../screens/components/AboutModal';

jest.mock('../i18n', () => ({
  t: (key: string) => key,
}));

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
    expect(onClose).not.toHaveBeenCalled();
  });
});
