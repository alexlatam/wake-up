import { SyncAlarms } from '../SyncAlarms';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';
import type { AlarmRepository } from '../../../domain/ports/AlarmRepository';
import type { NotificationScheduler } from '../../../domain/ports/NotificationScheduler';

const NOW = new Date('2024-01-01T00:00:00Z');

function makeAlarm(id: string, enabled = true): Alarm {
  return new Alarm({
    id,
    label: `Alarm ${id}`,
    schedule: new Schedule([1, 2, 3, 4, 5], 7, 0),
    enabled,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: NOW,
    updatedAt: NOW,
    ringtoneUri: null,
  });
}

function makeRepo(alarms: Alarm[]): AlarmRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue(alarms),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function makeScheduler(): NotificationScheduler {
  return {
    schedule: jest.fn().mockResolvedValue(undefined),
    cancel: jest.fn().mockResolvedValue(undefined),
    cancelAll: jest.fn().mockResolvedValue(undefined),
  };
}

describe('SyncAlarms', () => {
  it('cancels all notifications before scheduling', async () => {
    const order: string[] = [];
    const repo = makeRepo([makeAlarm('a1')]);
    const scheduler = makeScheduler();
    (scheduler.cancelAll as jest.Mock).mockImplementation(async () => { order.push('cancelAll'); });
    (scheduler.schedule as jest.Mock).mockImplementation(async () => { order.push('schedule'); });

    await new SyncAlarms(repo, scheduler).execute();

    expect(order[0]).toBe('cancelAll');
    expect(order[1]).toBe('schedule');
  });

  it('schedules only enabled alarms', async () => {
    const enabled = makeAlarm('a1', true);
    const disabled = makeAlarm('a2', false);
    const repo = makeRepo([enabled, disabled]);
    const scheduler = makeScheduler();

    await new SyncAlarms(repo, scheduler).execute();

    expect(scheduler.schedule).toHaveBeenCalledTimes(1);
    expect(scheduler.schedule).toHaveBeenCalledWith(enabled);
    expect(scheduler.schedule).not.toHaveBeenCalledWith(disabled);
  });

  it('schedules all enabled alarms', async () => {
    const a1 = makeAlarm('a1', true);
    const a2 = makeAlarm('a2', true);
    const a3 = makeAlarm('a3', true);
    const repo = makeRepo([a1, a2, a3]);
    const scheduler = makeScheduler();

    await new SyncAlarms(repo, scheduler).execute();

    expect(scheduler.schedule).toHaveBeenCalledTimes(3);
    expect(scheduler.schedule).toHaveBeenCalledWith(a1);
    expect(scheduler.schedule).toHaveBeenCalledWith(a2);
    expect(scheduler.schedule).toHaveBeenCalledWith(a3);
  });

  it('calls cancelAll even when there are no alarms', async () => {
    const repo = makeRepo([]);
    const scheduler = makeScheduler();

    await new SyncAlarms(repo, scheduler).execute();

    expect(scheduler.cancelAll).toHaveBeenCalledTimes(1);
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  it('calls cancelAll when all alarms are disabled', async () => {
    const repo = makeRepo([makeAlarm('a1', false), makeAlarm('a2', false)]);
    const scheduler = makeScheduler();

    await new SyncAlarms(repo, scheduler).execute();

    expect(scheduler.cancelAll).toHaveBeenCalledTimes(1);
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });
});
