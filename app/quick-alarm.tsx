import { useState } from 'react';
import { Alert, FlatList, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAlarms } from '@/presentation/hooks/useAlarms';
import { useTranslation } from '@/presentation/i18n/LanguageContext';
import { Text } from '~/components/ui/text';
import type { Weekday } from '@/domain/alarm/Action';

const OPTIONS = [
  { label: '1m', minutes: 1 },
  { label: '5m', minutes: 5 },
  { label: '15m', minutes: 15 },
  { label: '30m', minutes: 30 },
  { label: '45m', minutes: 45 },
  { label: '1h', minutes: 60 },
  { label: '2h', minutes: 120 },
  { label: '4h', minutes: 240 },
  { label: '8h', minutes: 480 },
  { label: '12h', minutes: 720 },
  { label: '24h', minutes: 1440 },
];

export default function QuickAlarmScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { create } = useAlarms();
  const [creating, setCreating] = useState<string | null>(null);

  async function handleSelect(option: (typeof OPTIONS)[number]) {
    if (creating) return;
    setCreating(option.label);
    try {
      const now = new Date();
      const target = new Date(now.getTime() + option.minutes * 60 * 1000);
      await create({
        label: `Quick ${option.label}`,
        days: [target.getDay() as Weekday],
        hour: target.getHours(),
        minute: target.getMinutes(),
        actions: [{ type: 'BUTTON', position: 0 }],
        ringtoneUri: null,
        vibrationEnabled: true,
        flashlightEnabled: false,
      });
      router.back();
    } catch (e) {
      Alert.alert('Error', String(e));
      setCreating(null);
    }
  }

  return (
    <View className="flex-1 bg-background px-4 pt-6">
      <Text className="mb-4 text-sm text-muted-foreground">{t.quickAlarm.subtitle}</Text>
      <FlatList
        data={OPTIONS}
        numColumns={3}
        keyExtractor={(item) => item.label}
        scrollEnabled={false}
        columnWrapperStyle={{ gap: 12 }}
        contentContainerStyle={{ gap: 12 }}
        renderItem={({ item }) => {
          const isLoading = creating === item.label;
          return (
            <Pressable
              onPress={() => handleSelect(item)}
              disabled={!!creating}
              className={`h-24 flex-1 items-center justify-center rounded-2xl border ${
                isLoading
                  ? 'border-primary bg-primary/20'
                  : 'border-border bg-card active:opacity-70'
              }`}
            >
              <Text
                className={`text-2xl font-bold ${
                  isLoading ? 'text-primary' : 'text-foreground'
                }`}
              >
                {isLoading ? t.quickAlarm.creating : item.label}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}
