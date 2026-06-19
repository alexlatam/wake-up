import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Text } from '~/components/ui/text';
import type { ActionType } from '@/domain/alarm/Action';

type ChallengeCard = {
  type: ActionType;
  icon: string;
  name: string;
  tagline: string;
  preview: string;
};

const CHALLENGES: ChallengeCard[] = [
  {
    type: 'BUTTON',
    icon: '🔴',
    name: 'Quick Dismiss',
    tagline: 'One tap. Alarm off.',
    preview: 'A single large button. Press it to silence the alarm. No tricks, no math — just direct control.',
  },
  {
    type: 'MATH',
    icon: '🧮',
    name: 'Math Challenge',
    tagline: 'Solve to silence.',
    preview: 'A math problem appears. Solve it correctly to dismiss. Wrong answer resets the field — try again.',
  },
  {
    type: 'PUZZLE',
    icon: '🧩',
    name: 'Image Puzzle',
    tagline: 'Reassemble to rise.',
    preview: 'Your photo is cut into tiles and scrambled. Tap two tiles to swap them. Restore the image to dismiss.',
  },
  {
    type: 'TYPE_TEXT',
    icon: '⌨️',
    name: 'Type Text',
    tagline: 'Write it to wake up.',
    preview: 'A phrase appears on screen. Type it exactly to dismiss the alarm. Longer phrases at higher difficulty.',
  },
  {
    type: 'SHAKE',
    icon: '📳',
    name: 'Shake',
    tagline: 'Move to dismiss.',
    preview: 'Shake your phone continuously for a set duration. The timer only counts while you are actually shaking.',
  },
  {
    type: 'WALK',
    icon: '🚶',
    name: 'Walk',
    tagline: 'Step to silence.',
    preview: 'Walk a set number of steps with your phone in hand. The pedometer counts every step you take.',
  },
];

export function ChallengesScreen() {
  const router = useRouter();

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
    >
      <Text className="mb-2 text-2xl font-bold text-foreground">Challenges</Text>
      <Text className="mb-8 text-sm text-muted-foreground">
        Each alarm can have one or more challenges. Tap one to learn how it works.
      </Text>

      {CHALLENGES.map((c) => (
        <Pressable
          key={c.type}
          onPress={() => router.push(`/challenges/${c.type}`)}
          className="mb-5 rounded-2xl border border-border bg-card p-5 active:opacity-75"
        >
          <View className="flex-row items-start gap-4">
            <Text className="text-4xl">{c.icon}</Text>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">{c.name}</Text>
              <Text className="mb-2 text-sm font-medium text-primary">{c.tagline}</Text>
              <Text className="text-sm leading-relaxed text-muted-foreground">{c.preview}</Text>
            </View>
          </View>
          <View className="mt-4 flex-row justify-end">
            <Text className="text-sm font-semibold text-primary">See details →</Text>
          </View>
        </Pressable>
      ))}
    </ScrollView>
  );
}
