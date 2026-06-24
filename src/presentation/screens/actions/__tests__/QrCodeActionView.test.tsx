import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('~/components/ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

let mockOnBarcodeScanned: ((event: { data: string }) => void) | null = null;
let mockPermission: { granted: boolean } | null = null;
let mockRequestPermission = jest.fn();

jest.mock('expo-camera', () => ({
  CameraView: ({ onBarcodeScanned }: any) => {
    mockOnBarcodeScanned = onBarcodeScanned;
    return null;
  },
  useCameraPermissions: () => [mockPermission, mockRequestPermission],
}));

// ── subject ───────────────────────────────────────────────────────────────────

import { QrCodeActionView } from '../QrCodeActionView';

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.useFakeTimers();
  mockOnBarcodeScanned = null;
  mockPermission = null;
  mockRequestPermission = jest.fn();
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
});

describe('QrCodeActionView', () => {
  describe('camera permission', () => {
    it('shows loading state while permission is null', async () => {
      mockPermission = null;
      await render(<QrCodeActionView qrCodeValue="https://qr.test" onComplete={jest.fn()} />);
      expect(screen.getByText(/Requesting camera/i)).toBeTruthy();
    });

    it('requests permission on mount when not granted', async () => {
      mockPermission = { granted: false };
      await render(<QrCodeActionView qrCodeValue="https://qr.test" onComplete={jest.fn()} />);
      expect(mockRequestPermission).toHaveBeenCalled();
    });

    it('shows grant permission button when permission denied', async () => {
      mockPermission = { granted: false };
      await render(<QrCodeActionView qrCodeValue="https://qr.test" onComplete={jest.fn()} />);
      expect(screen.getByText(/Grant Permission/i)).toBeTruthy();
    });

    it('pressing "Grant Permission" calls requestPermission', async () => {
      mockPermission = { granted: false };
      await render(<QrCodeActionView qrCodeValue="https://qr.test" onComplete={jest.fn()} />);
      fireEvent.press(screen.getByText(/Grant Permission/i));
      expect(mockRequestPermission).toHaveBeenCalled();
    });
  });

  describe('QR scanning — correct value', () => {
    beforeEach(() => { mockPermission = { granted: true }; });

    it('calls onComplete when scanned data matches qrCodeValue (exact)', async () => {
      const onComplete = jest.fn();
      await render(<QrCodeActionView qrCodeValue="https://qr.test" onComplete={onComplete} />);
      await act(async () => { mockOnBarcodeScanned?.({ data: 'https://qr.test' }); });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does not call onComplete for partial match', async () => {
      const onComplete = jest.fn();
      await render(<QrCodeActionView qrCodeValue="https://qr.test" onComplete={onComplete} />);
      await act(async () => { mockOnBarcodeScanned?.({ data: 'https://qr.tes' }); });
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('completedRef prevents double-firing on rapid scan', async () => {
      const onComplete = jest.fn();
      await render(<QrCodeActionView qrCodeValue="match" onComplete={onComplete} />);
      await act(async () => {
        mockOnBarcodeScanned?.({ data: 'match' });
        mockOnBarcodeScanned?.({ data: 'match' });
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('QR scanning — wrong value', () => {
    beforeEach(() => { mockPermission = { granted: true }; });

    it('does not call onComplete on wrong scan', async () => {
      const onComplete = jest.fn();
      await render(<QrCodeActionView qrCodeValue="correct-value" onComplete={onComplete} />);
      await act(async () => { mockOnBarcodeScanned?.({ data: 'wrong-value' }); });
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('shows "Wrong QR code" message after wrong scan', async () => {
      await render(<QrCodeActionView qrCodeValue="correct-value" onComplete={jest.fn()} />);
      await act(async () => { mockOnBarcodeScanned?.({ data: 'wrong-value' }); });
      expect(screen.getByText(/Wrong QR code/i)).toBeTruthy();
    });

    it('cooldownRef blocks further scans during 1500ms cooldown', async () => {
      const onComplete = jest.fn();
      await render(<QrCodeActionView qrCodeValue="correct-value" onComplete={onComplete} />);
      await act(async () => {
        mockOnBarcodeScanned?.({ data: 'wrong-value' }); // triggers cooldown
        mockOnBarcodeScanned?.({ data: 'correct-value' }); // blocked by cooldownRef
      });
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('allows scan after 1500ms cooldown expires', async () => {
      const onComplete = jest.fn();
      await render(<QrCodeActionView qrCodeValue="correct-value" onComplete={onComplete} />);
      await act(async () => { mockOnBarcodeScanned?.({ data: 'wrong-value' }); });
      await act(async () => { jest.advanceTimersByTime(1500); });
      await act(async () => { mockOnBarcodeScanned?.({ data: 'correct-value' }); });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('empty qrCodeValue', () => {
    it('BUG: qrCodeValue="" results in unsolvable challenge — no real QR can ever match empty string', async () => {
      // Current behavior: `data === qrCodeValue` means `data === ""`.
      // No real barcode scan ever returns "". Alarm becomes permanently unsolvable.
      // DESIRED: auto-bypass when qrCodeValue is empty (or validation at save time).
      // This test WILL FAIL (red) — current code does nothing special for empty qrCodeValue.
      const onComplete = jest.fn();
      mockPermission = { granted: true };
      await render(<QrCodeActionView qrCodeValue="" onComplete={onComplete} />);
      // Desired: onComplete called immediately on empty value (auto-bypass)
      expect(onComplete).toHaveBeenCalled();
    });
  });
});
