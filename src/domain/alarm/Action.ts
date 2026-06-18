export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type MathLevel = 'MINIMO' | 'MEDIO' | 'MAXIMO' | 'EXTREMO';
export type PuzzleLevel = 'MINIMO' | 'MEDIO' | 'MAXIMO';
export type ActionType = 'BUTTON' | 'MATH' | 'PUZZLE';

export type ActionConfig =
  | { type: 'BUTTON'; position: number }
  | { type: 'MATH'; position: number; level: MathLevel }
  | { type: 'PUZZLE'; position: number; level: PuzzleLevel; imageUri: string | null };
