import { expo } from './client';

export async function initDatabase(): Promise<void> {
  await expo.execAsync('PRAGMA foreign_keys = ON;');
  await expo.execAsync(`
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

  // v2: add ringtone_uri to existing alarms table (safe on fresh installs — column already exists)
  await expo.execAsync(`
    ALTER TABLE alarms ADD COLUMN ringtone_uri TEXT;
  `).catch(() => {
    // Column already exists — ignore "duplicate column" error
  });

  // v3: recreate alarm_sessions with ON DELETE CASCADE so deleting an alarm cascades to its sessions
  await expo.execAsync(`
    CREATE TABLE IF NOT EXISTS alarm_sessions_v3 (
      id TEXT PRIMARY KEY,
      alarm_id TEXT NOT NULL REFERENCES alarms(id) ON DELETE CASCADE,
      fired_at INTEGER NOT NULL,
      current_index INTEGER NOT NULL DEFAULT 0,
      total_actions INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'RINGING'
    );
    INSERT OR IGNORE INTO alarm_sessions_v3 SELECT * FROM alarm_sessions;
    DROP TABLE alarm_sessions;
    ALTER TABLE alarm_sessions_v3 RENAME TO alarm_sessions;
  `).catch(() => {
    // Migration already applied (alarm_sessions already has CASCADE) — ignore
  });
}
