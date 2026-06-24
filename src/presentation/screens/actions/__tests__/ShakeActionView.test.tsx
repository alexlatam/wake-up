import React from 'react';
import { render, act } from '@testing-library/react-native';
import type { ShakeLevel } from '@/domain/alarm/Action';

// ---------------------------------------------------------------------------
// Accelerometer mock — must be set up before importing ShakeActionView so that
// when useEffect lazy-requires the module it gets the mock, not the native one.
// ---------------------------------------------------------------------------

let mockListener: ((data: { x: number; y: number; z: number }) => void) | null = null;

const mockAccel = {
  setUpdateInterval: jest.fn(),
  addListener: jest.fn((cb: (data: { x: number; y: number; z: number }) => void) => {
    mockListener = cb;
    return { remove: jest.fn() };
  }),
};

// Virtual mock for the lazy-required path inside useEffect.
// The source does:  require('expo-sensors/build/Accelerometer').default
jest.mock(
  'expo-sensors/build/Accelerometer',
  () => ({ default: mockAccel }),
  { virtual: true },
);

// Also mock the top-level expo-sensors export so any indirect import is safe.
jest.mock('expo-sensors', () => ({
  Accelerometer: mockAccel,
  Pedometer: {
    requestPermissionsAsync: jest.fn(),
    isAvailableAsync: jest.fn(),
    watchStepCount: jest.fn(),
  },
}));

