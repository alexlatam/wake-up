import notifee, {
  AndroidCategory,
  AndroidImportance,
  AlarmType,
  TriggerType,
  type TimestampTrigger,
} from '@notifee/react-native';
import type { NotificationScheduler } from '@/domain/ports/NotificationScheduler';
import type { Alarm } from '@/domain/alarm/Alarm';

const CHANNEL_ID = 'wakeup_alarm';

export class NotifeeNotificationScheduler implements NotificationScheduler {
  private channelReady = false;

  private async ensureChannel(): Promise<void> {
    if (this.channelReady) return;
    await notifee.createChannel({
      id: CHANNEL_ID,
      name: 'Alarmas WakeUp',
      importance: AndroidImportance.HIGH,
      bypassDnd: true,
      vibration: true,
    });
    this.channelReady = true;
  }

  async schedule(alarm: Alarm): Promise<void> {
    await this.ensureChannel();

    const nextOccurrence = alarm.schedule.nextOccurrence(new Date());

    const trigger: TimestampTrigger = {
      type: TriggerType.TIMESTAMP,
      timestamp: nextOccurrence.getTime(),
      alarmManager: {
        type: AlarmType.SET_EXACT_AND_ALLOW_WHILE_IDLE,
      },
    };

    await notifee.createTriggerNotification(
      {
        id: `alarm-${alarm.id}`,
        title: 'WakeUp',
        body: alarm.label || 'Es hora de levantarse',
        android: {
          channelId: CHANNEL_ID,
          category: AndroidCategory.ALARM,
          importance: AndroidImportance.HIGH,
          fullScreenAction: {
            id: 'default',
          },
        },
        data: {
          alarmId: alarm.id,
        },
      },
      trigger,
    );
  }

  async cancel(alarmId: string): Promise<void> {
    const id = `alarm-${alarmId}`;
    // Cancel pending trigger AND any already-displayed notification.
    await notifee.cancelTriggerNotification(id);
    await notifee.cancelNotification(id);
  }

  async cancelAll(): Promise<void> {
    await notifee.cancelTriggerNotifications();
  }
}
