import { integer, text, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sqliteTable } from 'drizzle-orm/sqlite-core';

export const alarms = sqliteTable('alarms', {
  id: text('id').primaryKey(),
  label: text('label').notNull(),
  hour: integer('hour').notNull(),
  minute: integer('minute').notNull(),
  days: text('days').notNull(), // JSON: Weekday[]
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
  ringtoneUri: text('ringtone_uri'), // null = use system default alarm ringtone
  vibrationEnabled: integer('vibration_enabled', { mode: 'boolean' }).notNull().default(true),
  flashlightEnabled: integer('flashlight_enabled', { mode: 'boolean' }).notNull().default(false),
});

export const alarmActions = sqliteTable(
  'alarm_actions',
  {
    id: text('id').primaryKey(),
    alarmId: text('alarm_id')
      .notNull()
      .references(() => alarms.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    type: text('type').notNull(), // 'BUTTON' | 'MATH' | 'PUZZLE'
    level: text('level'), // MathLevel | PuzzleLevel | null
    imageUri: text('image_uri'), // null unless PUZZLE
  },
  (table) => [uniqueIndex('alarm_actions_alarm_position').on(table.alarmId, table.position)],
);

export const alarmSessions = sqliteTable('alarm_sessions', {
  id: text('id').primaryKey(),
  alarmId: text('alarm_id')
    .notNull()
    .references(() => alarms.id, { onDelete: 'cascade' }),
  firedAt: integer('fired_at', { mode: 'timestamp_ms' }).notNull(),
  currentIndex: integer('current_index').notNull().default(0),
  totalActions: integer('total_actions').notNull(),
  status: text('status').notNull().default('RINGING'), // 'RINGING' | 'IN_PROGRESS' | 'DISMISSED'
});
