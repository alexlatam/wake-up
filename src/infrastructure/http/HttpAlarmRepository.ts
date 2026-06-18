import type { Alarm } from '../../domain/alarm/Alarm';
import type { AlarmRepository } from '../../domain/ports/AlarmRepository';

/**
 * Stub — wires up when the backend is ready.
 * Implements the same AlarmRepository port as SqliteAlarmRepository;
 * the domain and use cases need no changes to swap adapters.
 */
export class HttpAlarmRepository implements AlarmRepository {
  constructor(private readonly baseUrl: string) {}

  async findById(_id: string): Promise<Alarm | null> {
    throw new Error('HttpAlarmRepository: not yet connected to backend');
  }

  async findAll(): Promise<Alarm[]> {
    throw new Error('HttpAlarmRepository: not yet connected to backend');
  }

  async save(_alarm: Alarm): Promise<void> {
    throw new Error('HttpAlarmRepository: not yet connected to backend');
  }

  async delete(_id: string): Promise<void> {
    throw new Error('HttpAlarmRepository: not yet connected to backend');
  }
}
