import '../global.css';
import { useEffect, useState } from 'react';
import { ActivityIndicator, useColorScheme, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import notifee, { EventType } from '@notifee/react-native';
import { initContainer, getContainer } from '@/infrastructure/di/container';
import { db } from '@/infrastructure/persistence/drizzle/client';
import { initDatabase } from '@/infrastructure/persistence/drizzle/migrations';
import { SqliteAlarmRepository } from '@/infrastructure/persistence/SqliteAlarmRepository';
import { SqliteAlarmSessionRepository } from '@/infrastructure/persistence/SqliteAlarmSessionRepository';
import { NotifeeNotificationScheduler } from '@/infrastructure/notifications/NotifeeNotificationScheduler';
import { SyncAlarms } from '@/application/use-cases/SyncAlarms';
import { SystemClock } from '@/infrastructure/system/SystemClock';
import { UuidGenerator } from '@/infrastructure/system/UuidGenerator';

// Approximate hex values for HSL CSS vars in global.css
const COLORS = {
  light: { bg: '#ffffff', text: '#09090f' },
  dark: { bg: '#09090b', text: '#fafafa' },
};

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? COLORS.dark : COLORS.light;

  // Initialise persistence, DI, sync alarms.
  useEffect(() => {
    const alarmRepository = new SqliteAlarmRepository(db);
    const notificationScheduler = new NotifeeNotificationScheduler();

    initDatabase()
      .then(async () => {
        initContainer({
          alarmRepository,
          alarmSessionRepository: new SqliteAlarmSessionRepository(db),
          notificationScheduler,
          clock: new SystemClock(),
          idGenerator: new UuidGenerator(),
        });

        await new SyncAlarms(alarmRepository, notificationScheduler).execute();

        setReady(true);
      })
      .catch(console.error);
  }, []);

  // After ready: handle alarm that fired while app was closed, or recover interrupted session.
  useEffect(() => {
    if (!ready) return;

    notifee.getInitialNotification().then(async (initial) => {
      const alarmId = initial?.notification.data?.alarmId;
      if (typeof alarmId === 'string') {
        router.replace(`/ringing?alarmId=${alarmId}`);
        return;
      }

      // No launch notification — check for interrupted session (app killed mid-challenge)
      const { alarmSessionRepository } = getContainer();
      const active = await alarmSessionRepository.findActive();
      if (active) {
        router.replace(`/ringing?alarmId=${active.alarmId}`);
      }
    });

    // Navigate to ringing screen when alarm fires with app in foreground.
    const unsub = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.DELIVERED) {
        const alarmId = detail.notification?.data?.alarmId;
        if (typeof alarmId === 'string') {
          router.push(`/ringing?alarmId=${alarmId}`);
        }
      }
    });

    return () => unsub();
  }, [ready, router]);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="dark flex-1">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0a160c' },
          headerTintColor: '#e8f5e8',
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0a160c' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'WakeUp' }} />
        <Stack.Screen name="alarm/[id]" options={{ title: 'Alarm' }} />
        <Stack.Screen
          name="ringing"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
