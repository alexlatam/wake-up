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
}
