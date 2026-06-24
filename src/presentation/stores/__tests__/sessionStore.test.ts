import { useSessionStore } from '../sessionStore';

// NOTE: No factory functions needed — the store has no complex shape to construct.
// NOTE: Subscription-based (React hook) usage is not covered here; only the raw
//       store API is exercised. Hook integration belongs in component tests.

describe('useSessionStore', () => {
  afterEach(() => {
    useSessionStore.setState({ isRinging: false, activeAlarmId: null });
  });

  describe('initial state', () => {
    it('isRinging is false', () => {
      expect(useSessionStore.getState().isRinging).toBe(false);
    });

    it('activeAlarmId is null', () => {
      expect(useSessionStore.getState().activeAlarmId).toBeNull();
    });
  });

  describe('setRinging', () => {
    it('setRinging(true) → isRinging becomes true', () => {
      useSessionStore.getState().setRinging(true);
      expect(useSessionStore.getState().isRinging).toBe(true);
    });

    it('setRinging(false) → isRinging becomes false', () => {
      useSessionStore.getState().setRinging(true);
      useSessionStore.getState().setRinging(false);
      expect(useSessionStore.getState().isRinging).toBe(false);
    });
  });

  describe('setActiveAlarmId', () => {
    it("setActiveAlarmId('alarm-1') → activeAlarmId becomes 'alarm-1'", () => {
      useSessionStore.getState().setActiveAlarmId('alarm-1');
      expect(useSessionStore.getState().activeAlarmId).toBe('alarm-1');
    });

    it('setActiveAlarmId(null) → activeAlarmId becomes null', () => {
      useSessionStore.getState().setActiveAlarmId('alarm-1');
      useSessionStore.getState().setActiveAlarmId(null);
      expect(useSessionStore.getState().activeAlarmId).toBeNull();
    });
  });

  describe('state isolation between tests', () => {
    it('store is reset to initial values at the start of each test', () => {
      // If afterEach reset did not run, this would fail after the setRinging/setActiveAlarmId tests above.
      expect(useSessionStore.getState().isRinging).toBe(false);
      expect(useSessionStore.getState().activeAlarmId).toBeNull();
    });
  });
});
