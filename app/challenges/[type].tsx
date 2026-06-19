import { Stack, useLocalSearchParams } from 'expo-router';
import { ChallengeDetailScreen } from '@/presentation/screens/ChallengeDetailScreen';
import type { ActionType } from '@/domain/alarm/Action';

const VALID_TYPES: ActionType[] = ['BUTTON', 'MATH', 'PUZZLE', 'TYPE_TEXT', 'SHAKE', 'WALK', 'QR_CODE', 'NFC', 'PHOTO_MATCH'];

const NAMES: Record<ActionType, string> = {
  BUTTON: 'Quick Dismiss',
  MATH: 'Math Challenge',
  PUZZLE: 'Image Puzzle',
  TYPE_TEXT: 'Type Text',
  SHAKE: 'Shake',
  WALK: 'Walk',
  QR_CODE: 'QR Code',
  NFC: 'NFC Tag',
  PHOTO_MATCH: 'Photo Match',
};

export default function ChallengeDetailRoute() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const actionType = VALID_TYPES.find((t) => t === type);
  if (!actionType) return null;
  return (
    <>
      <Stack.Screen options={{ title: NAMES[actionType] }} />
      <ChallengeDetailScreen type={actionType} />
    </>
  );
}
