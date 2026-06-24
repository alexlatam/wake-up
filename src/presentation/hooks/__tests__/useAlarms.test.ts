import { renderHook, act, waitFor } from '@testing-library/react-native';
import { initContainer } from '@/infrastructure/di/container';
import { Alarm } from '@/domain/alarm/Alarm';
import { Schedule } from '@/domain/alarm/Schedule';
import { useAlarms } from '../useAlarms';

// NOTE: CreateAlarmInput / UpdateAlarmInput not imported — hook tests exercise the
// integration path through initContainer, not the use-case constructors directly.

const NOW = new Date('2026-01-01T07:00:00.000Z');

function makeAlarm(id = 'alarm-1', enabled = true): Alarm {
  return new Alarm({
    id,
    label: 'Test',
    schedule: new Schedule([1], 7, 0),
    enabled,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: NOW,
    updatedAt: NOW,
    ringtoneUri: null,
  });
}

function makeContainer(alarmsToReturn: Alarm[] = []) {
  const alarmRepository = {
    findAll: jest.fn().mockResolvedValue(alarmsToReturn),
    findById: jest.fn().mockResolvedValue(alarmsToReturn[0] ?? null),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const alarmSessionRepository = {
    findByAlarmId: jest.fn().mockResolvedValue(null),
    findById: jest.fn().mockResolvedValue(null),
    findActive: jest.fn().mockResolvedValue(null),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const notificationScheduler = {
    schedule: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    cancelAll: jest.fn().mockResolvedValue(undefined),
  };
  const clock = { now: jest.fn().mockReturnValue(NOW) };
  const idGenerator = { generate: jest.fn().mockReturnValue('new-id') };

  initContainer({
    alarmRepository: alarmRepository as never,
    alarmSessionRepository: alarmSessionRepository as never,
    notificationScheduler: notificationScheduler as never,
    clock,
    idGenerator,
  });

  return { alarmRepository, alarmSessionRepository, notificationScheduler, clock, idGenerator };
}

describe('useAlarms', () => {
  beforeEach(() => {
    makeContainer();
  });

  describe('initial state', () => {
    it('starts with loading=true, empty alarms array, and null error', async () => {
      // Stall findAll so we can inspect the synchronous initial state before the
      // useEffect resolves.
      const { alarmRepository } = makeContainer();
      let resolveLoad!: (v: Alarm[]) => void;
      (alarmRepository.findAll as jest.Mock).mockReturnValue(
        new Promise<Alarm[]>((res) => { resolveLoad = res; }),
      );

      const { result } = await renderHook(() => useAlarms());

      expect(result.current.loading).toBe(true);
      expect(result.current.alarms).toEqual([]);
      expect(result.current.error).toBeNull();

      // Clean up: resolve the pending promise so timers / warnings don't leak
      await act(async () => { resolveLoad([]); });
    });
  });

  describe('after mount (useEffect fires)', () => {
    it('sets loading=false and populates alarms from findAll', async () => {
      const alarm = makeAlarm();
      makeContainer([alarm]);

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.alarms).toHaveLength(1);
      expect(result.current.alarms[0].id).toBe('alarm-1');
      expect(result.current.error).toBeNull();
    });

    it('renders with no alarms when findAll resolves empty', async () => {
      makeContainer([]);

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.alarms).toEqual([]);
    });
  });

  describe('refresh on error', () => {
    it('sets error string and sets loading=false when findAll rejects', async () => {
      const { alarmRepository } = makeContainer();
      (alarmRepository.findAll as jest.Mock).mockRejectedValue(new Error('network failure'));

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('network failure');
      expect(result.current.alarms).toEqual([]);
    });
  });

  describe('error cleared on next successful refresh', () => {
    it('clears error string after a failing refresh is followed by a successful one', async () => {
      const alarm = makeAlarm();
      const { alarmRepository } = makeContainer();
      (alarmRepository.findAll as jest.Mock).mockRejectedValueOnce(new Error('temporary error'));

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.error).toContain('temporary error');
      });

      (alarmRepository.findAll as jest.Mock).mockResolvedValue([alarm]);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.alarms).toHaveLength(1);
    });
  });

  describe('create', () => {
    it('calls save then sync (cancelAll, schedule) then refresh; alarms updated', async () => {
      const alarm = makeAlarm('new-id');
      const { alarmRepository, notificationScheduler } = makeContainer([alarm]);

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callOrder: string[] = [];
      (alarmRepository.save as jest.Mock).mockImplementation(async () => {
        callOrder.push('save');
      });
      (notificationScheduler.cancelAll as jest.Mock).mockImplementation(async () => {
        callOrder.push('cancelAll');
      });
      (notificationScheduler.schedule as jest.Mock).mockImplementation(async () => {
        callOrder.push('schedule');
      });
      (alarmRepository.findAll as jest.Mock).mockImplementation(async () => {
        callOrder.push('findAll');
        return [alarm];
      });

      await act(async () => {
        await result.current.create({
          label: 'Test',
          days: [1],
          hour: 7,
          minute: 0,
          actions: [{ type: 'BUTTON', position: 0 }],
        });
      });

      expect(callOrder[0]).toBe('save');
      expect(callOrder).toContain('cancelAll');
      expect(callOrder).toContain('findAll');
      expect(result.current.alarms).toHaveLength(1);
      expect(result.current.alarms[0].id).toBe('new-id');
    });
  });

  describe('update', () => {
    it('calls save then sync then refresh', async () => {
      const alarm = makeAlarm();
      const { alarmRepository, notificationScheduler } = makeContainer([alarm]);
      (alarmRepository.findById as jest.Mock).mockResolvedValue(alarm);

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callOrder: string[] = [];
      (alarmRepository.save as jest.Mock).mockImplementation(async () => {
        callOrder.push('save');
      });
      (notificationScheduler.cancelAll as jest.Mock).mockImplementation(async () => {
        callOrder.push('cancelAll');
      });
      (alarmRepository.findAll as jest.Mock).mockImplementation(async () => {
        callOrder.push('findAll');
        return [alarm];
      });

      await act(async () => {
        await result.current.update({
          id: 'alarm-1',
          label: 'Updated',
          days: [1],
          hour: 8,
          minute: 30,
          actions: [{ type: 'BUTTON', position: 0 }],
        });
      });

      expect(callOrder[0]).toBe('save');
      expect(callOrder).toContain('cancelAll');
      expect(callOrder).toContain('findAll');
    });
  });

  describe('toggle', () => {
    it('optimistic update: final state reflects the flipped enabled value', async () => {
      const alarm = makeAlarm('alarm-1', true);
      const { alarmRepository } = makeContainer([alarm]);
      (alarmRepository.findById as jest.Mock).mockResolvedValue(alarm);
      const flipped = makeAlarm('alarm-1', false);
      (alarmRepository.findAll as jest.Mock)
        .mockResolvedValueOnce([alarm])  // initial load
        .mockResolvedValue([flipped]);   // after toggle refresh

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.toggle('alarm-1');
      });

      expect(result.current.alarms[0].enabled).toBe(false);
    });

    // BUG: toggle optimistic update not reverted on sync failure —
    // alarm stays flipped in UI even after error
    it('BUG: reverts optimistic flip when sync (cancelAll) throws', async () => {
      const alarm = makeAlarm('alarm-1', true);
      const { alarmRepository, notificationScheduler } = makeContainer([alarm]);
      (alarmRepository.findById as jest.Mock).mockResolvedValue(alarm);
      (alarmRepository.findAll as jest.Mock).mockResolvedValue([alarm]);
      (notificationScheduler.cancelAll as jest.Mock).mockRejectedValue(
        new Error('scheduler unavailable'),
      );

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        try {
          await result.current.toggle('alarm-1');
        } catch {
          // expected — sync threw
        }
      });

      // DESIRED: alarm reverts to enabled=true after sync failure
      // WILL FAIL (red): current code leaves the optimistic flip in place
      expect(result.current.alarms[0].enabled).toBe(true);
    });
  });

  describe('remove', () => {
    it('calls delete then sync then refresh; alarm removed from state', async () => {
      const alarm = makeAlarm();
      const { alarmRepository, notificationScheduler } = makeContainer([alarm]);

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const callOrder: string[] = [];
      (alarmRepository.delete as jest.Mock).mockImplementation(async () => {
        callOrder.push('delete');
      });
      (notificationScheduler.cancelAll as jest.Mock).mockImplementation(async () => {
        callOrder.push('cancelAll');
      });
      (alarmRepository.findAll as jest.Mock).mockImplementation(async () => {
        callOrder.push('findAll');
        return [];
      });

      await act(async () => {
        await result.current.remove('alarm-1');
      });

      expect(callOrder[0]).toBe('delete');
      expect(callOrder).toContain('cancelAll');
      expect(callOrder).toContain('findAll');
      expect(result.current.alarms).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('returns the alarm matching the given id from in-memory list', async () => {
      const a1 = makeAlarm('alarm-1');
      const a2 = makeAlarm('alarm-2');
      makeContainer([a1, a2]);

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const found = result.current.getById('alarm-2');
      expect(found).not.toBeNull();
      expect(found?.id).toBe('alarm-2');
    });

    it('returns null for an unknown id', async () => {
      makeContainer([makeAlarm('alarm-1')]);

      const { result } = await renderHook(() => useAlarms());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.getById('ghost-id')).toBeNull();
    });
  });
});
