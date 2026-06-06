import * as Notifications from 'expo-notifications';
import { useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

export const useProcessingNotification = () => {
  const ensureNotificationPermission = useCallback(async () => {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const requested = await Notifications.requestPermissionsAsync();
    return requested.granted;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    Notifications.setNotificationChannelAsync('processing-status', {
      name: '処理ステータス',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4CAF50',
    }).catch(() => {
      // ignore
    });
  }, []);

  const notifyProcessingStarted = useCallback(
    async (body: string) => {
      const granted = await ensureNotificationPermission();
      if (!granted) return null;
      return Notifications.scheduleNotificationAsync({
        content: {
          title: 'GabiGabi',
          body,
          sound: false,
          ...(Platform.OS === 'android'
            ? {
                channelId: 'processing-status',
                sticky: true,
                autoDismiss: false,
              }
            : {}),
        },
        trigger: null,
      });
    },
    [ensureNotificationPermission],
  );

  const notifyProcessingUpdate = useCallback(
    async (body: string, activeNotificationId?: string | null) => {
      const granted = await ensureNotificationPermission();
      if (!granted) return activeNotificationId ?? null;
      if (activeNotificationId) {
        await Notifications.dismissNotificationAsync(
          activeNotificationId,
        ).catch(() => {});
      }
      return Notifications.scheduleNotificationAsync({
        content: {
          title: 'GabiGabi',
          body,
          sound: false,
          ...(Platform.OS === 'android'
            ? {
                channelId: 'processing-status',
                sticky: true,
                autoDismiss: false,
              }
            : {}),
        },
        trigger: null,
      });
    },
    [ensureNotificationPermission],
  );

  const notifyProcessingResult = useCallback(
    async (body: string, activeNotificationId?: string | null) => {
      const granted = await ensureNotificationPermission();
      if (!granted) return;
      if (activeNotificationId) {
        await Notifications.dismissNotificationAsync(
          activeNotificationId,
        ).catch(() => {});
      }
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'GabiGabi',
          body,
          sound: false,
          ...(Platform.OS === 'android'
            ? { channelId: 'processing-status' }
            : {}),
        },
        trigger: null,
      });
    },
    [ensureNotificationPermission],
  );

  return {
    notifyProcessingStarted,
    notifyProcessingUpdate,
    notifyProcessingResult,
  };
};
