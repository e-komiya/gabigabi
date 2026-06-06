/**
 * ImageInfoBlock コンポーネントのユニットテスト
 * Issue #192
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import {
  BeforeInfoBlock,
  AfterInfoBlock,
} from '../screens/components/ImageInfoBlock';

jest.mock('../i18n', () => ({
  t: (key: string) => key,
}));

const sampleFileInfo = {
  name: 'sample.jpg',
  size: '1.0 MB',
  width: 1920,
  height: 1080,
};

const containsText = (children: unknown, keyword: string): boolean => {
  if (typeof children === 'string') return children.includes(keyword);
  if (typeof children === 'number') return String(children).includes(keyword);
  if (Array.isArray(children))
    return children.some(c => containsText(c, keyword));
  return false;
};

describe('BeforeInfoBlock', () => {
  it('ファイル情報が正常にレンダリングされる', async () => {
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
    const nameTexts = renderer!.root.findAll(el =>
      containsText(el.props.children, 'sample.jpg'),
    );
    expect(nameTexts.length).toBeGreaterThan(0);
  });

  it('width=0 のとき "0 × 0 px" が表示されない', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <BeforeInfoBlock
          fileInfo={{ ...sampleFileInfo, width: 0, height: 0 }}
        />,
      );
    });
    const sizeTexts = renderer!.root.findAll(
      el =>
        typeof el.props.children === 'string' &&
        el.props.children.includes('0 × 0 px'),
    );
    expect(sizeTexts.length).toBe(0);
  });
});

describe('AfterInfoBlock', () => {
  it('processedImage=null のとき正常にレンダリングされる', async () => {
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

  it('processedImage あり のとき出力ファイル名が表示される', async () => {
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
    const nameTexts = renderer!.root.findAll(el =>
      containsText(el.props.children, 'output.webp'),
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
    // 1920 * 50 / 100 = 960
    const sizeTexts = renderer!.root.findAll(el =>
      containsText(el.props.children, '960'),
    );
    expect(sizeTexts.length).toBeGreaterThan(0);
  });
});
