import { DismissAlarm } from '../DismissAlarm';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';
import type { AlarmRepository } from '../../../domain/ports/AlarmRepository';
import type { NotificationScheduler } from '../../../domain/ports/NotificationScheduler';

const NOW = new Date('2026-01-01T07:00:00.000Z');
const alarm = new Alarm({
  id: 'a1',
  label: 'Test',
  schedule: new Schedule([1, 2, 3, 4, 5], 7, 0),
  enabled: true,
  actions: [{ type: 'BUTTON', position: 0 }],
  createdAt: NOW,
  updatedAt: NOW,
});

function makeAlarmRepo(found: Alarm | null): AlarmRepository {
  return {
    findById: jest.fn().mockResolvedValue(found),
    findAll: jest.fn().mockResolvedValue(found ? [found] : []),
    save: jest.fn(),
    delete: jest.fn(),
  };
}

function makeScheduler(): NotificationScheduler {
  return {
    schedule: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    cancelAll: jest.fn().mockResolvedValue(undefined),
  };
}

describe('DismissAlarm', () => {
  it('cancels the alarm notification', async () => {
    const alarmRepo = makeAlarmRepo(alarm);
    const scheduler = makeScheduler();
    await new DismissAlarm(alarmRepo, scheduler).execute('a1');
    expect(scheduler.cancel).toHaveBeenCalledWith('a1');
  });

  it('reschedules remaining enabled alarms (SyncAlarms)', async () => {
    const alarmRepo = makeAlarmRepo(alarm);
    const scheduler = makeScheduler();
    await new DismissAlarm(alarmRepo, scheduler).execute('a1');
    expect(scheduler.cancelAll).toHaveBeenCalled();
    expect(scheduler.schedule).toHaveBeenCalledWith(alarm);
  });
});
