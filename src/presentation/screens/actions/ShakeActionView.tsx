import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { ShakeLevel } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';

const DURATION_SECONDS: Record<Exclude<ShakeLevel, 'CUSTOM'>, number> = {
  EASY: 3,
  MEDIUM: 10,
  MAXIMUM: 30,
  EXTREME: 120,
};

const SHAKE_THRESHOLD = 1.2;
const TICK_MS = 100;

export function ShakeActionView({
  level,
  customSeconds,
  onComplete,
}: {
  level: ShakeLevel;
  customSeconds?: number;
  onComplete: () => void;
}) {
  const required = level === 'CUSTOM' ? (customSeconds ?? 30) : DURATION_SECONDS[level];
  const totalTenths = required * 10;

  const [elapsed, setElapsed] = useState(0);
  const elapsedRef = useRef(0);
  const lastMagRef = useRef(1);
  const lastShakeAt = useRef(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Lazy require so the module error doesn't crash the whole app
    // before a native rebuild is done with expo-sensors.
    let Accel: typeof import('expo-sensors/build/Accelerometer').default | null = null;
    try {
      Accel = require('expo-sensors/build/Accelerometer').default;
    } catch {
      return;
    }

    Accel.setUpdateInterval(TICK_MS);

    const sub = Accel.addListener(({ x, y, z }: { x: number; y: number; z: number }) => {
      const mag = Math.sqrt(x * x + y * y + z * z);
      const delta = Math.abs(mag - lastMagRef.current);
      lastMagRef.current = mag;

      const now = Date.now();
      if (delta > SHAKE_THRESHOLD) lastShakeAt.current = now;

      const isShaking = now - lastShakeAt.current < 300;

      if (isShaking && !doneRef.current) {
        elapsedRef.current = Math.min(elapsedRef.current + 1, totalTenths);
        setElapsed(elapsedRef.current);

        if (elapsedRef.current >= totalTenths) {
          doneRef.current = true;
          onCompleteRef.current();
        }
      }
    });

    return () => sub.remove();
  }, [totalTenths]);

  const secondsElapsed = Math.floor(elapsed / 10);
  const progress = elapsed / totalTenths;

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="mb-10 text-sm font-semibold uppercase tracking-widest text-white/40">
        Shake your phone
      </Text>

      <View className="mb-10 flex-row items-end gap-2">
        <Text className="text-8xl font-bold tabular-nums text-white">{secondsElapsed}</Text>
        <Text className="mb-3 text-3xl font-bold text-white/30">/ {required}s</Text>
      </View>

      <View className="w-full overflow-hidden rounded-full bg-white/10" style={{ height: 10 }}>
        <View
          className="rounded-full bg-white"
          style={{ width: `${Math.round(progress * 100)}%`, height: 10 }}
        />
      </View>

      <Text className="mt-6 text-sm text-white/30">
        Keep shaking until the timer completes
      </Text>
    </View>
  );
}
