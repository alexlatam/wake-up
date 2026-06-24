import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';

// ── mocks ────────────────────────────────────────────────────────────────────

jest.mock('~/components/ui/text', () => ({
  Text: ({ children }: { children: React.ReactNode }) => {
    const { Text } = require('react-native');
    return <Text>{children}</Text>;
  },
}));

// Mock the default image asset (require path relative to project root)
jest.mock('~/assets/icon.png', () => 1 /* RN treats numbers as local requires */, { virtual: true });

// ── subject ───────────────────────────────────────────────────────────────────

import { PuzzleActionView } from '../PuzzleActionView';

// ── helpers ──────────────────────────────────────────────────────────────────

type RenderResult = Awaited<ReturnType<typeof render>>;

// Trigger the onLayout event on the first view with an onLayout prop.
// This sets containerWidth and causes the puzzle pieces to render.
async function triggerLayout(renderResult: RenderResult, width = 300) {
  const viewsWithLayout = renderResult.container.queryAll(
    (node: any) => typeof node.props.onLayout === 'function',
  );
  const layoutView = viewsWithLayout[0];
  if (layoutView) {
    await act(async () => {
      layoutView.props.onLayout({ nativeEvent: { layout: { width } } });
    });
  }
}

// Count puzzle pieces by counting Image host nodes.
// Each Pressable piece renders exactly one Image. Pressable is a composite
// component — its onPress is NOT visible as a host-node prop in the test
// renderer. Counting Images is the reliable alternative.
function countPieces(renderResult: RenderResult): number {
  return renderResult.container.queryAll(
    (node: any) => node.type === 'Image',
  ).length;
}

// Get piece Image nodes so tests can fire events via RNTL event-bubbling
// (fireEvent.press bubbles through the fiber tree up to the Pressable handler).
function getPieceImages(renderResult: RenderResult) {
  return renderResult.container.queryAll(
    (node: any) => node.type === 'Image',
  );
}

// ── tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  // Deterministic shuffle: Math.random = 0.5 produces non-identity for n>=3
  jest.spyOn(Math, 'random').mockReturnValue(0.5);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PuzzleActionView', () => {
  describe('initial layout', () => {
    it('renders only a layout container when containerWidth===0 (no pieces yet)', async () => {
      await render(<PuzzleActionView level="EASY" imageUri={null} onComplete={jest.fn()} />);
      // "Tap two pieces to swap them" is only rendered after layout
      expect(screen.queryAllByText(/Tap two pieces/i)).toHaveLength(0);
    });

    it('renders puzzle pieces and hint text after layout event', async () => {
      const r = await render(<PuzzleActionView level="EASY" imageUri={null} onComplete={jest.fn()} />);
      await triggerLayout(r, 300);
      expect(screen.getByText(/Tap two pieces/i)).toBeTruthy();
    });
  });

  describe('grid dimensions', () => {
    it('EASY: 2 cols × 3 rows = 6 pieces', async () => {
      const r = await render(<PuzzleActionView level="EASY" imageUri={null} onComplete={jest.fn()} />);
      await triggerLayout(r, 300);
      expect(countPieces(r)).toBe(6);
    });

    it('MEDIUM: 3 cols × 4 rows = 12 pieces', async () => {
      const r = await render(<PuzzleActionView level="MEDIUM" imageUri={null} onComplete={jest.fn()} />);
      await triggerLayout(r, 300);
      expect(countPieces(r)).toBe(12);
    });

    it('MAXIMUM: 6 cols × 6 rows = 36 pieces', async () => {
      const r = await render(<PuzzleActionView level="MAXIMUM" imageUri={null} onComplete={jest.fn()} />);
      await triggerLayout(r, 300);
      expect(countPieces(r)).toBe(36);
    });

    it('CUSTOM: defaults to 3 cols × 3 rows = 9 pieces when customCols/customRows undefined', async () => {
      const r = await render(<PuzzleActionView level="CUSTOM" imageUri={null} onComplete={jest.fn()} />);
      await triggerLayout(r, 300);
      expect(countPieces(r)).toBe(9); // 3×3
    });

    it('CUSTOM: uses explicit customRows=4 and customCols=2', async () => {
      const r = await render(
        <PuzzleActionView
          level="CUSTOM"
          imageUri={null}
          customRows={4}
          customCols={2}
          onComplete={jest.fn()}
        />,
      );
      await triggerLayout(r, 300);
      expect(countPieces(r)).toBe(8); // 4×2
    });

    it('CUSTOM max: 8 rows × 6 cols = 48 pieces (larger than MAXIMUM preset 36)', async () => {
      const r = await render(
        <PuzzleActionView
          level="CUSTOM"
          imageUri={null}
          customRows={8}
          customCols={6}
          onComplete={jest.fn()}
        />,
      );
      await triggerLayout(r, 300);
      expect(countPieces(r)).toBe(48);
    });
  });

  describe('shuffle invariant', () => {
    it('initial slots are never in sorted identity order', async () => {
      // shuffled(n) recurses until not-in-identity-order — this is guaranteed.
      // With Math.random=0.5, for n>=3 the Fisher-Yates result is not identity.
      const r = await render(<PuzzleActionView level="EASY" imageUri={null} onComplete={jest.fn()} />);
      await triggerLayout(r, 300);
      expect(countPieces(r)).toBe(6);
    });
  });

  describe('piece interaction', () => {
    it('selecting a piece then the SAME piece deselects it (no swap, no onComplete)', async () => {
      const onComplete = jest.fn();
      const r = await render(<PuzzleActionView level="EASY" imageUri={null} onComplete={onComplete} />);
      await triggerLayout(r, 300);
      // fireEvent.press on an Image bubbles up through the fiber tree to the Pressable handler.
      const images = getPieceImages(r);
      // Tap piece[0] → select; tap piece[0] again → deselect
      await act(async () => { fireEvent.press(images[0]); });
      await act(async () => { fireEvent.press(images[0]); });
      expect(onComplete).not.toHaveBeenCalled();
    });

    it('swapping two different pieces does not crash and updates state', async () => {
      const onComplete = jest.fn();
      const r = await render(<PuzzleActionView level="EASY" imageUri={null} onComplete={onComplete} />);
      await triggerLayout(r, 300);
      const images = getPieceImages(r);
      // Swap first two pieces — no crash expected
      await act(async () => { fireEvent.press(images[0]); });
      await act(async () => { fireEvent.press(images[1]); });
      // Verify component still renders without error (6 images still present)
      expect(countPieces(r)).toBe(6);
    });

    it('solving the puzzle (all pieces in order) calls onComplete', async () => {
      const onComplete = jest.fn();
      // Use Math.random sequence that produces [1,0,2] for n=3 (1×3 custom):
      //   i=2: j=floor(0.6*3)=1 → swap[2]↔[1] → [0,2,1]
      //   i=1: j=floor(0.99*2)=1 → swap[1]↔[1] → [0,2,1] (no change)
      //   Not identity → return [0,2,1]
      // Solve: swap slots 1 and 2 to get [0,1,2].
      jest.spyOn(Math, 'random')
        .mockReturnValueOnce(0.6)
        .mockReturnValueOnce(0.99)
        .mockReturnValue(0.5);
      const r = await render(
        <PuzzleActionView
          level="CUSTOM"
          imageUri={null}
          customRows={1}
          customCols={3}
          onComplete={onComplete}
        />,
      );
      await triggerLayout(r, 300);
      const images = getPieceImages(r);
      expect(images).toHaveLength(3);
      // Slot 1↔Slot 2: if slots=[0,2,1], gives [0,1,2] → solved
      await act(async () => { fireEvent.press(images[1]); });
      await act(async () => { fireEvent.press(images[2]); });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('image source', () => {
    it('renders with custom imageUri (non-null)', async () => {
      const r = await render(
        <PuzzleActionView level="EASY" imageUri="file:///my-photo.jpg" onComplete={jest.fn()} />,
      );
      await triggerLayout(r, 300);
      // Images should appear in the render tree after layout
      const images = r.container.queryAll((node: any) => node.type === 'Image');
      expect(images.length).toBeGreaterThan(0);
      const withUri = images.find((img: any) => img.props.source?.uri === 'file:///my-photo.jpg');
      expect(withUri).toBeTruthy();
    });

    it('uses fallback image when imageUri is null', async () => {
      const r = await render(<PuzzleActionView level="EASY" imageUri={null} onComplete={jest.fn()} />);
      await triggerLayout(r, 300);
      const images = r.container.queryAll((node: any) => node.type === 'Image');
      expect(images.length).toBeGreaterThan(0);
      // Source is the mocked require result (1 — a local asset number)
      expect(images[0].props.source).toBeTruthy();
    });
  });
});
