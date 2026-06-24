import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { useAlarmPermissions } from '../useAlarmPermissions';
import notifee from '@notifee/react-native';

// NOTE: openNotificationSettings is not tested for call-through because it is
// an alias for the same pattern as openExactAlarmSettings and openBatterySettings,
// which are already covered. requestNotifications covers the request→refresh cycle.

jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    getNotificationSettings: jest.fn(),
    isBatteryOptimizationEnabled: jest.fn(),
    requestPermission: jest.fn(),
    openNotificationSettings: jest.fn(),
    openAlarmPermissionSettings: jest.fn(),
    openBatteryOptimizationSettings: jest.fn(),
  },
  AndroidNotificationSetting: { ENABLED: 1, DISABLED: 0, NOT_SUPPORTED: -1 },
  AuthorizationStatus: { NOT_DETERMINED: 0, DENIED: 1, AUTHORIZED: 2, PROVISIONAL: 3 },
}));

const mockNotifee = notifee as jest.Mocked<typeof notifee>;

function makeSettings(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    authorizationStatus: 2, // AUTHORIZED
    android: { alarm: 1 }, // ENABLED
    ...overrides,
  };
}

describe('useAlarmPermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNotifee.getNotificationSettings.mockResolvedValue(makeSettings() as never);
    mockNotifee.isBatteryOptimizationEnabled.mockResolvedValue(false);
    mockNotifee.requestPermission.mockResolvedValue(undefined as never);
    mockNotifee.openNotificationSettings.mockResolvedValue(undefined as never);
    mockNotifee.openAlarmPermissionSettings.mockResolvedValue(undefined as never);
    mockNotifee.openBatteryOptimizationSettings.mockResolvedValue(undefined as never);
    Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
  });

  describe('notifications state', () => {
    it('notifications=true when authorizationStatus is AUTHORIZED (2)', async () => {
      mockNotifee.getNotificationSettings.mockResolvedValue(makeSettings({ authorizationStatus: 2 }) as never);
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.notifications).toBe(true));
    });

    it('notifications=true when authorizationStatus is PROVISIONAL (3)', async () => {
      mockNotifee.getNotificationSettings.mockResolvedValue(makeSettings({ authorizationStatus: 3 }) as never);
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.notifications).toBe(true));
    });

    it('notifications=false when authorizationStatus is DENIED (1)', async () => {
      mockNotifee.getNotificationSettings.mockResolvedValue(makeSettings({ authorizationStatus: 1 }) as never);
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.notifications).toBe(false));
    });
  });

  describe('exactAlarm state', () => {
    it('exactAlarm=true when android.alarm is ENABLED (1)', async () => {
      mockNotifee.getNotificationSettings.mockResolvedValue(makeSettings({ android: { alarm: 1 } }) as never);
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.exactAlarm).toBe(true));
    });

    it('exactAlarm=false when android.alarm is DISABLED (0)', async () => {
      mockNotifee.getNotificationSettings.mockResolvedValue(makeSettings({ android: { alarm: 0 } }) as never);
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.exactAlarm).toBe(false));
    });
  });

  describe('batteryOptimized state', () => {
    it('batteryOptimized=true on Android when isBatteryOptimizationEnabled returns true', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'android', writable: true });
      mockNotifee.isBatteryOptimizationEnabled.mockResolvedValue(true);
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.batteryOptimized).toBe(true));
    });

    it('batteryOptimized=false on iOS regardless of isBatteryOptimizationEnabled result', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockNotifee.isBatteryOptimizationEnabled.mockResolvedValue(true);
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.batteryOptimized).toBe(false));
    });
  });

  describe('actions', () => {
    it('requestNotifications calls notifee.requestPermission then refreshes state', async () => {
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.notifications).toBe(true));

      mockNotifee.getNotificationSettings.mockResolvedValue(makeSettings({ authorizationStatus: 1 }) as never);
      await act(async () => {
        await result.current.requestNotifications();
      });

      expect(mockNotifee.requestPermission).toHaveBeenCalledTimes(1);
      // refresh was called again after requestPermission
      expect(mockNotifee.getNotificationSettings).toHaveBeenCalledTimes(2);
      expect(result.current.notifications).toBe(false);
    });

    it('openExactAlarmSettings calls notifee.openAlarmPermissionSettings then refreshes state', async () => {
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.exactAlarm).toBe(true));

      mockNotifee.getNotificationSettings.mockResolvedValue(makeSettings({ android: { alarm: 0 } }) as never);
      await act(async () => {
        await result.current.openExactAlarmSettings();
      });

      expect(mockNotifee.openAlarmPermissionSettings).toHaveBeenCalledTimes(1);
      expect(mockNotifee.getNotificationSettings).toHaveBeenCalledTimes(2);
      expect(result.current.exactAlarm).toBe(false);
    });

    it('openBatterySettings calls notifee.openBatteryOptimizationSettings then refreshes state', async () => {
      const { result } = await renderHook(() => useAlarmPermissions());
      await waitFor(() => expect(result.current.batteryOptimized).toBe(false));

      mockNotifee.isBatteryOptimizationEnabled.mockResolvedValue(true);
      await act(async () => {
        await result.current.openBatterySettings();
      });

      expect(mockNotifee.openBatteryOptimizationSettings).toHaveBeenCalledTimes(1);
      expect(result.current.batteryOptimized).toBe(true);
    });
  });

  describe('edge cases', () => {
    // BUG: on iOS settings.android is undefined — accessing .alarm crashes
    // Current behavior: `settings.android.alarm` throws TypeError: Cannot read properties of undefined
    // Desired behavior: exactAlarm defaults to false without crashing
    it('BUG: on iOS settings.android is undefined — accessing .alarm crashes', async () => {
      Object.defineProperty(Platform, 'OS', { value: 'ios', writable: true });
      mockNotifee.getNotificationSettings.mockResolvedValue(
        makeSettings({ android: undefined }) as never,
      );

      const { result } = await renderHook(() => useAlarmPermissions());

      // Desired: no crash, exactAlarm defaults to false
      await waitFor(() => expect(result.current.exactAlarm).toBe(false));
    });
  });
});
