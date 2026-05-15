/**
 * ImageModal コンポーネントのユニットテスト
 * Issue #190
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

jest.mock('../i18n', () => ({
  t: (key: string) => key,
}));

import ImageModal from '../components/ImageModal';

describe('ImageModal', () => {
  it('uri=null のとき null をレンダリングする', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImageModal uri={null} visible={false} onClose={jest.fn()} />,
      );
    });
    expect(renderer!.toJSON()).toBeNull();
  });

  it('uri と visible=true のとき正常にレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImageModal
          uri="file:///test/image.jpg"
          visible={true}
          onClose={jest.fn()}
        />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('visible=false のとき Modal は閉じた状態', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImageModal
          uri="file:///test/image.jpg"
          visible={false}
          onClose={jest.fn()}
        />,
      );
    });
    expect(renderer!.toJSON()).toBeNull();
  });

  it('onClose コールバックが関数として渡せる', async () => {
    const onClose = jest.fn();
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ImageModal uri="file:///test/image.jpg" visible={true} onClose={onClose} />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });
});
