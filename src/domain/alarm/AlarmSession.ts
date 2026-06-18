export type SessionStatus = 'RINGING' | 'IN_PROGRESS' | 'DISMISSED';

export interface AlarmSessionProps {
  id: string;
  alarmId: string;
  firedAt: Date;
  currentIndex: number;
  status: SessionStatus;
  totalActions: number;
}

export class AlarmSession {
  readonly id: string;
  readonly alarmId: string;
  readonly firedAt: Date;
  readonly currentIndex: number;
  readonly status: SessionStatus;
  readonly totalActions: number;

  constructor(props: AlarmSessionProps) {
    this.id = props.id;
    this.alarmId = props.alarmId;
    this.firedAt = props.firedAt;
    this.currentIndex = props.currentIndex;
    this.status = props.status;
    this.totalActions = props.totalActions;
  }

  completeCurrent(): AlarmSession {
    if (this.status === 'DISMISSED') return this;
    const nextIndex = this.currentIndex + 1;
    const isDone = nextIndex >= this.totalActions;
    return new AlarmSession({
      id: this.id,
      alarmId: this.alarmId,
      firedAt: this.firedAt,
      currentIndex: isDone ? this.currentIndex : nextIndex,
      status: isDone ? 'DISMISSED' : 'IN_PROGRESS',
      totalActions: this.totalActions,
    });
  }

  isDismissed(): boolean {
    return this.status === 'DISMISSED';
  }
}
