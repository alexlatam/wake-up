import type { AlarmRepository } from '../../domain/ports/AlarmRepository';
import type { AlarmSessionRepository } from '../../domain/ports/AlarmSessionRepository';
import type { NotificationScheduler } from '../../domain/ports/NotificationScheduler';
import type { Clock } from '../../domain/ports/Clock';
import type { IdGenerator } from '../../domain/ports/IdGenerator';

export interface Ports {
  alarmRepository: AlarmRepository;
  alarmSessionRepository: AlarmSessionRepository;
  notificationScheduler: NotificationScheduler;
  clock: Clock;
  idGenerator: IdGenerator;
}

let _container: Ports | null = null;

export function initContainer(ports: Ports): void {
  _container = ports;
}

export function getContainer(): Ports {
  if (!_container) {
    throw new Error('Container not initialized — call initContainer() at app startup');
  }
  return _container;
}
