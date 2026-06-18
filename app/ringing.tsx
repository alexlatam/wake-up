import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { RingingScreen } from '@/presentation/screens/RingingScreen';
import { Text } from '~/components/ui/text';

export default function RingingRoute() {
  const { alarmId } = useLocalSearchParams<{ alarmId: string }>();

  if (!alarmId) {
    return (
      <View className="flex-1 items-center justify-center bg-black">
        <Text className="text-white">Sin alarma activa.</Text>
      </View>
    );
  }

  return <RingingScreen alarmId={alarmId} />;
}
