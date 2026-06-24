import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('~/components/ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

// Inline factory — no external variable reference, avoids hoisting issues.
jest.mock('react-native-nfc-manager', () => ({
  __esModule: true,
  default: {
    isSupported: jest.fn(),
    start: jest.fn(),
    requestTechnology: jest.fn(),
    getTag: jest.fn(),
    cancelTechnologyRequest: jest.fn(),
  },
  NfcTech: { Ndef: 'Ndef' },
}));

// ── subject ───────────────────────────────────────────────────────────────────

import { NfcActionView } from '../NfcActionView';

// ── helpers ──────────────────────────────────────────────────────────────────

// Access the mocked NfcManager via jest.requireMock (avoids top-level native import
// which triggers _ReactNativeCSSInterop injection in the test file scope).
const mockNfc = jest.requireMock('react-native-nfc-manager').default as {
  isSupported: jest.Mock;
  start: jest.Mock;
  requestTechnology: jest.Mock;
  getTag: jest.Mock;
  cancelTechnologyRequest: jest.Mock;
};

function setupSupportedNfc(tagId = 'ABC123') {
  mockNfc.isSupported.mockResolvedValue(true);
  mockNfc.start.mockResolvedValue(undefined);
  mockNfc.requestTechnology.mockResolvedValue(undefined);
  mockNfc.getTag.mockResolvedValue({ id: tagId });
}

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockNfc.cancelTechnologyRequest.mockResolvedValue(undefined);
});

describe('NfcActionView', () => {
  describe('unsupported device', () => {
    it('shows "Dismiss anyway" bypass button when NFC unsupported', async () => {
      mockNfc.isSupported.mockResolvedValue(false);
      await render(<NfcActionView nfcTagId="tag-123" onComplete={jest.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/Dismiss anyway/i)).toBeTruthy();
      });
    });

    it('"Dismiss anyway" button calls onComplete', async () => {
      mockNfc.isSupported.mockResolvedValue(false);
      const onComplete = jest.fn();
      await render(<NfcActionView nfcTagId="tag-123" onComplete={onComplete} />);
      await waitFor(() => {
        expect(screen.getByText(/Dismiss anyway/i)).toBeTruthy();
      });
      fireEvent.press(screen.getByText(/Dismiss anyway/i));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('NFC tag matching', () => {
    it('calls onComplete when tag.id matches nfcTagId (exact lowercase)', async () => {
      setupSupportedNfc('abc123');
      const onComplete = jest.fn();
      await render(<NfcActionView nfcTagId="abc123" onComplete={onComplete} />);
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('case-insensitive: nfcTagId uppercase matches lowercase tag.id', async () => {
      setupSupportedNfc('abc123');
      const onComplete = jest.fn();
      await render(<NfcActionView nfcTagId="ABC123" onComplete={onComplete} />);
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('case-insensitive: tag.id uppercase matches lowercase nfcTagId', async () => {
      setupSupportedNfc('ABC123');
      const onComplete = jest.fn();
      await render(<NfcActionView nfcTagId="abc123" onComplete={onComplete} />);
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
    });

    it('wrong tag id → shows "Wrong tag" message, does NOT call onComplete', async () => {
      setupSupportedNfc('wrong-id');
      const onComplete = jest.fn();
      await render(<NfcActionView nfcTagId="correct-id" onComplete={onComplete} />);
      await waitFor(() => {
        expect(screen.getByText(/Wrong tag/i)).toBeTruthy();
      });
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('shows "Scan again" button on wrong tag', async () => {
      setupSupportedNfc('wrong-id');
      await render(<NfcActionView nfcTagId="correct-id" onComplete={jest.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/Scan again/i)).toBeTruthy();
      });
    });

    it('tag.id null/undefined → treated as empty string "" via (tag?.id ?? "")', async () => {
      mockNfc.isSupported.mockResolvedValue(true);
      mockNfc.start.mockResolvedValue(undefined);
      mockNfc.requestTechnology.mockResolvedValue(undefined);
      mockNfc.getTag.mockResolvedValue({ id: null });
      const onComplete = jest.fn();
      await render(<NfcActionView nfcTagId="expected-tag" onComplete={onComplete} />);
      // Wait for scan to complete
      await waitFor(() => {
        // Should show wrong tag, not call onComplete
        expect(screen.getByText(/Wrong tag/i)).toBeTruthy();
      });
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('BUG: empty nfcTagId "" matches any tag with empty/null id — alarm trivially bypassable', async () => {
      // Current behavior: nfcTagId.toLowerCase()="" matches tagId="" (from null tag.id)
      // DESIRED: Reject empty nfcTagId at save time, or require non-empty match.
      // This test WILL FAIL (red) — current code calls onComplete when both IDs are "".
      mockNfc.isSupported.mockResolvedValue(true);
      mockNfc.start.mockResolvedValue(undefined);
      mockNfc.requestTechnology.mockResolvedValue(undefined);
      mockNfc.getTag.mockResolvedValue({ id: null }); // null id → ''
      const onComplete = jest.fn();
      await render(<NfcActionView nfcTagId="" onComplete={onComplete} />);
      // Wait for scan to complete
      await act(async () => {});
      // Desired: NOT called when nfcTagId is empty (invalid configuration)
      // Current: IS called because '' === '' → this assertion FAILS (expected RED)
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('NFC error', () => {
    it('shows "Scan timed out" on requestTechnology error', async () => {
      mockNfc.isSupported.mockResolvedValue(true);
      mockNfc.start.mockResolvedValue(undefined);
      mockNfc.requestTechnology.mockRejectedValue(new Error('timeout'));
      await render(<NfcActionView nfcTagId="tag-123" onComplete={jest.fn()} />);
      await waitFor(() => {
        expect(screen.getByText(/Scan timed out/i)).toBeTruthy();
      });
    });

    it('cancelTechnologyRequest called on unmount', async () => {
      setupSupportedNfc('wrong-tag');
      const { unmount } = await render(<NfcActionView nfcTagId="correct" onComplete={jest.fn()} />);
      await act(async () => {});
      unmount();
      expect(mockNfc.cancelTechnologyRequest).toHaveBeenCalled();
    });
  });

  describe('scan guard', () => {
    it('completedRef prevents double-firing after successful scan', async () => {
      setupSupportedNfc('tag-123');
      const onComplete = jest.fn();
      await render(<NfcActionView nfcTagId="tag-123" onComplete={onComplete} />);
      await waitFor(() => {
        expect(onComplete).toHaveBeenCalledTimes(1);
      });
      // No second call — completedRef.current=true
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });
});
