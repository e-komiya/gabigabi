import {renderHook, act} from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  scheduleNotificationAsync: jest.fn(),
  dismissNotificationAsync: jest.fn(),
  AndroidImportance: {DEFAULT: 3},
}));

const mockGetPermissions = Notifications.getPermissionsAsync as jest.Mock;
const mockRequestPermissions = Notifications.requestPermissionsAsync as jest.Mock;
const mockSchedule = Notifications.scheduleNotificationAsync as jest.Mock;
const mockDismiss = Notifications.dismissNotificationAsync as jest.Mock;

import {useProcessingNotification} from '../hooks/useProcessingNotification';

describe('useProcessingNotification', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPermissions.mockResolvedValue({granted: true});
    mockRequestPermissions.mockResolvedValue({granted: true});
    mockSchedule.mockResolvedValue('notification-id-123');
    mockDismiss.mockResolvedValue(undefined);
  });

  describe('notifyProcessingStarted', () => {
    it('権限がある場合は通知をスケジュールすること', async () => {
      const {result} = renderHook(() => useProcessingNotification());
      let id: string | null = null;
      await act(async () => {
        id = await result.current.notifyProcessingStarted('処理を開始しました');
      });
      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({body: '処理を開始しました'}),
        }),
      );
      expect(id).toBe('notification-id-123');
    });

    it('権限がない場合は null を返すこと', async () => {
      mockGetPermissions.mockResolvedValue({granted: false});
      mockRequestPermissions.mockResolvedValue({granted: false});
      const {result} = renderHook(() => useProcessingNotification());
      let id: string | null | undefined;
      await act(async () => {
        id = await result.current.notifyProcessingStarted('処理を開始しました');
      });
      expect(mockSchedule).not.toHaveBeenCalled();
      expect(id).toBeNull();
    });

    it('すでに権限がある場合は requestPermissionsAsync を呼ばないこと', async () => {
      mockGetPermissions.mockResolvedValue({granted: true});
      const {result} = renderHook(() => useProcessingNotification());
      await act(async () => {
        await result.current.notifyProcessingStarted('テスト');
      });
      expect(mockRequestPermissions).not.toHaveBeenCalled();
    });
  });

  describe('notifyProcessingUpdate', () => {
    it('既存通知IDがある場合は dismiss してから新しい通知をスケジュールすること', async () => {
      const {result} = renderHook(() => useProcessingNotification());
      await act(async () => {
        await result.current.notifyProcessingUpdate('更新しました', 'old-id');
      });
      expect(mockDismiss).toHaveBeenCalledWith('old-id');
      expect(mockSchedule).toHaveBeenCalled();
    });

    it('既存通知IDがない場合は dismiss しないこと', async () => {
      const {result} = renderHook(() => useProcessingNotification());
      await act(async () => {
        await result.current.notifyProcessingUpdate('更新しました');
      });
      expect(mockDismiss).not.toHaveBeenCalled();
    });

    it('権限がない場合は既存IDをそのまま返すこと', async () => {
      mockGetPermissions.mockResolvedValue({granted: false});
      mockRequestPermissions.mockResolvedValue({granted: false});
      const {result} = renderHook(() => useProcessingNotification());
      let returnedId: string | null | undefined;
      await act(async () => {
        returnedId = await result.current.notifyProcessingUpdate('更新', 'existing-id');
      });
      expect(mockSchedule).not.toHaveBeenCalled();
      expect(returnedId).toBe('existing-id');
    });
  });

  describe('notifyProcessingResult', () => {
    it('完了通知をスケジュールすること', async () => {
      const {result} = renderHook(() => useProcessingNotification());
      await act(async () => {
        await result.current.notifyProcessingResult('完了しました');
      });
      expect(mockSchedule).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'GabiGabi',
            body: '完了しました',
          }),
        }),
      );
    });

    it('既存通知IDがある場合は dismiss してから完了通知を出すこと', async () => {
      const {result} = renderHook(() => useProcessingNotification());
      await act(async () => {
        await result.current.notifyProcessingResult('完了', 'active-id');
      });
      expect(mockDismiss).toHaveBeenCalledWith('active-id');
      expect(mockSchedule).toHaveBeenCalled();
    });

    it('権限がない場合は何もしないこと', async () => {
      mockGetPermissions.mockResolvedValue({granted: false});
      mockRequestPermissions.mockResolvedValue({granted: false});
      const {result} = renderHook(() => useProcessingNotification());
      await act(async () => {
        await result.current.notifyProcessingResult('完了しました');
      });
      expect(mockSchedule).not.toHaveBeenCalled();
    });
  });
});
