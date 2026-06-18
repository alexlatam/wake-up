import type { Alarm } from '../alarm/Alarm';

export interface NotificationScheduler {
  schedule(alarm: Alarm): Promise<void>;
  cancel(alarmId: string): Promise<void>;
  cancelAll(): Promise<void>;
}
