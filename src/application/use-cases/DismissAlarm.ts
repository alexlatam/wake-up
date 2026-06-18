import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import type { NotificationScheduler } from '../../domain/ports/NotificationScheduler';
import { SyncAlarms } from './SyncAlarms';

export class DismissAlarm {
  constructor(
    private readonly alarmRepository: AlarmRepository,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  async execute(alarmId: string): Promise<void> {
    await this.notificationScheduler.cancel(alarmId);
    await new SyncAlarms(this.alarmRepository, this.notificationScheduler).execute();
  }
}
