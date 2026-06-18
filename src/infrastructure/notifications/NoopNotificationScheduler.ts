import type { NotificationScheduler } from '../../domain/ports/NotificationScheduler';
import type { Alarm } from '../../domain/alarm/Alarm';

export class NoopNotificationScheduler implements NotificationScheduler {
  async schedule(_alarm: Alarm): Promise<void> {}
  async cancel(_alarmId: string): Promise<void> {}
  async cancelAll(): Promise<void> {}
}
