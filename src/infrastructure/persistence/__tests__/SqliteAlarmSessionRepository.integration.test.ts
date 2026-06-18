import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../drizzle/schema';
import { SqliteAlarmSessionRepository } from '../SqliteAlarmSessionRepository';
import { AlarmSession } from '../../../domain/alarm/AlarmSession';

function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      days TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      ringtone_uri TEXT
    );
    CREATE TABLE IF NOT EXISTS alarm_actions (
      id TEXT PRIMARY KEY,
      alarm_id TEXT NOT NULL REFERENCES alarms(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      type TEXT NOT NULL,
      level TEXT,
      image_uri TEXT,
      UNIQUE(alarm_id, position)
    );
    CREATE TABLE IF NOT EXISTS alarm_sessions (
      id TEXT PRIMARY KEY,
      alarm_id TEXT NOT NULL,
      fired_at INTEGER NOT NULL,
      current_index INTEGER NOT NULL DEFAULT 0,
      total_actions INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'RINGING'
    );
  `);
  return db;
}

const FIRED_AT = new Date('2026-01-08T07:00:00.000Z');

function makeSession(overrides: Partial<ConstructorParameters<typeof AlarmSession>[0]> = {}): AlarmSession {
  return new AlarmSession({
    id: 'session-1',
    alarmId: 'alarm-1',
    firedAt: FIRED_AT,
    currentIndex: 0,
    totalActions: 2,
    status: 'RINGING',
    ...overrides,
  });
}

describe('SqliteAlarmSessionRepository (integration)', () => {
  let repo: SqliteAlarmSessionRepository;

  beforeEach(() => {
    const db = createTestDb() as ConstructorParameters<typeof SqliteAlarmSessionRepository>[0];
    repo = new SqliteAlarmSessionRepository(db);
  });

  describe('save / findById', () => {
    it('saves and retrieves session by id', async () => {
      const session = makeSession();
      await repo.save(session);
      const found = await repo.findById('session-1');
      expect(found).not.toBeNull();
      expect(found!.id).toBe('session-1');
      expect(found!.alarmId).toBe('alarm-1');
      expect(found!.currentIndex).toBe(0);
      expect(found!.totalActions).toBe(2);
      expect(found!.status).toBe('RINGING');
    });

    it('returns null for unknown id', async () => {
      expect(await repo.findById('ghost')).toBeNull();
    });

    it('round-trips firedAt timestamp', async () => {
      await repo.save(makeSession());
      const found = await repo.findById('session-1');
      expect(found!.firedAt.getTime()).toBe(FIRED_AT.getTime());
    });

    it('upserts on second save — updates existing session', async () => {
      await repo.save(makeSession({ status: 'RINGING', currentIndex: 0 }));
      const updated = makeSession({ status: 'IN_PROGRESS', currentIndex: 1 });
      await repo.save(updated);
      const found = await repo.findById('session-1');
      expect(found!.status).toBe('IN_PROGRESS');
      expect(found!.currentIndex).toBe(1);
    });
  });

  describe('findByAlarmId', () => {
    it('returns active (non-DISMISSED) session for alarm', async () => {
      await repo.save(makeSession({ id: 's1', status: 'RINGING' }));
      const found = await repo.findByAlarmId('alarm-1');
      expect(found!.id).toBe('s1');
    });

    it('returns null when only DISMISSED sessions exist', async () => {
      await repo.save(makeSession({ id: 's1', status: 'DISMISSED' }));
      const found = await repo.findByAlarmId('alarm-1');
      expect(found).toBeNull();
    });

    it('returns most recent non-DISMISSED session when multiple exist', async () => {
      const older = new Date('2026-01-08T06:00:00.000Z');
      const newer = new Date('2026-01-08T07:00:00.000Z');
      await repo.save(makeSession({ id: 's-old', firedAt: older, status: 'IN_PROGRESS' }));
      await repo.save(makeSession({ id: 's-new', firedAt: newer, status: 'RINGING' }));
      const found = await repo.findByAlarmId('alarm-1');
      expect(found!.id).toBe('s-new');
    });

    it('ignores DISMISSED sessions when non-DISMISSED also exist', async () => {
      await repo.save(makeSession({ id: 's-dismissed', status: 'DISMISSED', firedAt: new Date('2026-01-08T08:00:00.000Z') }));
      await repo.save(makeSession({ id: 's-active', status: 'RINGING', firedAt: new Date('2026-01-08T07:00:00.000Z') }));
      const found = await repo.findByAlarmId('alarm-1');
      expect(found!.id).toBe('s-active');
    });

    it('returns null when no sessions exist for alarm', async () => {
      const found = await repo.findByAlarmId('alarm-1');
      expect(found).toBeNull();
    });
  });

  describe('findActive', () => {
    it('returns any non-DISMISSED session', async () => {
      await repo.save(makeSession({ id: 's1', status: 'IN_PROGRESS' }));
      const found = await repo.findActive();
      expect(found!.id).toBe('s1');
    });

    it('returns null when all sessions are DISMISSED', async () => {
      await repo.save(makeSession({ id: 's1', status: 'DISMISSED' }));
      const found = await repo.findActive();
      expect(found).toBeNull();
    });

    it('returns null when no sessions exist', async () => {
      expect(await repo.findActive()).toBeNull();
    });

    it('returns most recent non-DISMISSED when multiple exist across alarms', async () => {
      const older = new Date('2026-01-08T06:00:00.000Z');
      const newer = new Date('2026-01-08T08:00:00.000Z');
      await repo.save(makeSession({ id: 's-old', alarmId: 'alarm-1', firedAt: older, status: 'RINGING' }));
      await repo.save(makeSession({ id: 's-new', alarmId: 'alarm-2', firedAt: newer, status: 'RINGING' }));
      const found = await repo.findActive();
      expect(found!.id).toBe('s-new');
    });
  });

  describe('status persistence', () => {
    it.each([
      ['RINGING' as const],
      ['IN_PROGRESS' as const],
      ['DISMISSED' as const],
    ])('round-trips status = %s', async (status) => {
      await repo.save(makeSession({ status }));
      const found = await repo.findById('session-1');
      expect(found!.status).toBe(status);
    });
  });

  describe('delete', () => {
    it('removes session by id', async () => {
      await repo.save(makeSession());
      await repo.delete('session-1');
      expect(await repo.findById('session-1')).toBeNull();
    });

    it('is a no-op when session does not exist', async () => {
      await expect(repo.delete('ghost')).resolves.not.toThrow();
    });
  });
});
