export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type MathLevel = 'EASY' | 'MEDIUM' | 'MAXIMUM' | 'EXTREME';
export type PuzzleLevel = 'EASY' | 'MEDIUM' | 'MAXIMUM';
export type TypeTextLevel = 'EASY' | 'MEDIUM' | 'MAXIMUM';
export type ShakeLevel = 'EASY' | 'MEDIUM' | 'MAXIMUM' | 'EXTREME';
export type WalkLevel = 'EASY' | 'MEDIUM' | 'MAXIMUM';
export type ActionType = 'BUTTON' | 'MATH' | 'PUZZLE' | 'TYPE_TEXT' | 'SHAKE' | 'WALK' | 'QR_CODE' | 'NFC' | 'PHOTO_MATCH';

export type ActionConfig =
  | { type: 'BUTTON'; position: number }
  | { type: 'MATH'; position: number; level: MathLevel }
  | { type: 'PUZZLE'; position: number; level: PuzzleLevel; imageUri: string | null }
  | { type: 'TYPE_TEXT'; position: number; level: TypeTextLevel }
  | { type: 'SHAKE'; position: number; level: ShakeLevel }
  | { type: 'WALK'; position: number; level: WalkLevel }
  | { type: 'QR_CODE'; position: number; qrCodeValue: string }
  | { type: 'NFC'; position: number; nfcTagId: string }
  | { type: 'PHOTO_MATCH'; position: number; photoUri: string };
