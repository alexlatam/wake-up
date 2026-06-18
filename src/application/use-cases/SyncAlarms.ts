import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import type { NotificationScheduler } from '../../domain/ports/NotificationScheduler';

export class SyncAlarms {
  constructor(
    private readonly alarmRepository: AlarmRepository,
    private readonly notificationScheduler: NotificationScheduler,
  ) {}

  async execute(): Promise<void> {
    await this.notificationScheduler.cancelAll();
    const alarms = await this.alarmRepository.findAll();
    await Promise.all(
      alarms
        .filter((alarm) => alarm.enabled)
        .map((alarm) => this.notificationScheduler.schedule(alarm)),
    );
  }
}
