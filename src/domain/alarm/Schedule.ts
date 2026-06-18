import type { Weekday } from './Action';
import { InvalidScheduleError } from './errors';

export class Schedule {
  readonly days: ReadonlySet<Weekday>;
  readonly hour: number;
  readonly minute: number;

  constructor(days: Weekday[], hour: number, minute: number) {
    if (days.length === 0) throw new InvalidScheduleError('Schedule must have at least one day');
    if (hour < 0 || hour > 23) throw new InvalidScheduleError('Hour must be 0–23');
    if (minute < 0 || minute > 59) throw new InvalidScheduleError('Minute must be 0–59');
    this.days = new Set(days);
    this.hour = hour;
    this.minute = minute;
  }

  nextOccurrence(from: Date): Date {
    // Check today first: if alarm time is still ahead and today is scheduled
    const todayCandidate = new Date(from);
    todayCandidate.setHours(this.hour, this.minute, 0, 0);
    if (todayCandidate > from && this.days.has(todayCandidate.getDay() as Weekday)) {
      return todayCandidate;
    }

    // Search the next 7 days (tomorrow onwards)
    for (let offset = 1; offset <= 7; offset++) {
      const candidate = new Date(from);
      candidate.setDate(from.getDate() + offset);
      candidate.setHours(this.hour, this.minute, 0, 0);
      if (this.days.has(candidate.getDay() as Weekday)) {
        return candidate;
      }
    }

    // Unreachable: at least one day is always set, so within 7 days we always find one
    throw new InvalidScheduleError('Could not compute next occurrence');
  }
}
