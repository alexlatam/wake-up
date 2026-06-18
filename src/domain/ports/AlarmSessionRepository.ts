import type { AlarmSession } from '../alarm/AlarmSession';

export interface AlarmSessionRepository {
  findByAlarmId(alarmId: string): Promise<AlarmSession | null>;
  findById(id: string): Promise<AlarmSession | null>;
  findActive(): Promise<AlarmSession | null>;
  save(session: AlarmSession): Promise<void>;
  delete(id: string): Promise<void>;
}
