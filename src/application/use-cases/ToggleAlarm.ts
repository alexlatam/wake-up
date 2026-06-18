import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import type { Alarm } from '../../domain/alarm/Alarm';
import { AlarmNotFoundError } from '../../domain/alarm/errors';

export class ToggleAlarm {
  constructor(private readonly alarmRepository: AlarmRepository) {}

  async execute(id: string): Promise<Alarm> {
    const alarm = await this.alarmRepository.findById(id);
    if (!alarm) throw new AlarmNotFoundError(`Alarm ${id} not found`);
    const toggled = alarm.withEnabled(!alarm.enabled);
    await this.alarmRepository.save(toggled);
    return toggled;
  }
}
