import { eq } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import type { Alarm } from '../../domain/alarm/Alarm';
import { alarms, alarmActions } from './drizzle/schema';
import { AlarmMapper } from './AlarmMapper';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = BaseSQLiteDatabase<'async' | 'sync', any, any>;

export class SqliteAlarmRepository implements AlarmRepository {
  constructor(private readonly db: AnyDB) {}

  async findById(id: string): Promise<Alarm | null> {
    const rows = await this.db.select().from(alarms).where(eq(alarms.id, id));
    if (rows.length === 0) return null;
    const actions = await this.db
      .select()
      .from(alarmActions)
      .where(eq(alarmActions.alarmId, id));
    return AlarmMapper.toDomain(rows[0], actions);
  }

  async findAll(): Promise<Alarm[]> {
    const [allAlarms, allActions] = await Promise.all([
      this.db.select().from(alarms),
      this.db.select().from(alarmActions),
    ]);
    return allAlarms.map((row) => {
      const actions = allActions.filter((a) => a.alarmId === row.id);
      return AlarmMapper.toDomain(row, actions);
    });
  }

  async save(alarm: Alarm): Promise<void> {
    const alarmRow = AlarmMapper.toRow(alarm);
    const actionRows = AlarmMapper.toActionRows(alarm);
    await this.db
      .insert(alarms)
      .values(alarmRow)
      .onConflictDoUpdate({ target: alarms.id, set: alarmRow });
    await this.db.delete(alarmActions).where(eq(alarmActions.alarmId, alarm.id));
    if (actionRows.length > 0) {
      await this.db.insert(alarmActions).values(actionRows);
    }
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(alarms).where(eq(alarms.id, id));
  }
}
