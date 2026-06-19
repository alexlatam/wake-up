import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Switch, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAlarms } from '@/presentation/hooks/useAlarms';
import { useAlarmPermissions } from '@/presentation/hooks/useAlarmPermissions';
import type { Alarm } from '@/domain/alarm/Alarm';
import { Text } from '~/components/ui/text';

const WEEKDAY_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function formatTime(hour: number, minute: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const h = hour % 12 || 12;
  const m = String(minute).padStart(2, '0');
  return `${h}:${m} ${period}`;
}

function formatDays(days: ReadonlySet<number>): string {
  const sorted = [...days].sort();
  if (sorted.length === 7) return 'Every day';
  if (sorted.length === 5 && !sorted.includes(0) && !sorted.includes(6)) return 'Weekdays';
  if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) return 'Weekends';
  return sorted.map((d) => WEEKDAY_SHORT[d]).join(' · ');
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
    <Pressable
      onPress={onEdit}
      className="mx-4 my-2 rounded-2xl border border-border bg-card p-5 active:opacity-80"
    >
      <View className="flex-row items-start justify-between">
        <View className="flex-1">
          <Text className={`text-5xl font-bold tracking-tight ${alarm.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
            {formatTime(alarm.schedule.hour, alarm.schedule.minute)}
          </Text>
          <Text className={`mt-1.5 text-base font-medium ${alarm.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
            {alarm.label || 'Alarm'}
          </Text>
          <Text className="mt-0.5 text-sm text-muted-foreground">
            {formatDays(alarm.schedule.days)}
          </Text>
          <View className="mt-3 flex-row items-center gap-1.5">
            {alarm.actions.map((a, i) => (
              <View
                key={i}
                className="rounded-md bg-muted px-2 py-0.5"
              >
                <Text className="text-xs font-medium text-muted-foreground">{a.type}</Text>
              </View>
            ))}
          </View>
        </View>
        <View className="items-end gap-3">
          <Switch
            value={alarm.enabled}
            onValueChange={onToggle}
          />
          <Pressable
            onPress={onDelete}
            hitSlop={12}
            className="rounded-full bg-destructive/10 p-2"
          >
            <Text className="text-xs text-destructive">✕</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}

function PermissionBanner({
  message,
  onPress,
  variant = 'red',
}: {
  message: string;
  onPress: () => void;
  variant?: 'red' | 'yellow' | 'orange';
}) {
  const colors = {
    red: 'bg-destructive/10 border-destructive/20',
    yellow: 'bg-yellow-500/10 border-yellow-500/20',
    orange: 'bg-orange-500/10 border-orange-500/20',
  };
  const textColors = {
    red: 'text-destructive',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    orange: 'text-orange-600 dark:text-orange-400',
  };

  return (
    <Pressable
      onPress={onPress}
      className={`mx-4 mt-3 flex-row items-center gap-3 rounded-xl border px-4 py-3 ${colors[variant]} active:opacity-70`}
    >
      <Text className={`flex-1 text-sm font-medium ${textColors[variant]}`}>{message}</Text>
      <Text className={`text-sm font-semibold ${textColors[variant]}`}>Fix →</Text>
    </Pressable>
  );
}

export function AlarmListScreen() {
  const router = useRouter();
  const { alarms, loading, toggle, remove, refresh: refreshAlarms } = useAlarms();
  const {
    notifications: hasNotifPermission,
    exactAlarm: hasExactAlarmPermission,
    requestNotifications,
    openNotificationSettings,
    openExactAlarmSettings,
    refresh: refreshPermissions,
  } = useAlarmPermissions();

  const [notifRequested, setNotifRequested] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshAlarms();
      refreshPermissions();
    }, [refreshAlarms, refreshPermissions]),
  );

  async function handleNotifBannerPress() {
    if (notifRequested) {
      await openNotificationSettings();
    } else {
      setNotifRequested(true);
      await requestNotifications();
    }
  }

  function handleDelete(id: string, label: string) {
    Alert.alert(
      'Delete Alarm',
      `Delete "${label || 'Alarm'}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => remove(id) },
      ],
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-muted-foreground">Loading…</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      {/* Permission banners */}
      {!hasNotifPermission && (
        <PermissionBanner
          variant="red"
          message="Enable notifications so alarms can fire"
          onPress={handleNotifBannerPress}
        />
      )}
      {!hasExactAlarmPermission && (
        <PermissionBanner
          variant="yellow"
          message="Allow exact alarms for precise timing"
          onPress={openExactAlarmSettings}
        />
      )}


      <FlatList
        data={alarms}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-32">
            <Text className="text-5xl">⏰</Text>
            <Text className="mt-5 text-xl font-semibold text-foreground">No alarms yet</Text>
            <Text className="mt-2 text-sm text-muted-foreground">Tap + to create your first alarm</Text>
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

      {/* FAB */}
      <View className="absolute bottom-8 right-6">
        <Pressable
          onPress={() => router.push('/alarm/new')}
          className="h-16 w-16 items-center justify-center rounded-full bg-primary shadow-lg active:opacity-80"
        >
          <Text className="text-3xl font-light text-primary-foreground">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
