import { ScrollView, View } from 'react-native';
import { Text } from '~/components/ui/text';
import { useTranslation } from '@/presentation/i18n/LanguageContext';
import type { ActionType } from '@/domain/alarm/Action';

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

function HowItWorksStep({ index, text }: { index: number; text: string }) {
  return (
    <View className="mb-3 flex-row gap-3">
      <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-primary/20">
        <Text className="text-xs font-bold text-primary">{index}</Text>
      </View>
      <Text className="flex-1 text-sm leading-relaxed text-foreground">{text}</Text>
    </View>
  );
}

function LevelBadge({ row }: { row: { label: string; sublabel: string; description: string } }) {
  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <View className="mb-1 flex-row items-center gap-2">
        <Text className="text-base font-bold text-foreground">{row.label}</Text>
        <View className="rounded-md bg-muted px-2 py-0.5">
          <Text className="text-xs font-medium text-muted-foreground">{row.sublabel}</Text>
        </View>
      </View>
      <Text className="text-sm leading-relaxed text-muted-foreground">{row.description}</Text>
    </View>
  );
}

export function ChallengeDetailScreen({ type }: { type: ActionType }) {
  const { t } = useTranslation();
  const detail = t.challengeDetail.details[type];

  if (!detail) return null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      {/* Hero */}
      <View className="mb-6 items-center py-8">
        <Text className="mb-3 text-7xl">{CHALLENGE_ICONS[type]}</Text>
        <Text className="text-3xl font-bold text-foreground">{detail.name}</Text>
        <Text className="mt-1 text-base font-medium text-primary">{detail.tagline}</Text>
      </View>

      {/* Description */}
      <View className="mb-6 rounded-2xl border border-border bg-card p-5">
        <Text className="text-base leading-7 text-foreground">{detail.description}</Text>
      </View>

      {/* How it works */}
      <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t.challengeDetail.howItWorks}
      </Text>
      <View className="mb-6">
        {detail.howItWorks.map((step, i) => (
          <HowItWorksStep key={i} index={i + 1} text={step} />
        ))}
      </View>

      {/* Difficulty levels */}
      {detail.levels && detail.levels.length > 0 && (
        <>
          <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {t.challengeDetail.difficultyLevels}
          </Text>
          <View className="mb-6">
            {detail.levels.map((level) => (
              <LevelBadge key={level.sublabel} row={level} />
            ))}
          </View>
        </>
      )}

      {/* Tip */}
      {detail.tip && (
        <View className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Text className="text-sm leading-relaxed text-primary">{detail.tip}</Text>
        </View>
      )}
    </ScrollView>
  );
}
