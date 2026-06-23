import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput } from 'react-native';
import { getRandomPhrase, getCustomPhrase } from '@/domain/alarm/TextPhrases';
import type { TypeTextLevel } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';

export function TypeTextActionView({
  level,
  customWordCount,
  onComplete,
}: {
  level: TypeTextLevel;
  customWordCount?: number;
  onComplete: () => void;
}) {
  const [phrase] = useState(() =>
    level === 'CUSTOM' ? getCustomPhrase(customWordCount ?? 15) : getRandomPhrase(level),
  );
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);

  function handleSubmit() {
    if (input.trim() === phrase) {
      onComplete();
      return;
    }
    setShake(true);
    setInput('');
    setTimeout(() => setShake(false), 600);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
      keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: 32,
          paddingTop: 64,
          paddingBottom: 32,
          gap: 32,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-center text-sm font-semibold uppercase tracking-widest text-white/40">
          Type this phrase
        </Text>
        <Text className="text-center text-2xl font-bold leading-relaxed text-white">
          {phrase}
        </Text>

        <TextInput
          value={input}
          onChangeText={setInput}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          placeholder="Type here…"
          placeholderTextColor="rgba(255,255,255,0.3)"
          style={{
            borderRadius: 12,
            backgroundColor: shake ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.15)',
            paddingHorizontal: 24,
            paddingVertical: 16,
            fontSize: 20,
            color: 'white',
            textAlign: 'center',
            width: '100%',
          }}
        />

        <Pressable
          onPress={handleSubmit}
          style={{ alignItems: 'center' }}
          className="rounded-xl bg-white px-12 py-4 active:opacity-70"
        >
          <Text className="text-lg font-bold text-black">Confirm</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
