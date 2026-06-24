import { Alarm } from '@/domain/alarm/Alarm';
import { AlarmSession } from '@/domain/alarm/AlarmSession';
import { Schedule } from '@/domain/alarm/Schedule';
import { initContainer } from '@/infrastructure/di/container';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAlarmSession } from '../useAlarmSession';
import type { AlarmRepository } from '@/domain/ports/AlarmRepository';
import type { AlarmSessionRepository } from '@/domain/ports/AlarmSessionRepository';
import type { NotificationScheduler } from '@/domain/ports/NotificationScheduler';
import type { Clock } from '@/domain/ports/Clock';
import type { IdGenerator } from '@/domain/ports/IdGenerator';

const NOW = new Date('2026-01-01T07:00:00.000Z');

function makeAlarm(actionCount = 1): Alarm {
  const actions = Array.from({ length: actionCount }, (_, i) => ({
    type: 'BUTTON' as const,
    position: i,
  }));
  return new Alarm({
    id: 'alarm-1',
    label: 'Test',
    schedule: new Schedule([1], 7, 0),
    enabled: true,
    actions,
    createdAt: NOW,
    updatedAt: NOW,
    ringtoneUri: null,
  });
}

function makeSession(overrides: Partial<ConstructorParameters<typeof AlarmSession>[0]> = {}): AlarmSession {
  return new AlarmSession({
    id: 'session-1',
    alarmId: 'alarm-1',
    firedAt: NOW,
    currentIndex: 0,
    totalActions: 1,
    status: 'RINGING',
    ...overrides,
  });
}

