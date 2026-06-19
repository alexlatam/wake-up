import { Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { AlarmListScreen } from '@/presentation/screens/AlarmListScreen';
import { Text } from '~/components/ui/text';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push('/challenges')}
              hitSlop={12}
              className="px-1 active:opacity-60"
            >
              <Text className="text-sm font-semibold text-primary">Challenges</Text>
            </Pressable>
          ),
        }}
      />
      <AlarmListScreen />
    </>
  );
}
