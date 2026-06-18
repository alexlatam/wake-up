import { Alarm } from '../Alarm';
import { Schedule } from '../Schedule';
import { InvalidActionsError } from '../errors';
import type { ActionConfig } from '../Action';

const makeSchedule = () => new Schedule([1, 2, 3, 4, 5], 7, 0);

const makeAlarm = (overrides?: Partial<ConstructorParameters<typeof Alarm>[0]>) =>
  new Alarm({
    id: 'alarm-1',
    label: 'Morning',
    schedule: makeSchedule(),
    enabled: true,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  });

describe('Alarm', () => {
  describe('constructor invariants', () => {
    it('throws when actions is empty', () => {
      expect(() => makeAlarm({ actions: [] })).toThrow(InvalidActionsError);
    });

    it('throws when positions are not 0-based consecutive', () => {
      const actions: ActionConfig[] = [
        { type: 'BUTTON', position: 1 },
        { type: 'BUTTON', position: 2 },
      ];
      expect(() => makeAlarm({ actions })).toThrow(InvalidActionsError);
    });

    it('throws when positions have gaps', () => {
      const actions: ActionConfig[] = [
        { type: 'BUTTON', position: 0 },
        { type: 'BUTTON', position: 2 }, // gap at 1
      ];
      expect(() => makeAlarm({ actions })).toThrow(InvalidActionsError);
    });

    it('accepts actions out of order — sorts them', () => {
      const actions: ActionConfig[] = [
        { type: 'MATH', position: 1, level: 'MINIMO' },
        { type: 'BUTTON', position: 0 },
      ];
      const alarm = makeAlarm({ actions });
      expect(alarm.actions[0].type).toBe('BUTTON');
      expect(alarm.actions[1].type).toBe('MATH');
    });

    it('allows repeated action types with consecutive positions', () => {
      const actions: ActionConfig[] = [
        { type: 'MATH', position: 0, level: 'MINIMO' },
        { type: 'MATH', position: 1, level: 'MAXIMO' },
        { type: 'MATH', position: 2, level: 'EXTREMO' },
      ];
      expect(() => makeAlarm({ actions })).not.toThrow();
    });
  });

  describe('ringtoneUri', () => {
    it('defaults to null when not provided', () => {
      const alarm = new Alarm({
        id: 'x',
        label: 'X',
        schedule: makeSchedule(),
        enabled: true,
        actions: [{ type: 'BUTTON', position: 0 }],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ringtoneUri: undefined as unknown as null,
      });
      expect(alarm.ringtoneUri).toBeNull();
    });

    it('stores provided ringtoneUri', () => {
      const alarm = makeAlarm({ ringtoneUri: 'file:///storage/music/song.mp3' });
      expect(alarm.ringtoneUri).toBe('file:///storage/music/song.mp3');
    });

    it('stores null when explicitly set to null', () => {
      const alarm = makeAlarm({ ringtoneUri: null });
      expect(alarm.ringtoneUri).toBeNull();
    });
  });

  describe('withEnabled', () => {
    it('returns new alarm with updated enabled flag', () => {
      const alarm = makeAlarm({ enabled: true });
      const disabled = alarm.withEnabled(false);
      expect(disabled.enabled).toBe(false);
      expect(alarm.enabled).toBe(true); // original unchanged
    });

    it('preserves all other fields including ringtoneUri', () => {
      const alarm = makeAlarm({ ringtoneUri: 'file:///storage/music/song.mp3' });
      const toggled = alarm.withEnabled(false);
      expect(toggled.id).toBe(alarm.id);
      expect(toggled.label).toBe(alarm.label);
      expect(toggled.actions).toEqual(alarm.actions);
      expect(toggled.ringtoneUri).toBe('file:///storage/music/song.mp3');
    });

    it('updates updatedAt', () => {
      const alarm = makeAlarm();
      const before = new Date();
      const toggled = alarm.withEnabled(false);
      expect(toggled.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });
});
