import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import type { AlarmSessionRepository } from '../../domain/ports/AlarmSessionRepository';
import type { IdGenerator } from '../../domain/ports/IdGenerator';
import type { Clock } from '../../domain/ports/Clock';
import { AlarmSession } from '../../domain/alarm/AlarmSession';
import { AlarmNotFoundError } from '../../domain/alarm/errors';

export class StartAlarmSession {
  constructor(
    private readonly alarmRepository: AlarmRepository,
    private readonly alarmSessionRepository: AlarmSessionRepository,
    private readonly idGenerator: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async execute(alarmId: string): Promise<AlarmSession> {
    const alarm = await this.alarmRepository.findById(alarmId);
    if (!alarm) throw new AlarmNotFoundError(`Alarm ${alarmId} not found`);

    // Recover existing RINGING or IN_PROGRESS session (app-kill resilience)
    const existing = await this.alarmSessionRepository.findByAlarmId(alarmId);
    if (existing) return existing;

    const session = new AlarmSession({
      id: this.idGenerator.generate(),
      alarmId,
      firedAt: this.clock.now(),
      currentIndex: 0,
      status: 'RINGING',
      totalActions: alarm.actions.length,
    });
    await this.alarmSessionRepository.save(session);
    return session;
  }
}
