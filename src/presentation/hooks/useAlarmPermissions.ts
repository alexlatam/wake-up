import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import notifee, {
  AndroidNotificationSetting,
  AuthorizationStatus,
} from '@notifee/react-native';

interface PermissionState {
  notifications: boolean;
  exactAlarm: boolean;
  batteryOptimized: boolean; // true = OS may throttle the app (bad for alarms)
}

export function useAlarmPermissions() {
  const [state, setState] = useState<PermissionState>({
    notifications: false,
    exactAlarm: false,
    batteryOptimized: false,
  });

  const refresh = useCallback(async () => {
    const settings = await notifee.getNotificationSettings();
    const batteryOptimized =
      Platform.OS === 'android'
        ? await notifee.isBatteryOptimizationEnabled()
        : false;
    setState({
      notifications:
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL,
      exactAlarm:
        settings.android.alarm === AndroidNotificationSetting.ENABLED,
      batteryOptimized,
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const requestNotifications = useCallback(async () => {
    await notifee.requestPermission();
    await refresh();
  }, [refresh]);

  const openNotificationSettings = useCallback(async () => {
    await notifee.openNotificationSettings();
    await refresh();
  }, [refresh]);

  const openExactAlarmSettings = useCallback(async () => {
    await notifee.openAlarmPermissionSettings();
    await refresh();
  }, [refresh]);

  const openBatterySettings = useCallback(async () => {
    await notifee.openBatteryOptimizationSettings();
    await refresh();
  }, [refresh]);

  return {
    ...state,
    requestNotifications,
    openNotificationSettings,
    openExactAlarmSettings,
    openBatterySettings,
    refresh,
  };
}
