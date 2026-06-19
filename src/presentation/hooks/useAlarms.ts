import { useCallback, useEffect, useState } from 'react';
import { getContainer } from '@/infrastructure/di/container';
import { ListAlarms } from '@/application/use-cases/ListAlarms';
import { CreateAlarm, type CreateAlarmInput } from '@/application/use-cases/CreateAlarm';
import { UpdateAlarm, type UpdateAlarmInput } from '@/application/use-cases/UpdateAlarm';
import { DeleteAlarm } from '@/application/use-cases/DeleteAlarm';
import { ToggleAlarm } from '@/application/use-cases/ToggleAlarm';
import { SyncAlarms } from '@/application/use-cases/SyncAlarms';
import type { Alarm } from '@/domain/alarm/Alarm';

export function useAlarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const { alarmRepository } = getContainer();
      const result = await new ListAlarms(alarmRepository).execute();
      setAlarms(result);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sync = useCallback(async () => {
    const { alarmRepository, notificationScheduler } = getContainer();
    await new SyncAlarms(alarmRepository, notificationScheduler).execute();
  }, []);

  const create = useCallback(
    async (input: CreateAlarmInput) => {
      const { alarmRepository, idGenerator, clock } = getContainer();
      await new CreateAlarm(alarmRepository, idGenerator, clock).execute(input);
      await sync();
      await refresh();
    },
    [sync, refresh],
  );

  const update = useCallback(
    async (input: UpdateAlarmInput) => {
      const { alarmRepository, clock } = getContainer();
      await new UpdateAlarm(alarmRepository, clock).execute(input);
      await sync();
      await refresh();
    },
    [sync, refresh],
  );

  const toggle = useCallback(
    async (id: string) => {
      setAlarms(prev => prev.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
      const { alarmRepository } = getContainer();
      await new ToggleAlarm(alarmRepository).execute(id);
      await sync();
      await refresh();
    },
    [sync, refresh],
  );

  const remove = useCallback(
    async (id: string) => {
      const { alarmRepository } = getContainer();
      await new DeleteAlarm(alarmRepository).execute(id);
      await sync();
      await refresh();
    },
    [sync, refresh],
  );

  const getById = useCallback((id: string) => {
    return alarms.find((a) => a.id === id) ?? null;
  }, [alarms]);

  return { alarms, loading, error, create, update, toggle, remove, refresh, getById };
}
