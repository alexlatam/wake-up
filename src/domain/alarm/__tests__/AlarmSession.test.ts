import { AlarmSession } from '../AlarmSession';

const makeSession = (overrides?: Partial<ConstructorParameters<typeof AlarmSession>[0]>) =>
  new AlarmSession({
    id: 'session-1',
    alarmId: 'alarm-1',
    firedAt: new Date('2024-01-08T07:00:00Z'),
    currentIndex: 0,
    status: 'RINGING',
    totalActions: 3,
    ...overrides,
  });

describe('AlarmSession', () => {
  describe('completeCurrent', () => {
    it('advances currentIndex and sets IN_PROGRESS when not last action', () => {
      const session = makeSession({ currentIndex: 0, totalActions: 3 });
      const next = session.completeCurrent();
      expect(next.currentIndex).toBe(1);
      expect(next.status).toBe('IN_PROGRESS');
    });

    it('sets DISMISSED when completing the last action', () => {
      const session = makeSession({ currentIndex: 2, totalActions: 3 });
      const next = session.completeCurrent();
      expect(next.status).toBe('DISMISSED');
    });

    it('sets DISMISSED when single action alarm completes', () => {
      const session = makeSession({ currentIndex: 0, totalActions: 1 });
      const next = session.completeCurrent();
      expect(next.status).toBe('DISMISSED');
    });

    it('is idempotent when already DISMISSED', () => {
      const session = makeSession({ status: 'DISMISSED', currentIndex: 2, totalActions: 3 });
      const next = session.completeCurrent();
      expect(next.status).toBe('DISMISSED');
      expect(next.currentIndex).toBe(2); // unchanged
    });

    it('preserves id and alarmId', () => {
      const session = makeSession();
      const next = session.completeCurrent();
      expect(next.id).toBe(session.id);
      expect(next.alarmId).toBe(session.alarmId);
    });

    it('sequences through all actions correctly', () => {
      let session = makeSession({ totalActions: 4, currentIndex: 0 });
      session = session.completeCurrent();
      expect(session.currentIndex).toBe(1);
      expect(session.status).toBe('IN_PROGRESS');
      session = session.completeCurrent();
      expect(session.currentIndex).toBe(2);
      expect(session.status).toBe('IN_PROGRESS');
      session = session.completeCurrent();
      expect(session.currentIndex).toBe(3);
      expect(session.status).toBe('IN_PROGRESS');
      session = session.completeCurrent();
      expect(session.status).toBe('DISMISSED');
    });
  });

  describe('isDismissed', () => {
    it('returns false for RINGING', () => {
      expect(makeSession({ status: 'RINGING' }).isDismissed()).toBe(false);
    });

    it('returns false for IN_PROGRESS', () => {
      expect(makeSession({ status: 'IN_PROGRESS' }).isDismissed()).toBe(false);
    });

    it('returns true for DISMISSED', () => {
      expect(makeSession({ status: 'DISMISSED' }).isDismissed()).toBe(true);
    });
  });
});
