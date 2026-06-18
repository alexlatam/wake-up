import notifee, { EventType } from '@notifee/react-native';

// Registered at JS entry time so it runs even when the app is killed.
notifee.onBackgroundEvent(async ({ type, detail }) => {
  if (type === EventType.ACTION_PRESS && detail.pressAction?.id === 'dismiss') {
    if (detail.notification?.id) {
      await notifee.cancelNotification(detail.notification.id);
    }
  }
});
