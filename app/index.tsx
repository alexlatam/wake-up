import { Pressable, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { AlarmListScreen } from '@/presentation/screens/AlarmListScreen';
import { Text } from '~/components/ui/text';
import { useDrawer } from '@/presentation/components/AppDrawer';
import { useAlarmPermissions } from '@/presentation/hooks/useAlarmPermissions';

function HamburgerButton() {
  const { open } = useDrawer();
  return (
    <Pressable
      onPress={open}
      hitSlop={12}
      style={{ paddingHorizontal: 4 }}
    >
      <Text style={{ fontSize: 22, color: '#e8f5e8', lineHeight: 26 }}>☰</Text>
    </Pressable>
  );
}

function PermissionsIcon() {
  const { notifications, exactAlarm, batteryOptimized, fullScreenIntent } = useAlarmPermissions();
  const hasIssue = !notifications || !exactAlarm || batteryOptimized || !fullScreenIntent;

  return (
    <Pressable hitSlop={12} style={{ padding: 4, position: 'relative' }}>
      <Text style={{ fontSize: 18, color: '#e8f5e8', lineHeight: 22 }}>ⓘ</Text>
      {hasIssue && (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 2,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: '#ef4444',
          }}
        />
      )}
    </Pressable>
  );
}

function HeaderRight() {
  const router = useRouter();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginRight: 4 }}>
      <PermissionsIcon />
      <Pressable
        onPress={() => router.push('/challenges')}
        hitSlop={12}
        style={{ padding: 4 }}
      >
        <Text style={{ fontSize: 18, lineHeight: 22 }}>⚡</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push('/settings')}
        hitSlop={12}
        style={{ padding: 4 }}
      >
        <Text style={{ fontSize: 18, color: '#e8f5e8', lineHeight: 22 }}>⚙️</Text>
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => <HamburgerButton />,
          headerRight: () => <HeaderRight />,
        }}
      />
      <AlarmListScreen />
    </>
  );
}
