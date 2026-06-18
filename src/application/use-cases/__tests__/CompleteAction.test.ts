import { CompleteAction } from '../CompleteAction';
import { AlarmSession } from '../../../domain/alarm/AlarmSession';
import { SessionNotFoundError } from '../../../domain/alarm/errors';
import type { AlarmSessionRepository } from '../../../domain/ports/AlarmSessionRepository';

const NOW = new Date('2026-01-01T07:00:00.000Z');

function makeSession(overrides: Partial<ConstructorParameters<typeof AlarmSession>[0]> = {}): AlarmSession {
  return new AlarmSession({
    id: 's1',
    alarmId: 'a1',
    firedAt: NOW,
    currentIndex: 0,
    status: 'RINGING',
    totalActions: 3,
    ...overrides,
  });
}

function makeRepo(session: AlarmSession | null): [AlarmSessionRepository, AlarmSession[]] {
  const saved: AlarmSession[] = [];
  const repo: AlarmSessionRepository = {
    findById: jest.fn().mockResolvedValue(session),
    findByAlarmId: jest.fn().mockResolvedValue(null),
    findActive: jest.fn().mockResolvedValue(null),
    save: jest.fn(async (s: AlarmSession) => { saved.push(s); }),
    delete: jest.fn(),
  };
  return [repo, saved];
}

describe('CompleteAction', () => {
  it('throws when session not found', async () => {
    const [repo] = makeRepo(null);
    await expect(new CompleteAction(repo).execute('missing')).rejects.toBeInstanceOf(SessionNotFoundError);
  });

  it('advances currentIndex', async () => {
    const [repo, saved] = makeRepo(makeSession());
    const updated = await new CompleteAction(repo).execute('s1');
    expect(updated.currentIndex).toBe(1);
    expect(saved[0].currentIndex).toBe(1);
  });

  it('sets status IN_PROGRESS when not last action', async () => {
    const [repo] = makeRepo(makeSession());
    const updated = await new CompleteAction(repo).execute('s1');
    expect(updated.status).toBe('IN_PROGRESS');
  });

  it('sets status DISMISSED after last action', async () => {
    const [repo] = makeRepo(makeSession({ currentIndex: 2, totalActions: 3 }));
    const updated = await new CompleteAction(repo).execute('s1');
    expect(updated.isDismissed()).toBe(true);
  });

  it('saves updated session', async () => {
    const [repo, saved] = makeRepo(makeSession());
    await new CompleteAction(repo).execute('s1');
    expect(saved).toHaveLength(1);
  });
});
