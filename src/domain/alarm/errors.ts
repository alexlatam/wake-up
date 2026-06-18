export class AlarmDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AlarmDomainError';
  }
}

export class InvalidScheduleError extends AlarmDomainError {}
export class InvalidActionsError extends AlarmDomainError {}
export class AlarmNotFoundError extends AlarmDomainError {}
export class SessionNotFoundError extends AlarmDomainError {}
