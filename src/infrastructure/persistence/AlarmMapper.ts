import { Alarm } from '../../domain/alarm/Alarm';
import { Schedule } from '../../domain/alarm/Schedule';
import type { ActionConfig, MathLevel, PuzzleLevel, ShakeLevel, TypeTextLevel, WalkLevel, Weekday } from '../../domain/alarm/Action';
import type { alarms, alarmActions } from './drizzle/schema';
import type { InferSelectModel } from 'drizzle-orm';

type AlarmRow = InferSelectModel<typeof alarms>;
type ActionRow = InferSelectModel<typeof alarmActions>;

export const AlarmMapper = {
  toDomain(row: AlarmRow, actionRows: ActionRow[]): Alarm {
    const days: Weekday[] = JSON.parse(row.days);
    const actions: ActionConfig[] = actionRows.map((a) => {
      if (a.type === 'BUTTON') return { type: 'BUTTON', position: a.position };
      if (a.type === 'MATH') return { type: 'MATH', position: a.position, level: a.level as MathLevel };
      if (a.type === 'TYPE_TEXT') return { type: 'TYPE_TEXT', position: a.position, level: a.level as TypeTextLevel };
      if (a.type === 'SHAKE') return { type: 'SHAKE', position: a.position, level: a.level as ShakeLevel };
      if (a.type === 'WALK') return { type: 'WALK', position: a.position, level: a.level as WalkLevel };
      if (a.type === 'QR_CODE') return { type: 'QR_CODE', position: a.position, qrCodeValue: a.imageUri ?? '' };
      return { type: 'PUZZLE', position: a.position, level: a.level as PuzzleLevel, imageUri: a.imageUri ?? null };
    });
    return new Alarm({
      id: row.id,
      label: row.label,
      schedule: new Schedule(days, row.hour, row.minute),
      enabled: row.enabled,
      actions,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      ringtoneUri: row.ringtoneUri ?? null,
    });
  },

  toRow(alarm: Alarm): AlarmRow {
    return {
      id: alarm.id,
      label: alarm.label,
      hour: alarm.schedule.hour,
      minute: alarm.schedule.minute,
      days: JSON.stringify([...alarm.schedule.days]),
      enabled: alarm.enabled,
      createdAt: alarm.createdAt,
      updatedAt: alarm.updatedAt,
      ringtoneUri: alarm.ringtoneUri,
    };
  },

  toActionRows(alarm: Alarm): ActionRow[] {
    return alarm.actions.map((action) => ({
      id: `${alarm.id}-${action.position}`,
      alarmId: alarm.id,
      position: action.position,
      type: action.type,
      level: (action.type !== 'BUTTON' && action.type !== 'QR_CODE') ? action.level : null,
      imageUri: action.type === 'PUZZLE' ? (action.imageUri ?? null) : action.type === 'QR_CODE' ? action.qrCodeValue : null,
    }));
  },
};
