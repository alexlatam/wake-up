import { Schedule } from '../Schedule';
import { InvalidScheduleError } from '../errors';

describe('Schedule', () => {
  describe('constructor', () => {
    it('throws when days is empty', () => {
      expect(() => new Schedule([], 7, 0)).toThrow(InvalidScheduleError);
    });

    it('throws when hour < 0', () => {
      expect(() => new Schedule([1], -1, 0)).toThrow(InvalidScheduleError);
    });

    it('throws when hour > 23', () => {
      expect(() => new Schedule([1], 24, 0)).toThrow(InvalidScheduleError);
    });

    it('throws when minute < 0', () => {
      expect(() => new Schedule([1], 7, -1)).toThrow(InvalidScheduleError);
    });

    it('throws when minute > 59', () => {
      expect(() => new Schedule([1], 7, 60)).toThrow(InvalidScheduleError);
    });

    it('creates valid schedule with boundary values', () => {
      const s = new Schedule([0, 6], 23, 59);
      expect(s.hour).toBe(23);
      expect(s.minute).toBe(59);
      expect(s.days.has(0)).toBe(true);
      expect(s.days.has(6)).toBe(true);
    });
  });

  describe('nextOccurrence', () => {
    // TZ=UTC in jest, so local methods equal UTC methods.
    // Monday 2024-01-08 07:00:00 local (= UTC in test env)
    const from = new Date(2024, 0, 8, 7, 0, 0, 0); // Mon Jan 8 07:00

    it('returns TODAY when today is a scheduled day and alarm time is still ahead', () => {
      // Schedule: Monday (1) at 08:00 — from is 07:00, so 08:00 is 1h ahead
      const s = new Schedule([1], 8, 0);
      const result = s.nextOccurrence(from);
      expect(result.getDay()).toBe(1); // Monday
      expect(result.getHours()).toBe(8);
      expect(result.getMinutes()).toBe(0);
      // Must be 1h ahead (today), NOT 7 days + 1h ahead (next Monday)
      const diffHours = (result.getTime() - from.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBeGreaterThan(0);
      expect(diffHours).toBeLessThan(2); // 1h, not 169h
    });

    it('skips to next week when alarm time already passed today', () => {
      // Schedule: Monday (1) at 06:00 — from is 07:00, so time has passed
      const s = new Schedule([1], 6, 0);
      const result = s.nextOccurrence(from);
      expect(result.getDay()).toBe(1); // next Monday
      const diffDays = (result.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6);
      expect(diffDays).toBeLessThan(8);
    });

    it('returns next scheduled weekday when today is not in schedule', () => {
      // Schedule: Wednesday (3) at 07:00 — from is Monday, next Wed = +2 days
      const s = new Schedule([3], 7, 0);
      const result = s.nextOccurrence(from);
      expect(result.getDay()).toBe(3); // Wednesday
      expect(result.getHours()).toBe(7);
      const diffDays = (result.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(1);
      expect(diffDays).toBeLessThan(3);
    });

    it('returns the CLOSEST scheduled day among multiple options', () => {
      // Schedule: Wednesday (3) and Friday (5) — from Monday, Wed is closest
      const s = new Schedule([3, 5], 7, 0);
      const result = s.nextOccurrence(from);
      expect(result.getDay()).toBe(3); // Wednesday, not Friday
    });

    it('returns alarm time with seconds and milliseconds zeroed', () => {
      const s = new Schedule([1], 8, 30);
      const result = s.nextOccurrence(from);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });
});
