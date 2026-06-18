import { useCallback, useEffect, useState } from 'react';
import { getContainer } from '@/infrastructure/di/container';
import { StartAlarmSession } from '@/application/use-cases/StartAlarmSession';
import { CompleteAction } from '@/application/use-cases/CompleteAction';
import { DismissAlarm } from '@/application/use-cases/DismissAlarm';
import type { AlarmSession } from '@/domain/alarm/AlarmSession';
import type { Alarm } from '@/domain/alarm/Alarm';
import type { ActionConfig } from '@/domain/alarm/Action';

export function useAlarmSession(alarmId: string) {
  const [session, setSession] = useState<AlarmSession | null>(null);
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { alarmRepository, alarmSessionRepository, idGenerator, clock } = getContainer();
    Promise.all([
      alarmRepository.findById(alarmId),
      new StartAlarmSession(alarmRepository, alarmSessionRepository, idGenerator, clock).execute(alarmId),
    ])
      .then(([foundAlarm, newSession]) => {
        setAlarm(foundAlarm);
        setSession(newSession);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [alarmId]);

  const completeAction = useCallback(async (): Promise<AlarmSession | null> => {
    if (!session) return null;
    const { alarmSessionRepository } = getContainer();
    const updated = await new CompleteAction(alarmSessionRepository).execute(session.id);
    setSession(updated);
    return updated;
  }, [session]);

  const dismissAlarm = useCallback(async () => {
    const { alarmRepository, notificationScheduler } = getContainer();
    await new DismissAlarm(alarmRepository, notificationScheduler).execute(alarmId);
  }, [alarmId]);

  const currentAction: ActionConfig | null =
    alarm && session ? (alarm.actions[session.currentIndex] ?? null) : null;

  return { session, alarm, loading, error, currentAction, completeAction, dismissAlarm };
}
