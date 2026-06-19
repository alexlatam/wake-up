import { useEffect, useRef } from 'react';
import { BackHandler, Pressable, StatusBar, Vibration, View } from 'react-native';
import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { VolumeManager } from 'react-native-volume-manager';
import { getContainer } from '@/infrastructure/di/container';
import { useSessionStore } from '@/presentation/stores/sessionStore';
import { useAlarmSession } from '@/presentation/hooks/useAlarmSession';
import { ButtonActionView } from './actions/ButtonActionView';
import { MathActionView } from './actions/MathActionView';
import { PuzzleActionView } from './actions/PuzzleActionView';
import { Text } from '~/components/ui/text';

const DEFAULT_ALARM_SOURCE = require('@/../assets/sounds/wake-up.mp3');

export function RingingScreen({ alarmId }: { alarmId: string }) {
  const router = useRouter();
  const player = useAudioPlayer(null);
  const savedVolume = useRef<number>(1);
  const { session, alarm, loading, error, currentAction, completeAction, dismissAlarm } =
    useAlarmSession(alarmId);

  // Keep the screen on while solving challenges.
  useKeepAwake();

  // Signal globally that an alarm is actively ringing so _layout skips duplicate navigation.
  useEffect(() => {
    useSessionStore.getState().setRinging(true);
    return () => useSessionStore.getState().setRinging(false);
  }, []);

  // Block hardware back button.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // Lock volume at maximum — user cannot lower it while alarm rings.
  useEffect(() => {
    VolumeManager.getVolume().then(({ volume }) => {
      savedVolume.current = volume;
    });
    VolumeManager.showNativeVolumeUI({ enabled: false });
    VolumeManager.setVolume(1.0);

    const sub = VolumeManager.addVolumeListener(() => {
      VolumeManager.setVolume(1.0);
    });

    return () => {
      sub.remove();
      VolumeManager.showNativeVolumeUI({ enabled: true });
      VolumeManager.setVolume(savedVolume.current);
    };
  }, []);

  // Start audio + vibration loop once alarm data is available.
  useEffect(() => {
    if (loading) return;
    setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true });
    const source = alarm?.ringtoneUri ? { uri: alarm.ringtoneUri } : DEFAULT_ALARM_SOURCE;
    player.replace(source);
    player.loop = true;
    player.play();
    // 0ms initial delay, 800ms on, 600ms off — loops until Vibration.cancel().
    Vibration.vibrate([0, 800, 600], true);
    return () => {
      try { player.pause(); } catch (_) {}
      Vibration.cancel();
    };
  // run once alarm data resolves
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function handleActionComplete() {
    const updated = await completeAction();
    if (updated?.isDismissed()) {
      player.pause();
      Vibration.cancel();
      await dismissAlarm();
      // Release ringing flag before checking queue so _layout doesn't race.
      useSessionStore.getState().setRinging(false);
      const { alarmSessionRepository } = getContainer();
      const next = await alarmSessionRepository.findActive();
      if (next) {
        router.replace(`/ringing?alarmId=${next.alarmId}`);
      } else {
        router.replace('/');
      }
    }
  }

  const timeLabel = alarm
    ? `${String(alarm.schedule.hour).padStart(2, '0')}:${String(alarm.schedule.minute).padStart(2, '0')}`
    : '--:--';

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-black px-8">
        <StatusBar barStyle="light-content" backgroundColor="black" />
        <Text className="text-center text-base text-white/70">
          Failed to load alarm session
        </Text>
        <Pressable
          onPress={() => { player.pause(); Vibration.cancel(); router.replace('/'); }}
          className="rounded-full bg-white/20 px-8 py-4"
        >
          <Text className="text-base font-semibold text-white">Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" backgroundColor="black" />

      {/* Header */}
      <View className="items-center px-4 pb-4 pt-12">
        <Text className="text-4xl font-bold text-white">{timeLabel}</Text>
        {alarm?.label ? (
          <Text className="mt-1 text-base text-white/60">{alarm.label}</Text>
        ) : null}
        {session ? (
          <Text className="mt-2 text-sm text-white/40">
            Challenge {session.currentIndex + 1} of {session.totalActions}
          </Text>
        ) : null}
      </View>

      {/* Action area */}
      <View className="flex-1">
        {loading && (
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/50">Loading…</Text>
          </View>
        )}

        {!loading && currentAction?.type === 'BUTTON' && (
          <ButtonActionView onComplete={handleActionComplete} />
        )}

        {!loading && currentAction?.type === 'MATH' && (
          <MathActionView level={currentAction.level} onComplete={handleActionComplete} />
        )}

        {!loading && currentAction?.type === 'PUZZLE' && (
          <PuzzleActionView
            level={currentAction.level}
            imageUri={currentAction.imageUri}
            onComplete={handleActionComplete}
          />
        )}
      </View>
    </View>
  );
}
