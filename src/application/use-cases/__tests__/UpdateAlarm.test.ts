import { UpdateAlarm } from '../UpdateAlarm';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';
import { AlarmNotFoundError, InvalidScheduleError, InvalidActionsError } from '../../../domain/alarm/errors';
import type { AlarmRepository } from '../../../domain/ports/AlarmRepository';
import type { Clock } from '../../../domain/ports/Clock';

const BASE_DATE = new Date('2024-01-01T00:00:00Z');
const UPDATE_DATE = new Date('2024-06-01T08:00:00Z');

function makeAlarm(overrides: Partial<ConstructorParameters<typeof Alarm>[0]> = {}): Alarm {
  return new Alarm({
    id: 'alarm-1',
    label: 'Morning',
    schedule: new Schedule([1, 2, 3, 4, 5], 7, 0),
    enabled: true,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ringtoneUri: null,
    ...overrides,
  });
}

function makeRepo(existing: Alarm | null): AlarmRepository {
  return {
    findById: jest.fn().mockResolvedValue(existing),
    findAll: jest.fn().mockResolvedValue([]),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

function makeClock(date = UPDATE_DATE): Clock {
  return { now: jest.fn().mockReturnValue(date) };
}

describe('UpdateAlarm', () => {
  describe('happy path', () => {
    it('updates label, schedule and actions', async () => {
      const repo = makeRepo(makeAlarm());
      const result = await new UpdateAlarm(repo, makeClock()).execute({
        id: 'alarm-1',
        label: 'Evening',
        days: [5, 6],
        hour: 22,
        minute: 30,
        actions: [{ type: 'MATH', position: 0, level: 'MAXIMUM' }],
      });
      expect(result.label).toBe('Evening');
      expect(result.schedule.hour).toBe(22);
      expect(result.schedule.minute).toBe(30);
      expect([...result.schedule.days]).toEqual(expect.arrayContaining([5, 6]));
      expect(result.actions[0].type).toBe('MATH');
      expect(repo.save).toHaveBeenCalledWith(result);
    });

    it('preserves createdAt from existing alarm', async () => {
      const repo = makeRepo(makeAlarm());
      const result = await new UpdateAlarm(repo, makeClock()).execute({
        id: 'alarm-1',
        label: 'X',
        days: [1],
        hour: 8,
        minute: 0,
        actions: [{ type: 'BUTTON', position: 0 }],
      });
      expect(result.createdAt).toEqual(BASE_DATE);
    });

    it('sets updatedAt to clock.now()', async () => {
      const repo = makeRepo(makeAlarm());
      const result = await new UpdateAlarm(repo, makeClock(UPDATE_DATE)).execute({
        id: 'alarm-1',
        label: 'X',
        days: [1],
        hour: 8,
        minute: 0,
        actions: [{ type: 'BUTTON', position: 0 }],
      });
      expect(result.updatedAt).toEqual(UPDATE_DATE);
    });

    it('preserves enabled flag from existing alarm', async () => {
      const repo = makeRepo(makeAlarm({ enabled: false }));
      const result = await new UpdateAlarm(repo, makeClock()).execute({
        id: 'alarm-1',
        label: 'X',
        days: [1],
        hour: 8,
        minute: 0,
        actions: [{ type: 'BUTTON', position: 0 }],
      });
      expect(result.enabled).toBe(false);
    });
  });

  describe('ringtoneUri', () => {
    it('sets ringtoneUri when provided', async () => {
      const repo = makeRepo(makeAlarm({ ringtoneUri: null }));
      const result = await new UpdateAlarm(repo, makeClock()).execute({
        id: 'alarm-1',
        label: 'X',
        days: [1],
        hour: 8,
        minute: 0,
        actions: [{ type: 'BUTTON', position: 0 }],
        ringtoneUri: 'file:///storage/music/song.mp3',
      });
      expect(result.ringtoneUri).toBe('file:///storage/music/song.mp3');
    });

    it('clears ringtoneUri when explicitly set to null', async () => {
      const repo = makeRepo(makeAlarm({ ringtoneUri: 'file:///storage/music/song.mp3' }));
      const result = await new UpdateAlarm(repo, makeClock()).execute({
        id: 'alarm-1',
        label: 'X',
        days: [1],
        hour: 8,
        minute: 0,
        actions: [{ type: 'BUTTON', position: 0 }],
        ringtoneUri: null,
      });
      expect(result.ringtoneUri).toBeNull();
    });

    it('preserves existing ringtoneUri when input omits the field', async () => {
      const existing = makeAlarm({ ringtoneUri: 'file:///storage/music/song.mp3' });
      const repo = makeRepo(existing);
      const result = await new UpdateAlarm(repo, makeClock()).execute({
        id: 'alarm-1',
        label: 'X',
        days: [1],
        hour: 8,
        minute: 0,
        actions: [{ type: 'BUTTON', position: 0 }],
        // ringtoneUri intentionally omitted
      });
      expect(result.ringtoneUri).toBe('file:///storage/music/song.mp3');
    });

    it('preserves null ringtoneUri when input omits the field', async () => {
      const repo = makeRepo(makeAlarm({ ringtoneUri: null }));
      const result = await new UpdateAlarm(repo, makeClock()).execute({
        id: 'alarm-1',
        label: 'X',
        days: [1],
        hour: 8,
        minute: 0,
        actions: [{ type: 'BUTTON', position: 0 }],
      });
      expect(result.ringtoneUri).toBeNull();
    });
  });

  describe('error cases', () => {
    it('throws AlarmNotFoundError when alarm does not exist', async () => {
      const repo = makeRepo(null);
      await expect(
        new UpdateAlarm(repo, makeClock()).execute({
          id: 'ghost',
          label: 'X',
          days: [1],
          hour: 8,
          minute: 0,
          actions: [{ type: 'BUTTON', position: 0 }],
        }),
      ).rejects.toBeInstanceOf(AlarmNotFoundError);
    });

    it('throws InvalidScheduleError for invalid hour', async () => {
      const repo = makeRepo(makeAlarm());
      await expect(
        new UpdateAlarm(repo, makeClock()).execute({
          id: 'alarm-1',
          label: 'X',
          days: [1],
          hour: 99,
          minute: 0,
          actions: [{ type: 'BUTTON', position: 0 }],
        }),
      ).rejects.toThrow(InvalidScheduleError);
    });

    it('throws InvalidActionsError for empty actions', async () => {
      const repo = makeRepo(makeAlarm());
      await expect(
        new UpdateAlarm(repo, makeClock()).execute({
          id: 'alarm-1',
          label: 'X',
          days: [1],
          hour: 8,
          minute: 0,
          actions: [],
        }),
      ).rejects.toThrow(InvalidActionsError);
    });

    it('does not call repo.save when validation fails', async () => {
      const repo = makeRepo(makeAlarm());
      await expect(
        new UpdateAlarm(repo, makeClock()).execute({
          id: 'alarm-1',
          label: 'X',
          days: [1],
          hour: 25,
          minute: 0,
          actions: [{ type: 'BUTTON', position: 0 }],
        }),
      ).rejects.toThrow();
      expect(repo.save).not.toHaveBeenCalled();
    });
  });
});
