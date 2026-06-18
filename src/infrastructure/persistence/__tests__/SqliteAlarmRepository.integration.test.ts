/**
 * Integration test using better-sqlite3 (Node.js driver, same SQL dialect as expo-sqlite).
 * Verifies the full create/read/update/delete + persistence cycle.
 */
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../drizzle/schema';
import { SqliteAlarmRepository } from '../SqliteAlarmRepository';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';

function createTestDb() {
  const sqlite = new Database(':memory:');
  const db = drizzle(sqlite, { schema });
  // Run schema creation directly (no migration files needed for tests)
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS alarms (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      hour INTEGER NOT NULL,
      minute INTEGER NOT NULL,
      days TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
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
      alarm_id TEXT NOT NULL REFERENCES alarms(id),
      fired_at INTEGER NOT NULL,
      current_index INTEGER NOT NULL DEFAULT 0,
      total_actions INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'RINGING'
    );
  `);
  return db;
}

const makeAlarm = (id = 'alarm-1') =>
  new Alarm({
    id,
    label: 'Morning',
    schedule: new Schedule([1, 2, 3, 4, 5], 7, 0),
    enabled: true,
    actions: [
      { type: 'BUTTON', position: 0 },
      { type: 'MATH', position: 1, level: 'MEDIO' },
    ],
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  });

describe('SqliteAlarmRepository (integration)', () => {
  let repo: SqliteAlarmRepository;

  beforeEach(() => {
    // Fresh in-memory DB per test — simulates process restart isolation
    const db = createTestDb() as ConstructorParameters<typeof SqliteAlarmRepository>[0];
    repo = new SqliteAlarmRepository(db);
  });

  it('saves and retrieves an alarm by id', async () => {
    const alarm = makeAlarm();
    await repo.save(alarm);
    const found = await repo.findById('alarm-1');
    expect(found).not.toBeNull();
    expect(found!.id).toBe('alarm-1');
    expect(found!.label).toBe('Morning');
    expect(found!.enabled).toBe(true);
    expect(found!.actions).toHaveLength(2);
    expect(found!.actions[0].type).toBe('BUTTON');
    expect(found!.actions[1].type).toBe('MATH');
  });

  it('returns null for unknown id', async () => {
    const result = await repo.findById('ghost');
    expect(result).toBeNull();
  });

  it('lists all alarms', async () => {
    await repo.save(makeAlarm('a1'));
    await repo.save(makeAlarm('a2'));
    const all = await repo.findAll();
    expect(all).toHaveLength(2);
    expect(all.map((a) => a.id).sort()).toEqual(['a1', 'a2']);
  });

  it('updates alarm on second save (upsert)', async () => {
    await repo.save(makeAlarm());
    const updated = new Alarm({
      id: 'alarm-1',
      label: 'Updated label',
      schedule: new Schedule([6, 0], 9, 30),
      enabled: false,
      actions: [{ type: 'BUTTON', position: 0 }],
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-06-01T00:00:00Z'),
    });
    await repo.save(updated);
    const found = await repo.findById('alarm-1');
    expect(found!.label).toBe('Updated label');
    expect(found!.enabled).toBe(false);
    expect(found!.schedule.hour).toBe(9);
    expect(found!.actions).toHaveLength(1);
  });

  it('deletes an alarm (cascade removes actions)', async () => {
    await repo.save(makeAlarm());
    await repo.delete('alarm-1');
    expect(await repo.findById('alarm-1')).toBeNull();
    expect(await repo.findAll()).toHaveLength(0);
  });

  it('preserves days and schedule round-trip', async () => {
    const alarm = makeAlarm();
    await repo.save(alarm);
    const found = await repo.findById('alarm-1')!;
    expect(found!.schedule.hour).toBe(7);
    expect(found!.schedule.minute).toBe(0);
    expect([...found!.schedule.days].sort()).toEqual([1, 2, 3, 4, 5]);
  });
});
