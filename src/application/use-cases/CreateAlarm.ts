import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import type { IdGenerator } from '../../domain/ports/IdGenerator';
import type { Clock } from '../../domain/ports/Clock';
import { Alarm } from '../../domain/alarm/Alarm';
import { Schedule } from '../../domain/alarm/Schedule';
import type { ActionConfig, Weekday } from '../../domain/alarm/Action';

export interface CreateAlarmInput {
  label: string;
  days: Weekday[];
  hour: number;
  minute: number;
  actions: ActionConfig[];
  ringtoneUri?: string | null;
  vibrationEnabled?: boolean;
  flashlightEnabled?: boolean;
}

export class CreateAlarm {
  constructor(
    private readonly alarmRepository: AlarmRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(input: CreateAlarmInput): Promise<Alarm> {
    const now = this.clock.now();
    const alarm = new Alarm({
      id: this.idGenerator.generate(),
      label: input.label,
      schedule: new Schedule(input.days, input.hour, input.minute),
      enabled: true,
      actions: input.actions,
      createdAt: now,
      updatedAt: now,
      ringtoneUri: input.ringtoneUri ?? null,
      vibrationEnabled: input.vibrationEnabled ?? true,
      flashlightEnabled: input.flashlightEnabled ?? false,
    });
    await this.alarmRepository.save(alarm);
    return alarm;
  }
}
