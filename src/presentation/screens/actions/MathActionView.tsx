import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { generateMath } from '@/domain/alarm/MathGenerator';
import type { MathLevel } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';

export function MathActionView({
  level,
  onComplete,
}: {
  level: MathLevel;
  onComplete: () => void;
}) {
  const [problem] = useState(() => generateMath(level));
  const [answer, setAnswer] = useState('');
  const [shake, setShake] = useState(false);

  function handleSubmit() {
    const parsed = parseInt(answer.trim(), 10);
    if (!isNaN(parsed) && parsed === problem.answer) {
      onComplete();
      return;
    }
    setShake(true);
    setAnswer('');
    setTimeout(() => setShake(false), 600);
  }

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="mb-12 text-6xl font-bold text-white">{problem.question}</Text>

      <TextInput
        value={answer}
        onChangeText={setAnswer}
        keyboardType="numeric"
        returnKeyType="done"
        autoFocus
        onSubmitEditing={handleSubmit}
        placeholder="?"
        placeholderTextColor="rgba(255,255,255,0.3)"
        style={{
          borderRadius: 12,
          backgroundColor: shake ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.15)',
          paddingHorizontal: 24,
          paddingVertical: 16,
          fontSize: 36,
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
        <Text className="text-lg font-bold text-black">Confirmar</Text>
      </Pressable>
    </View>
  );
}
