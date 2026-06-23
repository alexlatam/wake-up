import { ScrollView, View, Pressable } from 'react-native';
import { Text } from '~/components/ui/text';
import { useTranslation } from '@/presentation/i18n/LanguageContext';

export function SettingsScreen() {
  const { t, language, setLanguage } = useTranslation();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
    >
      <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {t.settings.language}
      </Text>
      <View className="overflow-hidden rounded-2xl border border-border bg-card">
        <Pressable
          onPress={() => setLanguage('en')}
          className="flex-row items-center justify-between px-4 py-3.5 active:opacity-70"
        >
          <Text className="text-sm font-medium text-foreground">{t.settings.english}</Text>
          {language === 'en' && (
            <Text className="text-base font-bold text-primary">✓</Text>
          )}
        </Pressable>
        <View className="mx-4 h-px bg-border" />
        <Pressable
          onPress={() => setLanguage('es')}
          className="flex-row items-center justify-between px-4 py-3.5 active:opacity-70"
        >
          <Text className="text-sm font-medium text-foreground">{t.settings.spanish}</Text>
          {language === 'es' && (
            <Text className="text-base font-bold text-primary">✓</Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
}
