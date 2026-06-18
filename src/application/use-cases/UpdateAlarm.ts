import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import type { Clock } from '../../domain/ports/Clock';
import { Alarm } from '../../domain/alarm/Alarm';
import { Schedule } from '../../domain/alarm/Schedule';
import type { ActionConfig, Weekday } from '../../domain/alarm/Action';
import { AlarmNotFoundError } from '../../domain/alarm/errors';

export interface UpdateAlarmInput {
  id: string;
  label: string;
  days: Weekday[];
  hour: number;
  minute: number;
  actions: ActionConfig[];
  ringtoneUri?: string | null;
}

export class UpdateAlarm {
  constructor(
    private readonly alarmRepository: AlarmRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: UpdateAlarmInput): Promise<Alarm> {
    const existing = await this.alarmRepository.findById(input.id);
    if (!existing) throw new AlarmNotFoundError(`Alarm ${input.id} not found`);

    const updated = new Alarm({
      id: input.id,
      label: input.label,
      schedule: new Schedule(input.days, input.hour, input.minute),
      enabled: existing.enabled,
      actions: input.actions,
      createdAt: existing.createdAt,
      updatedAt: this.clock.now(),
      ringtoneUri: input.ringtoneUri !== undefined ? input.ringtoneUri : existing.ringtoneUri,
    });
    await this.alarmRepository.save(updated);
    return updated;
  }
}
