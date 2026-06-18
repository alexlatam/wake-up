import { SyncService } from '../SyncService';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';
import type { AlarmRepository } from '../../../domain/ports/AlarmRepository';

const makeAlarm = (id: string) =>
  new Alarm({
    id,
    label: 'Test',
    schedule: new Schedule([1, 2, 3, 4, 5], 7, 0),
    enabled: true,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });

const mockRepo = (alarms: Alarm[] = []): AlarmRepository => ({
  findById: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue(alarms),
  save: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('SyncService', () => {
  it('fetches from remote and saves each alarm to local', async () => {
    const alarm1 = makeAlarm('alarm-1');
    const alarm2 = makeAlarm('alarm-2');
    const remote = mockRepo([alarm1, alarm2]);
    const local = mockRepo();

    await new SyncService(remote, local).execute();

    expect(remote.findAll).toHaveBeenCalledTimes(1);
    expect(local.save).toHaveBeenCalledWith(alarm1);
    expect(local.save).toHaveBeenCalledWith(alarm2);
    expect(local.save).toHaveBeenCalledTimes(2);
  });

  it('does nothing when remote returns no alarms', async () => {
    const remote = mockRepo([]);
    const local = mockRepo();

    await new SyncService(remote, local).execute();

    expect(local.save).not.toHaveBeenCalled();
  });

  it('domain Alarm flows unchanged between adapters — same object reference saved', async () => {
    const alarm = makeAlarm('alarm-3');
    const remote = mockRepo([alarm]);
    const local = mockRepo();

    await new SyncService(remote, local).execute();

    expect((local.save as jest.Mock).mock.calls[0][0]).toBe(alarm);
  });
});
