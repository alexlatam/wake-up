import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import { useTranslation } from '@/presentation/i18n/LanguageContext';
import type { ActionType } from '@/domain/alarm/Action';

const CHALLENGE_TYPES: ActionType[] = [
  'BUTTON',
  'MATH',
  'PUZZLE',
  'TYPE_TEXT',
  'SHAKE',
  'WALK',
];

const CHALLENGE_ICONS: Record<string, string> = {
  BUTTON: '🔴',
  MATH: '🧮',
  PUZZLE: '🧩',
  TYPE_TEXT: '⌨️',
  SHAKE: '📳',
  WALK: '🚶',
  QR_CODE: '📷',
  NFC: '📡',
  PHOTO_MATCH: '📸',
};

export function ChallengesScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      <Text className="mb-2 text-2xl font-bold text-foreground">{t.challenges.title}</Text>
      <Text className="mb-8 text-sm text-muted-foreground">
        {t.challenges.subtitle}
      </Text>

      {CHALLENGE_TYPES.map((type) => {
        const card = t.challenges.cards[type];
        if (!card) return null;
        return (
          <Pressable
            key={type}
            onPress={() => router.push(`/challenges/${type}`)}
            className="mb-5 rounded-2xl border border-border bg-card p-5 active:opacity-75"
          >
            <View className="flex-row items-start gap-4">
              <Text className="text-4xl">{CHALLENGE_ICONS[type]}</Text>
              <View className="flex-1">
                <Text className="text-xl font-bold text-foreground">{card.name}</Text>
                <Text className="mb-2 text-sm font-medium text-primary">{card.tagline}</Text>
                <Text className="text-sm leading-relaxed text-muted-foreground">{card.preview}</Text>
              </View>
            </View>
            <View className="mt-4 flex-row justify-end">
              <Text className="text-sm font-semibold text-primary">{t.challenges.seeDetails}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
