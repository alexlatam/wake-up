import { Alarm } from '../Alarm';
import { Schedule } from '../Schedule';
import { InvalidActionsError } from '../errors';
import type { ActionConfig } from '../Action';

const makeSchedule = () => new Schedule([1, 2, 3, 4, 5], 7, 0);

const makeAlarm = (overrides?: Partial<ConstructorParameters<typeof Alarm>[0]>) => {
  // Destructure ringtoneUri with a null default so the spread never passes undefined
  // into the required `string | null` field (TS limitation with Partial spreads).
  const { ringtoneUri = null, ...rest } = overrides ?? {};
  return new Alarm({
    id: 'alarm-1',
    label: 'Morning',
    schedule: makeSchedule(),
    enabled: true,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ringtoneUri,
    ...rest,
  });
};

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
        { type: 'MATH', position: 1, level: 'EASY' },
        { type: 'BUTTON', position: 0 },
      ];
      const alarm = makeAlarm({ actions });
      expect(alarm.actions[0].type).toBe('BUTTON');
      expect(alarm.actions[1].type).toBe('MATH');
    });

    it('allows repeated action types with consecutive positions', () => {
      const actions: ActionConfig[] = [
        { type: 'MATH', position: 0, level: 'EASY' },
        { type: 'MATH', position: 1, level: 'MAXIMUM' },
        { type: 'MATH', position: 2, level: 'EXTREME' },
      ];
      expect(() => makeAlarm({ actions })).not.toThrow();
    });

    it('throws when positions contain duplicates [0, 0]', () => {
      const actions: ActionConfig[] = [
        { type: 'BUTTON', position: 0 },
        { type: 'MATH', position: 0, level: 'EASY' },
      ];
      expect(() => makeAlarm({ actions })).toThrow(InvalidActionsError);
    });

    it('throws when any position is negative', () => {
      const actions: ActionConfig[] = [
        { type: 'BUTTON', position: -1 },
        { type: 'MATH', position: 0, level: 'EASY' },
      ];
      expect(() => makeAlarm({ actions })).toThrow(InvalidActionsError);
    });

    it('accepts a single action at position 0', () => {
      expect(() => makeAlarm({ actions: [{ type: 'BUTTON', position: 0 }] })).not.toThrow();
    });

    it('stores actions sorted by position regardless of input order', () => {
      const actions: ActionConfig[] = [
        { type: 'WALK', position: 2, level: 'EASY' },
        { type: 'BUTTON', position: 0 },
        { type: 'MATH', position: 1, level: 'EASY' },
      ];
      const alarm = makeAlarm({ actions });
      expect(alarm.actions[0].type).toBe('BUTTON');
      expect(alarm.actions[1].type).toBe('MATH');
      expect(alarm.actions[2].type).toBe('WALK');
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

    it('stores empty string (not coerced to null — ?? only catches null/undefined)', () => {
      const alarm = makeAlarm({ ringtoneUri: '' });
      expect(alarm.ringtoneUri).toBe('');
    });
  });

  describe('vibrationEnabled', () => {
    it('defaults to true when not provided', () => {
      const alarm = makeAlarm(); // vibrationEnabled not in base props
      expect(alarm.vibrationEnabled).toBe(true);
    });

    it('defaults to true when explicitly undefined', () => {
      const alarm = makeAlarm({ vibrationEnabled: undefined });
      expect(alarm.vibrationEnabled).toBe(true);
    });

    it('stores explicit false', () => {
      const alarm = makeAlarm({ vibrationEnabled: false });
      expect(alarm.vibrationEnabled).toBe(false);
    });

    it('stores explicit true', () => {
      const alarm = makeAlarm({ vibrationEnabled: true });
      expect(alarm.vibrationEnabled).toBe(true);
    });
  });

  describe('flashlightEnabled', () => {
    it('defaults to false when not provided', () => {
      const alarm = makeAlarm();
      expect(alarm.flashlightEnabled).toBe(false);
    });

    it('defaults to false when explicitly undefined', () => {
      const alarm = makeAlarm({ flashlightEnabled: undefined });
      expect(alarm.flashlightEnabled).toBe(false);
    });

    it('stores explicit true', () => {
      const alarm = makeAlarm({ flashlightEnabled: true });
      expect(alarm.flashlightEnabled).toBe(true);
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

    it('returns a NEW instance even when called with the same value', () => {
      const alarm = makeAlarm({ enabled: true });
      const same = alarm.withEnabled(true);
      expect(same).not.toBe(alarm); // different reference
      expect(same.enabled).toBe(true);
    });

    it('updates updatedAt even when enabled value is unchanged', () => {
      const alarm = makeAlarm({ enabled: true, updatedAt: new Date('2024-01-01') });
      const same = alarm.withEnabled(true);
      // updatedAt must be >= original; it's set to new Date() inside withEnabled
      expect(same.updatedAt.getTime()).toBeGreaterThan(new Date('2024-01-01').getTime());
    });

    it('preserves vibrationEnabled and flashlightEnabled', () => {
      const alarm = makeAlarm({ vibrationEnabled: false, flashlightEnabled: true });
      const toggled = alarm.withEnabled(false);
      expect(toggled.vibrationEnabled).toBe(false);
      expect(toggled.flashlightEnabled).toBe(true);
    });
  });
});
