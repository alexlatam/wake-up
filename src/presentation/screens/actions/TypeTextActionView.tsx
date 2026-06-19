import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { getRandomPhrase } from '@/domain/alarm/TextPhrases';
import type { TypeTextLevel } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';

export function TypeTextActionView({
  level,
  onComplete,
}: {
  level: TypeTextLevel;
  onComplete: () => void;
}) {
  const [phrase] = useState(() => getRandomPhrase(level));
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
    <View className="flex-1 items-center justify-center px-8">
      <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-white/40">
        Type this phrase
      </Text>
      <Text className="mb-10 text-center text-2xl font-bold leading-relaxed text-white">
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
          marginBottom: 24,
        }}
      />

      <Pressable
        onPress={handleSubmit}
        className="rounded-xl bg-white px-12 py-4 active:opacity-70"
      >
        <Text className="text-lg font-bold text-black">Confirm</Text>
      </Pressable>
    </View>
  );
}
