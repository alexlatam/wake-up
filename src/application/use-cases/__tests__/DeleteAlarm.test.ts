import { DeleteAlarm } from '../DeleteAlarm';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';
import type { AlarmRepository } from '../../../domain/ports/AlarmRepository';
import { AlarmNotFoundError } from '../../../domain/alarm/errors';

const makeAlarm = () =>
  new Alarm({
    id: 'alarm-1',
    label: 'Morning',
    schedule: new Schedule([1], 7, 0),
    enabled: true,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('DeleteAlarm', () => {
  it('deletes existing alarm', async () => {
    const repo: AlarmRepository = {
      findById: jest.fn().mockResolvedValue(makeAlarm()),
      findAll: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const uc = new DeleteAlarm(repo);
    await uc.execute('alarm-1');
    expect(repo.delete).toHaveBeenCalledWith('alarm-1');
  });

  it('throws AlarmNotFoundError when alarm does not exist', async () => {
    const repo: AlarmRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      save: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
    };
    const uc = new DeleteAlarm(repo);
    await expect(uc.execute('ghost-id')).rejects.toThrow(AlarmNotFoundError);
    expect(repo.delete).not.toHaveBeenCalled();
  });
});
