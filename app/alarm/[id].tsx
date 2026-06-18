import { useLocalSearchParams } from 'expo-router';
import { AlarmEditScreen } from '@/presentation/screens/AlarmEditScreen';

export default function AlarmEditRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <AlarmEditScreen alarmId={id === 'new' ? null : id} />;
}
