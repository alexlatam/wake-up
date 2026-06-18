import type { AlarmSessionRepository } from '../../domain/ports/AlarmSessionRepository';
import type { AlarmSession } from '../../domain/alarm/AlarmSession';
import { SessionNotFoundError } from '../../domain/alarm/errors';

export class CompleteAction {
  constructor(
    private readonly alarmSessionRepository: AlarmSessionRepository,
  ) {}

  async execute(sessionId: string): Promise<AlarmSession> {
    const session = await this.alarmSessionRepository.findById(sessionId);
    if (!session) throw new SessionNotFoundError(`Session ${sessionId} not found`);

    const updated = session.completeCurrent();
    await this.alarmSessionRepository.save(updated);
    return updated;
  }
}
