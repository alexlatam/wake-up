import type { Alarm } from '../alarm/Alarm';

export interface AlarmRepository {
  findById(id: string): Promise<Alarm | null>;
  findAll(): Promise<Alarm[]>;
  save(alarm: Alarm): Promise<void>;
  delete(id: string): Promise<void>;
}
