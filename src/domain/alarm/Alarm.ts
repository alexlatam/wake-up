import type { ActionConfig } from './Action';
import type { Schedule } from './Schedule';
import { InvalidActionsError } from './errors';

export interface AlarmProps {
  id: string;
  label: string;
  schedule: Schedule;
  enabled: boolean;
  actions: ActionConfig[];
  createdAt: Date;
  updatedAt: Date;
}

export class Alarm {
  readonly id: string;
  readonly label: string;
  readonly schedule: Schedule;
  readonly enabled: boolean;
  readonly actions: ReadonlyArray<ActionConfig>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: AlarmProps) {
    if (props.actions.length === 0) {
      throw new InvalidActionsError('Alarm must have at least one action');
    }
    this.validatePositions(props.actions);
    this.id = props.id;
    this.label = props.label;
    this.schedule = props.schedule;
    this.enabled = props.enabled;
    this.actions = [...props.actions].sort((a, b) => a.position - b.position);
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  private validatePositions(actions: ActionConfig[]): void {
    const positions = actions.map((a) => a.position).sort((a, b) => a - b);
    for (let i = 0; i < positions.length; i++) {
      if (positions[i] !== i) {
        throw new InvalidActionsError('Action positions must be consecutive starting at 0');
      }
    }
  }

  withEnabled(enabled: boolean): Alarm {
    return new Alarm({ ...this.toProps(), enabled, updatedAt: new Date() });
  }

  private toProps(): AlarmProps {
    return {
      id: this.id,
      label: this.label,
      schedule: this.schedule,
      enabled: this.enabled,
      actions: [...this.actions],
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
