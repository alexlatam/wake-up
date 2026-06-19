import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import type { WalkLevel } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';

const TARGET_STEPS: Record<WalkLevel, number> = {
  EASY: 15,
  MEDIUM: 35,
  MAXIMUM: 100,
};

export function WalkActionView({
  level,
  onComplete,
}: {
  level: WalkLevel;
  onComplete: () => void;
}) {
  const target = TARGET_STEPS[level];
  const [steps, setSteps] = useState(0);
  const doneRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    type PedometerModule = {
      isAvailableAsync: () => Promise<boolean>;
      watchStepCount: (cb: (result: { steps: number }) => void) => { remove: () => void };
    };

    let Ped: PedometerModule | null = null;
    try {
      Ped = require('expo-sensors/build/Pedometer') as PedometerModule;
    } catch {
      return;
    }

    let sub: { remove: () => void } | null = null;

    Ped.isAvailableAsync().then((available) => {
      if (!available || doneRef.current || !Ped) return;
      sub = Ped.watchStepCount((result) => {
        if (doneRef.current) return;
        setSteps(result.steps);
        if (result.steps >= target) {
          doneRef.current = true;
          onCompleteRef.current();
        }
      });
    });

    return () => {
      sub?.remove();
    };
  }, [target]);

  const progress = Math.min(steps / target, 1);

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="mb-10 text-sm font-semibold uppercase tracking-widest text-white/40">
        Walk with your phone
      </Text>

      {/* Step counter */}
      <View className="mb-10 flex-row items-end gap-2">
        <Text className="text-8xl font-bold tabular-nums text-white">{steps}</Text>
        <Text className="mb-3 text-3xl font-bold text-white/30">/ {target}</Text>
      </View>

      {/* Progress bar */}
      <View className="w-full overflow-hidden rounded-full bg-white/10" style={{ height: 10 }}>
        <View
          className="rounded-full bg-white"
          style={{ width: `${Math.round(progress * 100)}%`, height: 10 }}
        />
      </View>

      <Text className="mt-6 text-sm text-white/30">
        Keep walking until you reach the target
      </Text>
    </View>
  );
}
