import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react-native';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('~/components/ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

let mockCameraPermission: { granted: boolean } | null = null;
let mockRequestCameraPermission = jest.fn();

// Simple CameraView mock — renders children (overlays live inside CameraView).
// No forwardRef needed: the tests don't test photo capture flow directly.
jest.mock('expo-camera', () => ({
  CameraView: ({ children }: any) => children ?? null,
  useCameraPermissions: () => [mockCameraPermission, mockRequestCameraPermission],
}));

const mockManipulateAsync = jest.fn();
jest.mock('expo-image-manipulator', () => ({
  manipulateAsync: (...args: any[]) => mockManipulateAsync(...args),
  SaveFormat: { PNG: 'png' },
}));

// WebView mock captures onMessage so tests can simulate hash results directly.
let mockWebViewOnMessage: ((event: { nativeEvent: { data: string } }) => void) | null = null;

jest.mock('react-native-webview', () => ({
  __esModule: true,
  default: ({ onMessage }: any) => {
    mockWebViewOnMessage = onMessage;
    return null;
  },
}));

// ── subject ───────────────────────────────────────────────────────────────────

import { PhotoMatchActionView } from '../PhotoMatchActionView';

// ── helpers ──────────────────────────────────────────────────────────────────

async function simulateWebViewResult(distance: number) {
  const match = distance <= 15;
  await act(async () => {
    mockWebViewOnMessage?.({ nativeEvent: { data: JSON.stringify({ distance, match }) } });
  });
}

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockCameraPermission = { granted: true };
  mockRequestCameraPermission = jest.fn().mockResolvedValue({ granted: true });
  mockWebViewOnMessage = null;
  // Default: manipulateAsync resolves with base64 for reference photo
  mockManipulateAsync.mockResolvedValue({ base64: 'refbase64data' });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('PhotoMatchActionView', () => {
  describe('empty photoUri → auto-complete', () => {
    it('calls onComplete immediately when photoUri is empty string', async () => {
      const onComplete = jest.fn();
      await render(<PhotoMatchActionView photoUri="" onComplete={onComplete} />);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('NOTE: empty photoUri is the fallback for an unconfigured PHOTO_MATCH action (saved without taking photo)', () => {
      // This means PHOTO_MATCH actions with empty photoUri are auto-dismissed.
      // Flagged as a bug in docs/edge-cases-and-bugs.md.
      expect(true).toBe(true);
    });
  });

  describe('reference photo manipulation failure → auto-complete', () => {
    it('calls onComplete when manipulateAsync rejects (failure auto-bypasses)', async () => {
      mockManipulateAsync.mockRejectedValue(new Error('manipulation failed'));
      const onComplete = jest.fn();
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={onComplete} />);
      await act(async () => {});
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('idle phase', () => {
    it('renders "Activate Camera" button in idle phase', async () => {
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={jest.fn()} />);
      await act(async () => {}); // wait for manipulateAsync
      expect(screen.getByText(/Activate Camera/i)).toBeTruthy();
    });

    it('shows the reference photo in idle phase when photoUri is set', async () => {
      const r = await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={jest.fn()} />);
      await act(async () => {});
      const images = r.container.queryAll((node: any) => node.type === 'Image');
      const refImage = images.find((img: any) => img.props.source?.uri === 'file:///reference.jpg');
      expect(refImage).toBeTruthy();
    });
  });

  describe('camera activation', () => {
    it('transitions to viewfinder when camera permission is already granted', async () => {
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={jest.fn()} />);
      await act(async () => {});
      await act(async () => {
        fireEvent.press(screen.getByText(/Activate Camera/i));
      });
      expect(screen.getByText(/Point at the same location/i)).toBeTruthy();
    });

    it('does NOT transition when camera permission is denied and cannot be requested', async () => {
      mockCameraPermission = { granted: false };
      mockRequestCameraPermission = jest.fn().mockResolvedValue({ granted: false });
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={jest.fn()} />);
      await act(async () => {});
      await act(async () => {
        fireEvent.press(screen.getByText(/Activate Camera/i));
      });
      // Should remain in idle — no viewfinder text
      expect(screen.queryByText(/Point at the same location/i)).toBeNull();
    });
  });

  describe('perceptual hash matching', () => {
    async function activateCamera() {
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={jest.fn()} />);
      await act(async () => {}); // wait for manipulateAsync
      await act(async () => {
        fireEvent.press(screen.getByText(/Activate Camera/i));
      });
    }

    it('calls onComplete when WebView reports distance=0 (identical images)', async () => {
      const onComplete = jest.fn();
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={onComplete} />);
      await act(async () => {});
      await act(async () => { fireEvent.press(screen.getByText(/Activate Camera/i)); });
      await simulateWebViewResult(0);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('calls onComplete at boundary distance=15 (match=true)', async () => {
      const onComplete = jest.fn();
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={onComplete} />);
      await act(async () => {});
      await act(async () => { fireEvent.press(screen.getByText(/Activate Camera/i)); });
      await simulateWebViewResult(15);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('does NOT call onComplete when distance=16 (above threshold)', async () => {
      const onComplete = jest.fn();
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={onComplete} />);
      await act(async () => {});
      await act(async () => { fireEvent.press(screen.getByText(/Activate Camera/i)); });
      await simulateWebViewResult(16);
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('shows "No match" overlay when distance=64 (maximum distance)', async () => {
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={jest.fn()} />);
      await act(async () => {});
      await act(async () => { fireEvent.press(screen.getByText(/Activate Camera/i)); });
      await simulateWebViewResult(64);
      await waitFor(() => {
        expect(screen.getByText(/No match/i)).toBeTruthy();
      });
    });

    it('NOTE: threshold 15/64 ≈ 23% bit tolerance — perceptual hash is coarse (intentional)', () => {
      // Two visually different images can still produce Hamming distance <= 15.
      // This is a design trade-off for performance (8×8 grayscale aHash).
      // Flagged as BUG-014 in docs/edge-cases-and-bugs.md.
      expect(true).toBe(true);
    });
  });

  describe('WebView message error handling', () => {
    it('falls back to viewfinder on malformed JSON WebView message', async () => {
      await render(<PhotoMatchActionView photoUri="file:///reference.jpg" onComplete={jest.fn()} />);
      await act(async () => {});
      await act(async () => { fireEvent.press(screen.getByText(/Activate Camera/i)); });
      await act(async () => {
        mockWebViewOnMessage?.({ nativeEvent: { data: 'NOT_VALID_JSON' } });
      });
      // catch → setPhase('viewfinder') → still shows viewfinder hint
      expect(screen.getByText(/Point at the same location/i)).toBeTruthy();
    });
  });
});