// Mock ~/components/ui/text (alias: ~/ → project root).
jest.mock('~/components/ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

import { ShakeActionView } from '../ShakeActionView';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Props = {
  level: ShakeLevel;
  customSeconds?: number;
  onComplete: () => void;
};

const makeProps = (overrides?: Partial<Props>): Props => ({
  level: 'EASY',
  onComplete: jest.fn(),
  ...overrides,
});

/**
 * Simulate `count` shake ticks where each tick has a delta > SHAKE_THRESHOLD.
 *
 * Strategy: alternate x between 10 and 0.
 *   - lastMagRef starts at 1 (hardcoded in source).
 *   - Tick i=0: x=10 → mag≈10, delta=|10-1|=9 > 1.2 ✓  → lastShakeAt=now
 *   - Tick i=1: x=0  → mag=0,  delta=|0-10|=10 > 1.2 ✓  → lastShakeAt=now
 *   - ... alternates, delta always ≈10 > 1.2 ✓
 *
 * Every tick therefore sets lastShakeAt and the immediately-following
 * isShaking check (now - lastShakeAt = 0 < 300) is true, so elapsed
 * increments on EVERY tick.
 *
 * Date.now() is controlled by jest fake timers (jest.setSystemTime). We keep
 * the clock frozen so all ticks fall within the 300 ms isShaking window.
 *
 * In RNTL v14 act() is async, so this helper returns a Promise.
 */
async function simulateShakeTicks(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    const x = i % 2 === 0 ? 10 : 0;
    await act(() => {
      mockListener?.({ x, y: 0, z: 0 });
    });
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ShakeActionView', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Fix Date.now so all ticks appear within the 300 ms shaking window.
    jest.setSystemTime(1_000_000);
    mockListener = null;
    mockAccel.setUpdateInterval.mockClear();
    mockAccel.addListener.mockClear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Level duration mapping
  // -------------------------------------------------------------------------

  describe('EASY level (3 s → 30 tenths)', () => {
    it('calls onComplete after exactly 30 shake ticks', async () => {
      const onComplete = jest.fn();
      await render(<ShakeActionView {...makeProps({ level: 'EASY', onComplete })} />);

      await simulateShakeTicks(29);
      expect(onComplete).not.toHaveBeenCalled();

      await simulateShakeTicks(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('MEDIUM level (10 s → 100 tenths)', () => {
    it('calls onComplete after exactly 100 shake ticks', async () => {
      const onComplete = jest.fn();
      await render(<ShakeActionView {...makeProps({ level: 'MEDIUM', onComplete })} />);

      await simulateShakeTicks(99);
      expect(onComplete).not.toHaveBeenCalled();

      await simulateShakeTicks(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('MAXIMUM level (30 s → 300 tenths)', () => {
    it('registers the accelerometer listener', async () => {
      await render(<ShakeActionView {...makeProps({ level: 'MAXIMUM' })} />);
      expect(mockAccel.setUpdateInterval).toHaveBeenCalledWith(100);
      expect(mockAccel.addListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('EXTREME level (120 s → 1200 tenths)', () => {
    it('does NOT complete after only 100 ticks', async () => {
      const onComplete = jest.fn();
      await render(<ShakeActionView {...makeProps({ level: 'EXTREME', onComplete })} />);

      await simulateShakeTicks(100);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // CUSTOM level
  // -------------------------------------------------------------------------

  describe('CUSTOM level with explicit customSeconds', () => {
    it('uses customSeconds=5 (50 tenths) and completes after 50 ticks', async () => {
      const onComplete = jest.fn();
      await render(
        <ShakeActionView
          {...makeProps({ level: 'CUSTOM', customSeconds: 5, onComplete })}
        />,
      );

      await simulateShakeTicks(49);
      expect(onComplete).not.toHaveBeenCalled();

      await simulateShakeTicks(1);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('CUSTOM level without customSeconds', () => {
    it('defaults to 30 s (300 tenths) and does NOT complete after 50 ticks', async () => {
      const onComplete = jest.fn();
      await render(<ShakeActionView {...makeProps({ level: 'CUSTOM', onComplete })} />);

      await simulateShakeTicks(50);
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // Threshold / isShaking window
  // -------------------------------------------------------------------------

  describe('non-shaking ticks (delta ≤ SHAKE_THRESHOLD)', () => {
    it('does NOT advance elapsed when delta is too small', async () => {
      const onComplete = jest.fn();
      await render(<ShakeActionView {...makeProps({ level: 'EASY', onComplete })} />);

      // Send a tick that sets lastMag to exactly 1 (initial lastMagRef = 1)
      // then send many ticks with the same vector → delta ≈ 0
      await act(() => { mockListener?.({ x: 1, y: 0, z: 0 }); }); // mag=1, delta=|1-1|=0
      for (let i = 0; i < 50; i++) {
        await act(() => { mockListener?.({ x: 1, y: 0, z: 0 }); }); // delta=0 each time
      }

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('shake stops (gap > 300 ms)', () => {
    it('does NOT count ticks after the 300 ms shaking window expires', async () => {
      const onComplete = jest.fn();
      await render(<ShakeActionView {...makeProps({ level: 'EASY', onComplete })} />);

      // First tick triggers a shake (delta > 1.2) and sets lastShakeAt.
      await act(() => { mockListener?.({ x: 2, y: 0, z: 0 }); }); // lastShakeAt = 1_000_000

      // Advance time beyond the 300 ms window so isShaking = false.
      jest.setSystemTime(1_000_000 + 400);

      // Send subsequent ticks with the SAME magnitude so delta ≈ 0 (below SHAKE_THRESHOLD).
      // This means lastShakeAt is NOT updated.
      // isShaking = now(1_000_400) - lastShakeAt(1_000_000) = 400 ≥ 300 → false.
      for (let i = 0; i < 30; i++) {
        await act(() => { mockListener?.({ x: 2, y: 0, z: 0 }); });
      }

      // Only the very first tick counted (elapsed=1); onComplete requires 30.
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // doneRef prevents double-complete
  // -------------------------------------------------------------------------

  describe('doneRef guard', () => {
    it('fires onComplete exactly once even when extra ticks arrive after completion', async () => {
      const onComplete = jest.fn();
      await render(<ShakeActionView {...makeProps({ level: 'EASY', onComplete })} />);

      // Complete the shake challenge (30 ticks).
      await simulateShakeTicks(30);
      expect(onComplete).toHaveBeenCalledTimes(1);

      // Extra ticks after completion must NOT re-fire onComplete.
      await simulateShakeTicks(10);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------

  describe('effect cleanup', () => {
    it('calls sub.remove() when the component unmounts', async () => {
      const removeSpy = jest.fn();
      mockAccel.addListener.mockReturnValueOnce({ remove: removeSpy });

      const { unmount } = await render(<ShakeActionView {...makeProps()} />);
      await unmount();

      expect(removeSpy).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // BUG: silent soft-lock when expo-sensors is unavailable
  // -------------------------------------------------------------------------

  describe('BUG: unavailable expo-sensors module', () => {
    /**
     * BUG: when expo-sensors/build/Accelerometer throws on require(), the
     * component silently returns from useEffect with no UI feedback.
     * The user is stuck on the shake screen with no way to dismiss.
     *
     * DESIRED behavior: render a fallback bypass/dismiss button so the alarm
     * can still be cleared.
     *
     * This test is RED (failing) because the current implementation does NOT
     * render a fallback — it simply returns early from useEffect.
     */
    it('BUG: should render a bypass/dismiss button when the sensor module is unavailable; currently shows nothing (soft-lock)', async () => {
      // Temporarily override the virtual mock to throw.
      jest.doMock(
        'expo-sensors/build/Accelerometer',
        () => { throw new Error('Native module not found'); },
        { virtual: true },
      );

      // Re-require the component so it picks up the throwing mock.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { ShakeActionView: BrokenShakeView } = require('../ShakeActionView') as {
        ShakeActionView: typeof ShakeActionView;
      };

      const onComplete = jest.fn();
      const { getByText } = await render(
        <BrokenShakeView level="EASY" onComplete={onComplete} />,
      );

      // DESIRED: a dismiss/bypass button appears.
      // ACTUAL (bug): this throws because no such element exists.
      expect(getByText(/dismiss|skip|bypass/i)).toBeTruthy();

      // Restore the working mock for subsequent tests.
      jest.doMock(
        'expo-sensors/build/Accelerometer',
        () => ({ default: mockAccel }),
        { virtual: true },
      );
    });
  });

  // NOTE: Integration tests that verify the rendered second count or progress
  // bar width are intentionally omitted — they would couple to className/style
  // details and provide low signal relative to the maintenance cost.
});
