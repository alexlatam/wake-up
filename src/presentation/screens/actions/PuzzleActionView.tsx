import { useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { PuzzleLevel } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';

// Default image shown when user hasn't selected one.
const DEFAULT_IMAGE = require('~/assets/icon.png');

const GRID: Record<PuzzleLevel, { cols: number; rows: number }> = {
  MINIMO: { cols: 2, rows: 3 },
  MEDIO:  { cols: 3, rows: 4 },
  MAXIMO: { cols: 6, rows: 6 },
};

function shuffled(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  // Guarantee it's not in original order
  const inOrder = arr.every((v, i) => v === i);
  return inOrder ? shuffled(n) : arr;
}

export function PuzzleActionView({
  level,
  imageUri,
  onComplete,
}: {
  level: PuzzleLevel;
  imageUri: string | null;
  onComplete: () => void;
}) {
  const { cols, rows } = GRID[level];
  const n = cols * rows;

  // slots[slotIndex] = pieceId (original position of the piece currently in that slot)
  const [slots, setSlots] = useState<number[]>(() => shuffled(n));
  const [selected, setSelected] = useState<number | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  const source = imageUri ? { uri: imageUri } : DEFAULT_IMAGE;
  const pieceW = containerWidth > 0 ? containerWidth / cols : 0;
  const pieceH = pieceW; // square pieces
  const puzzleH = pieceH * rows;

  function handlePress(slotIndex: number) {
    if (selected === null) {
      setSelected(slotIndex);
      return;
    }
    if (selected === slotIndex) {
      setSelected(null);
      return;
    }
    const next = [...slots];
    [next[selected], next[slotIndex]] = [next[slotIndex], next[selected]];
    setSelected(null);
    setSlots(next);

    if (next.every((pid, i) => pid === i)) {
      onComplete();
    }
  }

  if (containerWidth === 0) {
    return (
      <View
        className="flex-1"
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      />
    );
  }

  return (
    <View
      className="flex-1 px-2"
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width - 16; // account for px-2
        if (Math.abs(w - containerWidth) > 1) setContainerWidth(w);
      }}
    >
      <Text className="mb-3 text-center text-sm text-white/60">
        Toca dos piezas para intercambiarlas
      </Text>

      <View style={{ width: containerWidth, height: puzzleH, flexDirection: 'row', flexWrap: 'wrap' }}>
        {slots.map((pieceId, slotIndex) => {
          const origCol = pieceId % cols;
          const origRow = Math.floor(pieceId / cols);
          const isSelected = selected === slotIndex;

          return (
            <Pressable
              key={slotIndex}
              onPress={() => handlePress(slotIndex)}
              style={{
                width: pieceW,
                height: pieceH,
                overflow: 'hidden',
                borderWidth: isSelected ? 2 : 0.5,
                borderColor: isSelected ? '#facc15' : 'rgba(0,0,0,0.4)',
                opacity: isSelected ? 0.75 : 1,
              }}
            >
              <Image
                source={source}
                style={{
                  width: containerWidth,
                  height: puzzleH,
                  position: 'absolute',
                  left: -origCol * pieceW,
                  top: -origRow * pieceH,
                }}
                resizeMode="cover"
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
