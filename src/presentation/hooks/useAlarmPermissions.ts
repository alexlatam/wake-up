import { useCallback, useEffect, useState } from 'react';
import { Linking, PermissionsAndroid, Platform, type Permission } from 'react-native';
import notifee, {
  AndroidNotificationSetting,
  AuthorizationStatus,
} from '@notifee/react-native';

interface PermissionState {
  notifications: boolean;
  exactAlarm: boolean;
  batteryOptimized: boolean; // true = OS may throttle the app (bad for alarms)
  fullScreenIntent: boolean; // false = not granted on Android 14+ (bad for alarms)
}

export function useAlarmPermissions() {
  const [state, setState] = useState<PermissionState>({
    notifications: false,
    exactAlarm: false,
    batteryOptimized: false,
    fullScreenIntent: true,
  });

  const refresh = useCallback(async () => {
    const settings = await notifee.getNotificationSettings();
    const batteryOptimized =
      Platform.OS === 'android'
        ? await notifee.isBatteryOptimizationEnabled()
        : false;
    // USE_FULL_SCREEN_INTENT requires explicit grant on Android 14+ (API 34+).
    // On older versions the permission is auto-granted, so we default to true.
    const fullScreenIntent =
      Platform.OS === 'android' && Platform.Version >= 34
        ? await PermissionsAndroid.check('android.permission.USE_FULL_SCREEN_INTENT' as Permission)
        : true;
    setState({
      notifications:
        settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
        settings.authorizationStatus === AuthorizationStatus.PROVISIONAL,
      exactAlarm:
        settings.android.alarm === AndroidNotificationSetting.ENABLED,
      batteryOptimized,
      fullScreenIntent,
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

  const openFullScreenIntentSettings = useCallback(async () => {
    await Linking.openSettings();
    await refresh();
  }, [refresh]);

  return {
    ...state,
    requestNotifications,
    openNotificationSettings,
    openExactAlarmSettings,
    openBatterySettings,
    openFullScreenIntentSettings,
    refresh,
  };
}
