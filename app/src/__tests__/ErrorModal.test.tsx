/**
 * ErrorModal コンポーネントのユニットテスト
 * Issue #190
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';

import ErrorModal from '../components/ErrorModal';

jest.mock('../i18n', () => ({
  t: (key: string) => key,
}));
jest.mock('expo-clipboard', () => ({
  setStringAsync: jest.fn().mockResolvedValue(undefined),
}));

describe('ErrorModal', () => {
  it('visible=true のとき正常にレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ErrorModal
          visible
          message="テストエラーメッセージ"
          onClose={jest.fn()}
        />,
      );
    });
    expect(renderer!.toJSON()).not.toBeNull();
  });

  it('visible=false のとき Modal は閉じた状態でレンダリングされる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ErrorModal
          visible={false}
          message="テストエラーメッセージ"
          onClose={jest.fn()}
        />,
      );
    });
    expect(renderer!.toJSON()).toBeNull();
  });

  it('カスタム title が表示される', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ErrorModal
          visible
          title="カスタムタイトル"
          message="エラー内容"
          onClose={jest.fn()}
        />,
      );
    });
    const texts = renderer!.root.findAll(
      el => el.props.children === 'カスタムタイトル',
    );
    expect(texts.length).toBeGreaterThan(0);
  });

  it('message テキストが表示される', async () => {
    const msg = 'エラー詳細メッセージ';
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ErrorModal visible message={msg} onClose={jest.fn()} />,
      );
    });
    const texts = renderer!.root.findAll(el => el.props.children === msg);
    expect(texts.length).toBeGreaterThan(0);
  });

  it('title を省略すると t("error") がデフォルトタイトルになる', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ErrorModal visible message="エラー" onClose={jest.fn()} />,
      );
    });
    // t('error') → 'error' (モック)
    const texts = renderer!.root.findAll(el => el.props.children === 'error');
    expect(texts.length).toBeGreaterThan(0);
  });
});
