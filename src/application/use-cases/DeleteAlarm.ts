import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import { AlarmNotFoundError } from '../../domain/alarm/errors';

export class DeleteAlarm {
  constructor(private readonly alarmRepository: AlarmRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.alarmRepository.findById(id);
    if (!existing) throw new AlarmNotFoundError(`Alarm ${id} not found`);
    await this.alarmRepository.delete(id);
  }
}
