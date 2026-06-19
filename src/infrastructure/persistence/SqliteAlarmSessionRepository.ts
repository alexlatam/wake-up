import { eq, ne } from 'drizzle-orm';
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';
import type { AlarmSessionRepository } from '../../domain/ports/AlarmSessionRepository';
import { AlarmSession } from '../../domain/alarm/AlarmSession';
import type { SessionStatus } from '../../domain/alarm/AlarmSession';
import { alarmSessions } from './drizzle/schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyDB = BaseSQLiteDatabase<'async' | 'sync', any, any>;

export class SqliteAlarmSessionRepository implements AlarmSessionRepository {
  constructor(private readonly db: AnyDB) {}

  async findById(id: string): Promise<AlarmSession | null> {
    const rows = await this.db
      .select()
      .from(alarmSessions)
      .where(eq(alarmSessions.id, id));
    return rows.length > 0 ? this.toSession(rows[0]) : null;
  }

  async findActive(): Promise<AlarmSession | null> {
    const cutoff = new Date(Date.now() - 8 * 60 * 60 * 1000);
    const rows = await this.db
      .select()
      .from(alarmSessions)
      .where(ne(alarmSessions.status, 'DISMISSED'));
    // FIFO: oldest first; ignore sessions older than 8 h (stale ghost sessions from crashes)
    const sorted = rows
      .filter((r) => r.firedAt >= cutoff)
      .sort((a, b) => a.firedAt.getTime() - b.firedAt.getTime());
    return sorted.length > 0 ? this.toSession(sorted[0]) : null;
  }

  async findByAlarmId(alarmId: string): Promise<AlarmSession | null> {
    const rows = await this.db
      .select()
      .from(alarmSessions)
      .where(eq(alarmSessions.alarmId, alarmId));
    const active = rows
      .filter((r) => r.status !== 'DISMISSED')
      .sort((a, b) => b.firedAt.getTime() - a.firedAt.getTime());
    return active.length > 0 ? this.toSession(active[0]) : null;
  }

  async save(session: AlarmSession): Promise<void> {
    const row = this.toRow(session);
    await this.db
      .insert(alarmSessions)
      .values(row)
      .onConflictDoUpdate({ target: alarmSessions.id, set: row });
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(alarmSessions).where(eq(alarmSessions.id, id));
  }

  private toSession(row: {
    id: string;
    alarmId: string;
    firedAt: Date;
    currentIndex: number;
    totalActions: number;
    status: string;
  }): AlarmSession {
    return new AlarmSession({
      id: row.id,
      alarmId: row.alarmId,
      firedAt: row.firedAt,
      currentIndex: row.currentIndex,
      totalActions: row.totalActions,
      status: row.status as SessionStatus,
    });
  }

  private toRow(session: AlarmSession) {
    return {
      id: session.id,
      alarmId: session.alarmId,
      firedAt: session.firedAt,
      currentIndex: session.currentIndex,
      totalActions: session.totalActions,
      status: session.status,
    };
  }
}
