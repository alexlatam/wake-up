import { ToggleAlarm } from '../ToggleAlarm';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';
import type { AlarmRepository } from '../../../domain/ports/AlarmRepository';
import { AlarmNotFoundError } from '../../../domain/alarm/errors';

const makeAlarm = (enabled: boolean) =>
  new Alarm({
    id: 'alarm-1',
    label: 'Morning',
    schedule: new Schedule([1], 7, 0),
    enabled,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  });

const mockRepo = (alarm: Alarm | null): AlarmRepository => ({
  findById: jest.fn().mockResolvedValue(alarm),
  findAll: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

describe('ToggleAlarm', () => {
  it('disables an enabled alarm', async () => {
    const repo = mockRepo(makeAlarm(true));
    const uc = new ToggleAlarm(repo);
    const result = await uc.execute('alarm-1');
    expect(result.enabled).toBe(false);
    expect(repo.save).toHaveBeenCalled();
  });

  it('enables a disabled alarm', async () => {
    const repo = mockRepo(makeAlarm(false));
    const uc = new ToggleAlarm(repo);
    const result = await uc.execute('alarm-1');
    expect(result.enabled).toBe(true);
  });

  it('throws AlarmNotFoundError when alarm does not exist', async () => {
    const repo = mockRepo(null);
    const uc = new ToggleAlarm(repo);
    await expect(uc.execute('ghost-id')).rejects.toThrow(AlarmNotFoundError);
  });
});
