import { renderHook, act } from '@testing-library/react-native';
import { Animated } from 'react-native';

import { useSaveFeedback } from '../hooks/useSaveFeedback';

// Animated をモックして同期的に動作させる
jest.useFakeTimers();

describe('useSaveFeedback', () => {
  let sequenceCallback: Animated.EndCallback | undefined;

  beforeEach(() => {
    jest.clearAllTimers();
    sequenceCallback = undefined;
    jest.spyOn(Animated, 'sequence').mockImplementation(_animations => ({
      start: (callback?: Animated.EndCallback) => {
        // コールバックを保持するが即時呼ばない（アニメーション中を模倣）
        sequenceCallback = callback;
      },
      reset: () => {},
      stop: () => {},
    }));
    jest.spyOn(Animated, 'timing').mockImplementation(() => ({
      start: () => {},
      reset: () => {},
      stop: () => {},
    }));
    jest.spyOn(Animated, 'delay').mockImplementation(() => ({
      start: () => {},
      reset: () => {},
      stop: () => {},
    }));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('初期状態では saveMessage が null であること', () => {
    const { result } = renderHook(() => useSaveFeedback());
    expect(result.current.saveMessage).toBeNull();
  });

  it('saveMessageOpacity が Animated.Value であること', () => {
    const { result } = renderHook(() => useSaveFeedback());
    expect(result.current.saveMessageOpacity).toBeInstanceOf(Animated.Value);
  });

  it('showSaveFeedback 呼び出し後に saveMessage が設定されること', () => {
    const { result } = renderHook(() => useSaveFeedback());
    act(() => {
      result.current.showSaveFeedback('保存しました');
    });
    expect(result.current.saveMessage).toBe('保存しました');
  });

  it('アニメーション完了後に saveMessage が null にリセットされること', () => {
    const { result } = renderHook(() => useSaveFeedback());
    act(() => {
      result.current.showSaveFeedback('テストメッセージ');
    });
    expect(result.current.saveMessage).toBe('テストメッセージ');
    // アニメーション完了コールバックを手動で呼ぶ
    act(() => {
      if (sequenceCallback) sequenceCallback({ finished: true });
    });
    expect(result.current.saveMessage).toBeNull();
  });

  it('showSaveFeedback を複数回呼んでも最後のメッセージが設定されること', () => {
    const { result } = renderHook(() => useSaveFeedback());
    act(() => {
      result.current.showSaveFeedback('最初');
    });
    act(() => {
      result.current.showSaveFeedback('次のメッセージ');
    });
    expect(result.current.saveMessage).toBe('次のメッセージ');
  });
});
