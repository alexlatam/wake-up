import { StartAlarmSession } from '../StartAlarmSession';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';
import { AlarmSession } from '../../../domain/alarm/AlarmSession';
import { AlarmNotFoundError } from '../../../domain/alarm/errors';
import type { AlarmRepository } from '../../../domain/ports/AlarmRepository';
import type { AlarmSessionRepository } from '../../../domain/ports/AlarmSessionRepository';
import type { IdGenerator } from '../../../domain/ports/IdGenerator';
import type { Clock } from '../../../domain/ports/Clock';

const NOW = new Date('2026-01-01T07:00:00.000Z');
const alarm = new Alarm({
  id: 'a1',
  label: 'Test',
  schedule: new Schedule([1, 2, 3, 4, 5], 7, 0),
  enabled: true,
  actions: [{ type: 'BUTTON', position: 0 }],
  createdAt: NOW,
  updatedAt: NOW,
});

function makeRepo(
  foundAlarm: Alarm | null,
  activeSession: AlarmSession | null,
): [AlarmRepository, AlarmSessionRepository, AlarmSession[]] {
  const saved: AlarmSession[] = [];
  const alarmRepo: AlarmRepository = {
    findById: jest.fn().mockResolvedValue(foundAlarm),
    findAll: jest.fn().mockResolvedValue([]),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const sessionRepo: AlarmSessionRepository = {
    findByAlarmId: jest.fn().mockResolvedValue(activeSession),
    findById: jest.fn().mockResolvedValue(null),
    findActive: jest.fn().mockResolvedValue(null),
    save: jest.fn(async (s: AlarmSession) => { saved.push(s); }),
    delete: jest.fn(),
  };
  return [alarmRepo, sessionRepo, saved];
}

const idGen: IdGenerator = { generate: () => 'session-1' };
const clock: Clock = { now: () => NOW };

describe('StartAlarmSession', () => {
  it('throws when alarm not found', async () => {
    const [alarmRepo, sessionRepo] = makeRepo(null, null);
    await expect(
      new StartAlarmSession(alarmRepo, sessionRepo, idGen, clock).execute('missing'),
    ).rejects.toBeInstanceOf(AlarmNotFoundError);
  });

  it('creates new session when none active', async () => {
    const [alarmRepo, sessionRepo, saved] = makeRepo(alarm, null);
    const session = await new StartAlarmSession(alarmRepo, sessionRepo, idGen, clock).execute('a1');
    expect(session.id).toBe('session-1');
    expect(session.alarmId).toBe('a1');
    expect(session.status).toBe('RINGING');
    expect(session.currentIndex).toBe(0);
    expect(session.totalActions).toBe(1);
    expect(saved).toHaveLength(1);
  });

  it('returns existing RINGING session without creating another', async () => {
    const existing = new AlarmSession({
      id: 'old-session',
      alarmId: 'a1',
      firedAt: NOW,
      currentIndex: 0,
      status: 'RINGING',
      totalActions: 1,
    });
    const [alarmRepo, sessionRepo, saved] = makeRepo(alarm, existing);
    const session = await new StartAlarmSession(alarmRepo, sessionRepo, idGen, clock).execute('a1');
    expect(session.id).toBe('old-session');
    expect(saved).toHaveLength(0);
  });

  it('returns existing IN_PROGRESS session (survives app kill)', async () => {
    const existing = new AlarmSession({
      id: 'in-progress',
      alarmId: 'a1',
      firedAt: NOW,
      currentIndex: 0,
      status: 'IN_PROGRESS',
      totalActions: 1,
    });
    const [alarmRepo, sessionRepo] = makeRepo(alarm, existing);
    const session = await new StartAlarmSession(alarmRepo, sessionRepo, idGen, clock).execute('a1');
    expect(session.status).toBe('IN_PROGRESS');
  });
});
