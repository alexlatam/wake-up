import { CreateAlarm } from '../CreateAlarm';
import type { AlarmRepository } from '../../../domain/ports/AlarmRepository';
import type { IdGenerator } from '../../../domain/ports/IdGenerator';
import type { Clock } from '../../../domain/ports/Clock';
import { InvalidActionsError, InvalidScheduleError } from '../../../domain/alarm/errors';

const mockRepo = (): AlarmRepository => ({
  findById: jest.fn().mockResolvedValue(null),
  findAll: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

const mockId = (): IdGenerator => ({ generate: jest.fn().mockReturnValue('id-1') });
const mockClock = (date = new Date('2024-01-08T07:00:00Z')): Clock => ({ now: jest.fn().mockReturnValue(date) });

describe('CreateAlarm', () => {
  it('saves a valid alarm and returns it', async () => {
    const repo = mockRepo();
    const uc = new CreateAlarm(repo, mockId(), mockClock());
    const alarm = await uc.execute({
      label: 'Morning',
      days: [1, 2, 3, 4, 5],
      hour: 7,
      minute: 0,
      actions: [{ type: 'BUTTON', position: 0 }],
    });
    expect(alarm.id).toBe('id-1');
    expect(alarm.label).toBe('Morning');
    expect(alarm.enabled).toBe(true);
    expect(repo.save).toHaveBeenCalledWith(alarm);
  });

  it('throws InvalidScheduleError for invalid hour', async () => {
    const uc = new CreateAlarm(mockRepo(), mockId(), mockClock());
    await expect(
      uc.execute({ label: 'Bad', days: [1], hour: 25, minute: 0, actions: [{ type: 'BUTTON', position: 0 }] }),
    ).rejects.toThrow(InvalidScheduleError);
  });

  it('throws InvalidActionsError for empty actions', async () => {
    const uc = new CreateAlarm(mockRepo(), mockId(), mockClock());
    await expect(
      uc.execute({ label: 'Bad', days: [1], hour: 7, minute: 0, actions: [] }),
    ).rejects.toThrow(InvalidActionsError);
  });

  it('assigns createdAt and updatedAt from clock', async () => {
    const now = new Date('2024-06-01T08:00:00Z');
    const uc = new CreateAlarm(mockRepo(), mockId(), mockClock(now));
    const alarm = await uc.execute({
      label: 'Test',
      days: [1],
      hour: 8,
      minute: 0,
      actions: [{ type: 'BUTTON', position: 0 }],
    });
    expect(alarm.createdAt).toEqual(now);
    expect(alarm.updatedAt).toEqual(now);
  });
});
