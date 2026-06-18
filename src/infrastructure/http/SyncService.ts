import type { AlarmRepository } from '../../domain/ports/AlarmRepository';

export class SyncService {
  constructor(
    private readonly remote: AlarmRepository,
    private readonly local: AlarmRepository,
  ) {}

  async execute(): Promise<void> {
    const remoteAlarms = await this.remote.findAll();
    await Promise.all(remoteAlarms.map((alarm) => this.local.save(alarm)));
  }
}
