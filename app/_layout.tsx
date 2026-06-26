import '../global.css';
import { useEffect, useRef, useState } from 'react';
import { AppState, ActivityIndicator, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import notifee, { EventType } from '@notifee/react-native';
import { initContainer, getContainer } from '@/infrastructure/di/container';
import { useSessionStore } from '@/presentation/stores/sessionStore';
import { db } from '@/infrastructure/persistence/drizzle/client';
import { initDatabase } from '@/infrastructure/persistence/drizzle/migrations';
import { SqliteAlarmRepository } from '@/infrastructure/persistence/SqliteAlarmRepository';
import { SqliteAlarmSessionRepository } from '@/infrastructure/persistence/SqliteAlarmSessionRepository';
import { NotifeeNotificationScheduler } from '@/infrastructure/notifications/NotifeeNotificationScheduler';
import { SyncAlarms } from '@/application/use-cases/SyncAlarms';
import { SystemClock } from '@/infrastructure/system/SystemClock';
import { UuidGenerator } from '@/infrastructure/system/UuidGenerator';
import { LanguageProvider, useTranslation } from '@/presentation/i18n/LanguageContext';
import { DrawerProvider, DrawerMenu } from '@/presentation/components/AppDrawer';

function AppContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    notifee.getInitialNotification().then(async (initial) => {
      const alarmId = initial?.notification.data?.alarmId;
      if (typeof alarmId === 'string') {
        router.replace(`/ringing?alarmId=${alarmId}`);
        return;
      }

      const { alarmSessionRepository } = getContainer();
      const active = await alarmSessionRepository.findActive();
      if (active) {
        router.replace(`/ringing?alarmId=${active.alarmId}`);
      }
    });

    const unsub = notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.DELIVERED) {
        const alarmId = detail.notification?.data?.alarmId;
        if (typeof alarmId === 'string' && !useSessionStore.getState().isRinging) {
          router.push(`/ringing?alarmId=${alarmId}`);
        }
      }
    });

    const appStateSub = AppState.addEventListener('change', async (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        if (!useSessionStore.getState().isRinging) {
          const { alarmSessionRepository } = getContainer();
          const active = await alarmSessionRepository.findActive();
          if (active) {
            router.replace(`/ringing?alarmId=${active.alarmId}`);
          }
        }
      }
      appState.current = nextState;
    });

    return () => {
      unsub();
      appStateSub.remove();
    };
  }, [router]);

  return (
    <GestureHandlerRootView className="dark flex-1">
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0a160c' },
          headerTintColor: '#e8f5e8',
          headerShadowVisible: false,
          headerTitleAlign: 'left',
          contentStyle: { backgroundColor: '#0a160c' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{ title: t.nav.alarms }}
        />
        <Stack.Screen name="alarm/[id]" options={{ title: t.nav.alarm }} />
        <Stack.Screen name="challenges/index" options={{ title: t.nav.challenges }} />
        <Stack.Screen name="challenges/[type]" options={{ title: t.nav.challenge }} />
        <Stack.Screen name="quick-alarm" options={{ title: t.nav.quickAlarm }} />
        <Stack.Screen name="settings" options={{ title: t.settings.title }} />
        <Stack.Screen
          name="ringing"
          options={{
            headerShown: false,
            gestureEnabled: false,
            animation: 'fade',
          }}
        />
      </Stack>
      <DrawerMenu />
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);

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

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <LanguageProvider>
      <DrawerProvider>
        <AppContent />
      </DrawerProvider>
    </LanguageProvider>
  );
}
