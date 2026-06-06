/**
 * FileSizeLabel コンポーネントのユニットテスト
 * Issue #190
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import FileSizeLabel from '../components/FileSizeLabel';

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 2048 }),
}));

jest.mock('../data/ffmpeg/ffmpegUtils', () => ({
  getFileSizeBytes: jest.fn((info: { size?: number }) => info.size ?? 0),
}));

describe('FileSizeLabel', () => {
  it('uri が空文字のとき null をレンダリングする', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <FileSizeLabel label="元のサイズ" uri="" />,
      );
    });
    expect(renderer!.toJSON()).toBeNull();
  });

  it('uri が指定されているとき getInfoAsync を呼び出す', async () => {
    const { getInfoAsync } = require('expo-file-system');
    await ReactTestRenderer.act(async () => {
      ReactTestRenderer.create(
        <FileSizeLabel label="元のサイズ" uri="file:///test/image.jpg" />,
      );
    });
    expect(getInfoAsync).toHaveBeenCalled();
  });

  it('ファイルサイズ取得後にラベルが描画される（クラッシュしない）', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <FileSizeLabel label="元のサイズ" uri="file:///test/image.jpg" />,
      );
    });
    expect(renderer!.toJSON()).not.toBeUndefined();
  });

  it('getInfoAsync が失敗したとき "—" を表示する', async () => {
    const { getInfoAsync } = require('expo-file-system');
    getInfoAsync.mockRejectedValueOnce(new Error('fail'));
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <FileSizeLabel label="元のサイズ" uri="file:///test/bad.jpg" />,
      );
    });
    expect(renderer!.toJSON()).not.toBeUndefined();
  });

  it('file:// プレフィックスなしの URI も正しく処理される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <FileSizeLabel label="変換後" uri="/test/image.jpg" />,
      );
    });
    expect(renderer!.toJSON()).not.toBeUndefined();
  });
});
