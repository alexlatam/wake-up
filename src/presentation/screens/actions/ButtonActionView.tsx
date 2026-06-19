import { Pressable, View } from 'react-native';
import { Text } from '~/components/ui/text';

export function ButtonActionView({ onComplete }: { onComplete: () => void }) {
  return (
    <View className="flex-1 items-center justify-center">
      <Pressable
        onPress={onComplete}
        className="h-52 w-52 items-center justify-center rounded-full bg-white shadow-2xl active:opacity-80"
      >
        <Text className="text-center text-xl font-bold text-black leading-tight">
          {'Turn off'}
        </Text>
      </Pressable>
    </View>
  );
}
