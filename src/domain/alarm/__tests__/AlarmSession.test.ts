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

    it('DISMISSED idempotency returns the SAME reference (not a copy)', () => {
      const session = makeSession({ status: 'DISMISSED' });
      const next = session.completeCurrent();
      expect(next).toBe(session); // reference equality
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

    it('totalActions=0: isDone immediately on first completeCurrent → DISMISSED, index unchanged', () => {
      // nextIndex = 0 + 1 = 1; isDone = 1 >= 0 → true; currentIndex stays 0
      const session = makeSession({ totalActions: 0, currentIndex: 0, status: 'RINGING' });
      const next = session.completeCurrent();
      expect(next.status).toBe('DISMISSED');
      expect(next.currentIndex).toBe(0); // unchanged (isDone path)
    });

    it('first complete from RINGING with multiple actions → IN_PROGRESS (never stays RINGING)', () => {
      const session = makeSession({ status: 'RINGING', currentIndex: 0, totalActions: 3 });
      const next = session.completeCurrent();
      expect(next.status).toBe('IN_PROGRESS');
      expect(next.status).not.toBe('RINGING');
    });
  });

  describe('constructor (no validation)', () => {
    it('accepts negative currentIndex without throwing', () => {
      // No validation exists on currentIndex — any number is accepted
      expect(() => makeSession({ currentIndex: -1 })).not.toThrow();
    });

    it('accepts currentIndex > totalActions without throwing', () => {
      expect(() => makeSession({ currentIndex: 99, totalActions: 3 })).not.toThrow();
    });

    it('accepts totalActions = 0 without throwing', () => {
      expect(() => makeSession({ totalActions: 0 })).not.toThrow();
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
