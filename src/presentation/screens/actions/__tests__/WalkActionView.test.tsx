import React from 'react';
import { render, act } from '@testing-library/react-native';
import type { WalkLevel } from '@/domain/alarm/Action';

// ---------------------------------------------------------------------------
// Pedometer mock
// ---------------------------------------------------------------------------
// NOTE: jest.mock is hoisted to the top of the file. Variables declared with
// let/const are NOT accessible inside the factory at hoist time. We keep a
// module-level ref that the factory can read after initialisation via a
// factory-level closure object that we mutate post-hoist.
// ---------------------------------------------------------------------------

let mockStepCallback: ((result: { steps: number }) => void) | null = null;
const mockRemove = jest.fn();

// We define the mock methods as standalone jest.fn() so we can re-configure
// them per-test. The factory references them by name via require() — see below.
const mockRequestPermissions = jest.fn().mockResolvedValue({ granted: true });
const mockIsAvailable = jest.fn().mockResolvedValue(true);
const mockWatchStepCount = jest.fn((cb: (result: { steps: number }) => void) => {
  mockStepCallback = cb;
  return { remove: mockRemove };
});

jest.mock('expo-sensors', () => {
  // Re-require the shared mock functions that were defined above.
  // This avoids the hoisting problem: the factory runs in module scope
  // but these objects are referenced lazily through the jest module registry.
  return {
    Pedometer: {
      requestPermissionsAsync: (...args: unknown[]) =>
        mockRequestPermissions(...args),
      isAvailableAsync: (...args: unknown[]) => mockIsAvailable(...args),
      watchStepCount: (cb: (result: { steps: number }) => void) =>
        mockWatchStepCount(cb),
    },
    Accelerometer: {
      setUpdateInterval: jest.fn(),
      addListener: jest.fn(() => ({ remove: jest.fn() })),
    },
  };
});

// ---------------------------------------------------------------------------
// UI component mock — ~/ maps to project root per jest.config.js
// ---------------------------------------------------------------------------
jest.mock('~/components/ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text: RNText } = require('react-native');
    return <RNText>{children}</RNText>;
  },
}));

// ---------------------------------------------------------------------------
// Subject under test
// ---------------------------------------------------------------------------
import { WalkActionView } from '../WalkActionView';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const makeProps = (level: WalkLevel, onComplete = jest.fn()) => ({
  level,
  onComplete,
});

/** Flush the async IIFE inside useEffect */
const flushAsync = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve(); // two ticks to cover both await points in the IIFE
  });
};

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('WalkActionView', () => {
  beforeEach(() => {
    mockStepCallback = null;
    mockRemove.mockClear();
    mockRequestPermissions.mockClear();
    mockRequestPermissions.mockResolvedValue({ granted: true });
    mockIsAvailable.mockClear();
    mockIsAvailable.mockResolvedValue(true);
    mockWatchStepCount.mockClear();
    mockWatchStepCount.mockImplementation((cb: (result: { steps: number }) => void) => {
      mockStepCallback = cb;
      return { remove: mockRemove };
    });
  });

  // -------------------------------------------------------------------------
  // EASY — target 15
  // -------------------------------------------------------------------------
  describe('EASY level (target 15)', () => {
    it('calls onComplete when step count reaches 15', async () => {
      const onComplete = jest.fn();
      await render(<WalkActionView {...makeProps('EASY', onComplete)} />);
      await flushAsync();

      await act(async () => {
        mockStepCallback?.({ steps: 15 });
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onComplete when steps are below target', async () => {
      const onComplete = jest.fn();
      await render(<WalkActionView {...makeProps('EASY', onComplete)} />);
      await flushAsync();

      await act(async () => {
        mockStepCallback?.({ steps: 14 });
      });

      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // MEDIUM — target 35
  // -------------------------------------------------------------------------
  describe('MEDIUM level (target 35)', () => {
    it('does NOT call onComplete at 34 steps', async () => {
      const onComplete = jest.fn();
      await render(<WalkActionView {...makeProps('MEDIUM', onComplete)} />);
      await flushAsync();

      await act(async () => {
        mockStepCallback?.({ steps: 34 });
      });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('calls onComplete at exactly 35 steps', async () => {
      const onComplete = jest.fn();
      await render(<WalkActionView {...makeProps('MEDIUM', onComplete)} />);
      await flushAsync();

      await act(async () => {
        mockStepCallback?.({ steps: 34 });
      });
      await act(async () => {
        mockStepCallback?.({ steps: 35 });
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // MAXIMUM — target 100
  // -------------------------------------------------------------------------
  describe('MAXIMUM level (target 100)', () => {
    it('does NOT call onComplete at 99 steps', async () => {
      const onComplete = jest.fn();
      await render(<WalkActionView {...makeProps('MAXIMUM', onComplete)} />);
      await flushAsync();

      await act(async () => {
        mockStepCallback?.({ steps: 99 });
      });

      expect(onComplete).not.toHaveBeenCalled();
    });

    it('calls onComplete at exactly 100 steps', async () => {
      const onComplete = jest.fn();
      await render(<WalkActionView {...makeProps('MAXIMUM', onComplete)} />);
      await flushAsync();

      await act(async () => {
        mockStepCallback?.({ steps: 100 });
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // Step counting is cumulative, not delta
  // NOTE: The component receives total step count from the pedometer; it is
  //       not expected to sum individual deltas. Tests above already cover
  //       the cumulative behaviour implicitly.
  // -------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // doneRef guard — onComplete fires exactly once
  // -------------------------------------------------------------------------
  describe('doneRef guard', () => {
    it('does not re-fire onComplete on subsequent step events after completion', async () => {
      const onComplete = jest.fn();
      await render(<WalkActionView {...makeProps('EASY', onComplete)} />);
      await flushAsync();

      await act(async () => {
        mockStepCallback?.({ steps: 15 });
      });
      await act(async () => {
        mockStepCallback?.({ steps: 20 });
      });
      await act(async () => {
        mockStepCallback?.({ steps: 30 });
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // BUG tests — these assert DESIRED behaviour and will FAIL until fixed
  // -------------------------------------------------------------------------
  describe('BUG: permission denied causes silent soft-lock', () => {
    it('BUG: when permission denied, should show bypass/dismiss button; currently silent soft-lock', async () => {
      mockRequestPermissions.mockResolvedValueOnce({ granted: false });

      const { queryByRole } = await render(<WalkActionView {...makeProps('EASY')} />);
      await flushAsync();

      // Desired: a bypass/dismiss button is rendered so the user is not stuck
      // Current: no such button — this assertion will FAIL (red)
      expect(queryByRole('button')).not.toBeNull();
    });
  });

  describe('BUG: pedometer unavailable causes silent soft-lock', () => {
    it('BUG: when pedometer unavailable, should show bypass/dismiss button; currently silent soft-lock', async () => {
      mockRequestPermissions.mockResolvedValueOnce({ granted: true });
      mockIsAvailable.mockResolvedValueOnce(false);

      const { queryByRole } = await render(<WalkActionView {...makeProps('EASY')} />);
      await flushAsync();

      // Desired: a bypass/dismiss button is rendered so the user is not stuck
      // Current: no such button — this assertion will FAIL (red)
      expect(queryByRole('button')).not.toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  describe('cleanup', () => {
    it('calls subscription remove() when the component unmounts', async () => {
      const { unmount } = await render(<WalkActionView {...makeProps('EASY')} />);
      await flushAsync();

      await unmount();

      expect(mockRemove).toHaveBeenCalledTimes(1);
    });
  });
});