function setup(alarm: Alarm | null, existingSession: AlarmSession | null = null) {
  const alarmRepository: AlarmRepository = {
    findById: jest.fn().mockResolvedValue(alarm),
    findAll: jest.fn().mockResolvedValue(alarm ? [alarm] : []),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const alarmSessionRepository: AlarmSessionRepository = {
    // StartAlarmSession checks findByAlarmId first; returning existing triggers recovery
    findByAlarmId: jest.fn().mockResolvedValue(existingSession),
    findById: jest.fn().mockResolvedValue(null),
    findActive: jest.fn().mockResolvedValue(null),
    // save must return the session — real use-cases return the value from save
    save: jest.fn(async (s: AlarmSession) => s),
    delete: jest.fn().mockResolvedValue(undefined),
  };
  const notificationScheduler: NotificationScheduler = {
    schedule: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    cancelAll: jest.fn().mockResolvedValue(undefined),
  };
  const clock: Clock = { now: jest.fn().mockReturnValue(NOW) };
  const idGenerator: IdGenerator = { generate: jest.fn().mockReturnValue('session-new') };

  initContainer({ alarmRepository, alarmSessionRepository, notificationScheduler, clock, idGenerator });

  return { alarmRepository, alarmSessionRepository, notificationScheduler, clock, idGenerator };
}

// NOTE: rendering-level effects (e.g. ringtone playback, screen wake lock) are
// out of scope for this hook unit test — covered separately in RingingScreen tests.

describe('useAlarmSession', () => {
  it('loads alarm and starts a new session on mount; loading=false after', async () => {
    const alarm = makeAlarm(1);
    setup(alarm);

    // renderHook is async in @testing-library/react-native v14 and awaits initial render
    const { result } = await renderHook(() => useAlarmSession('alarm-1'));

    // By the time await renderHook resolves, the async effect may already have run;
    // use waitFor to settle regardless of timing
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.alarm).toEqual(alarm);
    expect(result.current.session).not.toBeNull();
    expect(result.current.session?.id).toBe('session-new');
    expect(result.current.error).toBeNull();
  });

  it('sets error when alarm is not found', async () => {
    setup(null);

    const { result } = await renderHook(() => useAlarmSession('missing-alarm'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // String(new AlarmNotFoundError(...)) yields "AlarmDomainError: ..." because the
    // base class sets this.name = 'AlarmDomainError'. Check the message content instead.
    expect(result.current.error).toContain('not found');
    expect(result.current.session).toBeNull();
    expect(result.current.alarm).toBeNull();
  });

  it('recovers existing IN_PROGRESS session from repository (app-kill resilience)', async () => {
    const alarm = makeAlarm(2);
    const existing = makeSession({
      id: 'session-recovered',
      totalActions: 2,
      currentIndex: 1,
      status: 'IN_PROGRESS',
    });
    // findByAlarmId returning an existing session triggers recovery in StartAlarmSession
    setup(alarm, existing);

    const { result } = await renderHook(() => useAlarmSession('alarm-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session?.id).toBe('session-recovered');
    expect(result.current.session?.status).toBe('IN_PROGRESS');
    expect(result.current.session?.currentIndex).toBe(1);
  });

  it('completeAction advances currentIndex and updates session state', async () => {
    const alarm = makeAlarm(2);
    const { alarmSessionRepository } = setup(alarm);

    const { result } = await renderHook(() => useAlarmSession('alarm-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.session).not.toBeNull();

    // Wire findById so CompleteAction can locate the current session by id
    (alarmSessionRepository.findById as jest.Mock).mockImplementation(async (id: string) => {
      if (id === result.current.session?.id) {
        return makeSession({ id, totalActions: 2, currentIndex: 0 });
      }
      return null;
    });

    let updated: AlarmSession | null = null;
    await act(async () => {
      updated = await result.current.completeAction();
    });

    expect(updated?.currentIndex).toBe(1);
    expect(result.current.session?.currentIndex).toBe(1);
    expect(result.current.session?.status).toBe('IN_PROGRESS');
  });

  it('dismissAlarm calls DismissAlarm use-case (cancel + reschedule)', async () => {
    const alarm = makeAlarm(1);
    const { notificationScheduler } = setup(alarm);

    const { result } = await renderHook(() => useAlarmSession('alarm-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.dismissAlarm();
    });

    expect(notificationScheduler.cancel).toHaveBeenCalledWith('alarm-1');
    expect(notificationScheduler.cancelAll).toHaveBeenCalled();
  });

  it('currentAction returns the BUTTON action at index 0', async () => {
    const alarm = makeAlarm(1);
    setup(alarm);

    const { result } = await renderHook(() => useAlarmSession('alarm-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentAction).not.toBeNull();
    expect(result.current.currentAction?.type).toBe('BUTTON');
    expect(result.current.currentAction?.position).toBe(0);
  });

  // BUG: currentIndex >= actions.length causes currentAction to be null — soft-lock in RingingScreen
  // Scenario: alarm saved with 1 action, but recovered session has currentIndex=1 (stale state).
  // Desired behavior: hook auto-dismisses or surfaces an error so RingingScreen can exit.
  // Current behavior: alarm.actions[1] ?? null === null — silent null, UI gets stuck.
  it('BUG: out-of-bounds currentIndex should auto-dismiss or surface error, not silently return null', async () => {
    const alarm = makeAlarm(1); // only 1 action (index 0)
    const staleSession = makeSession({
      id: 'session-stale',
      totalActions: 2, // old totalActions from when alarm had 2 actions
      currentIndex: 1, // points past the current alarm.actions array
      status: 'IN_PROGRESS',
    });
    setup(alarm, staleSession);

    const { result } = await renderHook(() => useAlarmSession('alarm-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    // DESIRED: auto-dismiss fired OR error state set. Either would unblock the UI.
    // This test is intentionally RED to document the bug.
    const isAutoHandled =
      result.current.session?.isDismissed() === true ||
      result.current.error !== null;

    expect(isAutoHandled).toBe(true);
  });

  it('completeAction returns null without throwing when session is null', async () => {
    // Force a no-session state by making the alarm lookup fail
    setup(null);

    const { result } = await renderHook(() => useAlarmSession('alarm-1'));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.session).toBeNull();

    let returnValue: AlarmSession | null | undefined;
    await act(async () => {
      returnValue = await result.current.completeAction();
    });

    expect(returnValue).toBeNull();
  });
});
