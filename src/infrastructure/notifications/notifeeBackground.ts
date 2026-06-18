import notifee, { EventType } from '@notifee/react-native';
import { StartAlarmSession } from '@/application/use-cases/StartAlarmSession';

// Registered at JS entry time so it runs even when the app is killed.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.DELIVERED) {
    const alarmId = detail.notification?.data?.alarmId;
    if (typeof alarmId === 'string') {
      // App is running in background — container is initialized, start the session
      // so findActive() can navigate to RingingScreen when the app comes to foreground.
      // If app is killed (headless), getContainer() throws and we skip — cold launch handles it.
      try {
        const { getContainer } = require('@/infrastructure/di/container') as typeof import('@/infrastructure/di/container');
        const { alarmRepository, alarmSessionRepository, idGenerator, clock } = getContainer();
        await new StartAlarmSession(alarmRepository, alarmSessionRepository, idGenerator, clock).execute(alarmId);
      } catch {
        // Headless context: container not initialized. Cold launch via full-screen intent will handle it.
      }
    }
  }

  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'dismiss') {
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
  }
});
