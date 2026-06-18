import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import type { Alarm } from '../../domain/alarm/Alarm';

export class ListAlarms {
  constructor(private readonly alarmRepository: AlarmRepository) {}

  async execute(): Promise<Alarm[]> {
    return this.alarmRepository.findAll();
  }
}
