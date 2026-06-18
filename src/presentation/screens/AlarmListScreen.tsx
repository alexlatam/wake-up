import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Switch, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAlarms } from '@/presentation/hooks/useAlarms';
import { useAlarmPermissions } from '@/presentation/hooks/useAlarmPermissions';
import type { Alarm } from '@/domain/alarm/Alarm';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';

const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatTime(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${period}`;
}

function formatDays(days: ReadonlySet<number>): string {
  return [...days]
    .sort()
    .map((d) => WEEKDAY_SHORT[d])
    .join(' ');
}

function AlarmItem({
  alarm,
  onToggle,
  onEdit,
  onDelete,
}: {
  alarm: Alarm;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View className="mx-4 my-2 rounded-xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between">
        <Pressable className="flex-1" onPress={onEdit}>
          <Text className="text-3xl font-bold text-foreground">
            {formatTime(alarm.schedule.hour, alarm.schedule.minute)}
          </Text>
          <Text className="mt-1 text-sm text-muted-foreground">
            {alarm.label || 'Sin nombre'}
          </Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">
            {formatDays(alarm.schedule.days)} · {alarm.actions.length}{' '}
            {alarm.actions.length === 1 ? 'reto' : 'retos'}
          </Text>
        </Pressable>
        <Switch value={alarm.enabled} onValueChange={onToggle} />
      </View>
      <View className="mt-3 flex-row justify-end gap-3">
        <Pressable onPress={onEdit}>
          <Text className="text-sm text-primary">Editar</Text>
        </Pressable>
        <Pressable onPress={onDelete}>
          <Text className="text-sm text-destructive">Eliminar</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function AlarmListScreen() {
  const router = useRouter();
  const { alarms, loading, toggle, remove, refresh: refreshAlarms } = useAlarms();
  const {
    notifications: hasNotifPermission,
    exactAlarm: hasExactAlarmPermission,
    batteryOptimized,
    requestNotifications,
    openNotificationSettings,
    openExactAlarmSettings,
    openBatterySettings,
    refresh: refreshPermissions,
  } = useAlarmPermissions();

  // true after user already dismissed the notification permission request once
  const [notifRequested, setNotifRequested] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshAlarms();
      refreshPermissions();
    }, [refreshAlarms, refreshPermissions]),
  );

  async function handleNotifBannerPress() {
    if (notifRequested) {
      // Already requested once — go straight to system settings
      await openNotificationSettings();
    } else {
      setNotifRequested(true);
      await requestNotifications();
    }
  }

  function handleDelete(id: string, label: string) {
    Alert.alert(
      'Eliminar alarma',
      `¿Eliminar "${label || 'Sin nombre'}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => remove(id) },
      ],
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Cargando…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Notification permission banner */}
      {!hasNotifPermission && (
        <Pressable
          onPress={handleNotifBannerPress}
          className="bg-destructive/10 px-4 py-3"
        >
          <Text className="text-center text-sm text-destructive">
            {notifRequested
              ? 'Las alarmas necesitan notificaciones — Abrir Ajustes →'
              : 'Activa las notificaciones para que las alarmas funcionen →'}
          </Text>
        </Pressable>
      )}

      {/* Exact alarm permission banner */}
      {!hasExactAlarmPermission && (
        <Pressable
          onPress={openExactAlarmSettings}
          className="bg-yellow-500/10 px-4 py-3"
        >
          <Text className="text-center text-sm text-yellow-600 dark:text-yellow-400">
            Permite alarmas exactas en Ajustes para mayor precisión →
          </Text>
        </Pressable>
      )}

      {/* Battery optimization banner */}
      {batteryOptimized && (
        <Pressable
          onPress={openBatterySettings}
          className="bg-orange-500/10 px-4 py-3"
        >
          <Text className="text-center text-sm text-orange-600 dark:text-orange-400">
            Desactiva la optimización de batería para que las alarmas no fallen →
          </Text>
        </Pressable>
      )}

      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-24">
            <Text className="text-lg text-muted-foreground">Sin alarmas</Text>
            <Text className="mt-1 text-sm text-muted-foreground">
              Toca + para crear una nueva
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <AlarmItem
            alarm={item}
            onToggle={() => toggle(item.id)}
            onEdit={() => router.push(`/alarm/${item.id}`)}
            onDelete={() => handleDelete(item.id, item.label)}
          />
        )}
      />
      <View className="absolute bottom-8 right-6">
        <Button
          className="h-16 w-16 rounded-full shadow-lg"
          onPress={() => router.push('/alarm/new')}
        >
          <Text className="text-2xl font-light text-primary-foreground">+</Text>
        </Button>
      </View>
    </View>
  );
}
