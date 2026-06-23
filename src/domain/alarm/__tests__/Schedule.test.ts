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

    it('accepts minimum boundary values: hour=0, minute=0', () => {
      const s = new Schedule([1], 0, 0);
      expect(s.hour).toBe(0);
      expect(s.minute).toBe(0);
    });

    it('deduplicates repeated days via Set', () => {
      const s = new Schedule([1, 1, 2, 2], 7, 0);
      expect(s.days.size).toBe(2);
      expect(s.days.has(1)).toBe(true);
      expect(s.days.has(2)).toBe(true);
    });

    it('single-element days array with duplicate still deduplicates', () => {
      const s = new Schedule([3, 3, 3], 12, 0);
      expect(s.days.size).toBe(1);
    });

    // NOTE: non-integer hour/minute values (e.g. 7.5) are NOT rejected at runtime —
    // Schedule only guards 0–23 / 0–59 range; integer-check requires explicit guard.
    // NOTE: Weekday values outside 0–6 (e.g. 7) are not rejected at runtime; type-only.
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

    it('exact-minute boundary: `from` at exactly the scheduled time is NOT ahead (uses > not >=)', () => {
      // from = Mon Jan 8 07:00; schedule = Mon at 07:00 exactly
      // todayCandidate == from → NOT strictly ahead → falls through to next week
      const s = new Schedule([1], 7, 0);
      const result = s.nextOccurrence(from);
      // Must be next Monday (~7 days later), NOT today
      const diffMs = result.getTime() - from.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(6);
      expect(diffDays).toBeLessThan(8);
    });

    it('month/year rollover: Jan 31 + offset normalises to February correctly', () => {
      // Thu Jan 31 2019 23:00 UTC (weekday=4 in local = UTC in tests)
      const jan31 = new Date(2019, 0, 31, 23, 0, 0, 0); // Thu
      // Schedule: next Friday (5) at 06:00 — +1 day = Feb 1
      const s = new Schedule([5], 6, 0);
      const result = s.nextOccurrence(jan31);
      expect(result.getMonth()).toBe(1); // February (0-indexed)
      expect(result.getDate()).toBe(1);
      expect(result.getDay()).toBe(5); // Friday
    });

    it('from with non-zero seconds/ms: result always has seconds=0 and ms=0', () => {
      const fromWithMs = new Date(2024, 0, 8, 6, 59, 45, 999); // 06:59:45.999
      const s = new Schedule([1], 8, 0);
      const result = s.nextOccurrence(fromWithMs);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    // NOTE: DST transitions are not tested because TZ=UTC is pinned in jest.config.js.
    // Local-time setHours/setDate would be the risk area in non-UTC environments.
  });
});
