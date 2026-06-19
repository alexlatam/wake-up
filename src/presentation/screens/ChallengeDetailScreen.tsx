import { ScrollView, View } from 'react-native';
import { Text } from '~/components/ui/text';
import type { ActionType } from '@/domain/alarm/Action';

type LevelRow = { label: string; sublabel: string; description: string };

type ChallengeDetail = {
  type: ActionType;
  icon: string;
  name: string;
  tagline: string;
  description: string;
  howItWorks: string[];
  levels?: LevelRow[];
  tip?: string;
};

const DETAILS: Record<ActionType, ChallengeDetail> = {
  BUTTON: {
    type: 'BUTTON',
    icon: '🔴',
    name: 'Quick Dismiss',
    tagline: 'One tap. Alarm off.',
    description:
      'A large red button fills your screen the moment your alarm rings. Tap it once to dismiss the alarm completely. No math, no puzzles — just direct control.',
    howItWorks: [
      'Your alarm fires and the ringing screen appears.',
      'A large circular button is displayed front and center.',
      'Tap the button once to stop the alarm.',
    ],
    tip: 'Best for: light sleepers or anyone who wants a simple, friction-free alarm.',
  },
  MATH: {
    type: 'MATH',
    icon: '🧮',
    name: 'Math Challenge',
    tagline: 'Solve to silence.',
    description:
      'A math problem appears when your alarm rings. Type the correct answer to dismiss it. A wrong answer clears the field — you must try again. The math gets harder as the level increases.',
    howItWorks: [
      'Your alarm fires and a math problem appears on screen.',
      'Type your answer using the numeric keypad.',
      'Correct answer → alarm dismissed.',
      'Wrong answer → field clears, try again.',
    ],
    levels: [
      { label: 'Easy', sublabel: 'EASY', description: 'Simple addition and subtraction. Quick mental math.' },
      { label: 'Medium', sublabel: 'MEDIUM', description: 'Multiplication and division. Requires a bit more focus.' },
      { label: 'Hard', sublabel: 'MAXIMUM', description: 'Multi-step operations. You need to fully wake up to solve these.' },
      { label: 'Extreme', sublabel: 'EXTREME', description: 'Complex multi-operation problems. No sleepy shortcuts here.' },
    ],
    tip: 'Best for: people who want to boot their brain before getting out of bed.',
  },
  PUZZLE: {
    type: 'PUZZLE',
    icon: '🧩',
    name: 'Image Puzzle',
    tagline: 'Reassemble to rise.',
    description:
      'Your chosen photo is cut into tiles and randomly shuffled. Tap two tiles to swap their positions. Restore the original image to dismiss the alarm.',
    howItWorks: [
      'Your alarm fires and your image appears — cut into scrambled tiles.',
      'Tap a tile to select it (it highlights in yellow).',
      'Tap another tile to swap the two.',
      'Keep swapping until the image is fully restored.',
      'When all tiles are in the correct position, the alarm dismisses automatically.',
    ],
    levels: [
      { label: '6 tiles', sublabel: 'EASY', description: '2 × 3 grid. A few swaps and you\'re done.' },
      { label: '12 tiles', sublabel: 'MEDIUM', description: '3 × 4 grid. Takes some visual tracking.' },
      { label: '36 tiles', sublabel: 'MAXIMUM', description: '6 × 6 grid. Requires sustained focus — no drifting back to sleep.' },
    ],
    tip: 'Best for: visual thinkers or anyone who wants a more hands-on wake-up challenge.',
  },
  TYPE_TEXT: {
    type: 'TYPE_TEXT',
    icon: '⌨️',
    name: 'Type Text',
    tagline: 'Write it to wake up.',
    description:
      'A phrase appears on screen when your alarm rings. Type it exactly — character by character — to dismiss the alarm. A wrong submission clears the field and you must try again. Phrases get longer and more demanding as the level increases.',
    howItWorks: [
      'Your alarm fires and a phrase appears on screen.',
      'Read it carefully, then type it exactly in the input field.',
      'Correct match → alarm dismissed.',
      'Wrong submission → field clears, try again.',
    ],
    levels: [
      { label: 'Easy', sublabel: 'EASY', description: 'One short sentence, up to 10 words. Fast to type.' },
      { label: 'Medium', sublabel: 'MEDIUM', description: 'Three sentences, each up to 15 words. Requires sustained attention.' },
      { label: 'Maximum', sublabel: 'MAXIMUM', description: 'A full paragraph of 80 to 120 words. No shortcuts — you must read and type it all.' },
    ],
    tip: 'Best for: people who need a real cognitive task to break out of sleep mode.',
  },
  SHAKE: {
    type: 'SHAKE',
    icon: '📳',
    name: 'Shake',
    tagline: 'Move to dismiss.',
    description:
      'Shake your phone continuously for a fixed amount of time to dismiss the alarm. The timer only advances while you are actively shaking — stop and the count pauses. You have to keep going until the full duration is complete.',
    howItWorks: [
      'Your alarm fires and the shake screen appears.',
      'Pick up your phone and shake it.',
      'The counter advances only while the phone is in motion.',
      'Pause and the counter stops — resume shaking to continue.',
      'Reach the target duration and the alarm dismisses.',
    ],
    levels: [
      { label: 'Easy', sublabel: 'EASY', description: '3 seconds of shaking. A quick jolt to break you out of sleep.' },
      { label: 'Medium', sublabel: 'MEDIUM', description: '10 seconds. Enough to get your arm moving and your eyes open.' },
      { label: 'Maximum', sublabel: 'MAXIMUM', description: '30 seconds of continuous shaking. Requires real sustained effort.' },
      { label: 'Extreme', sublabel: 'EXTREME', description: '2 full minutes. You will be wide awake long before you finish.' },
    ],
    tip: 'Best for: heavy sleepers who need physical activity to fully wake up.',
  },
  WALK: {
    type: 'WALK',
    icon: '🚶',
    name: 'Walk',
    tagline: 'Step to silence.',
    description:
      'Walk a set number of steps with your phone in hand to dismiss the alarm. Your phone\'s built-in pedometer counts every step. You have to physically get up and move — there is no shortcut.',
    howItWorks: [
      'Your alarm fires and the walk screen appears.',
      'Get out of bed and start walking with your phone.',
      'The step counter tracks your progress in real time.',
      'Reach the target step count and the alarm dismisses.',
    ],
    levels: [
      { label: 'Easy', sublabel: 'EASY', description: '15 steps. Just enough to get you out of bed and moving.' },
      { label: 'Medium', sublabel: 'MEDIUM', description: '35 steps. A short walk around the room.' },
      { label: 'Maximum', sublabel: 'MAXIMUM', description: '100 steps. Requires a proper walk — no going back to bed.' },
    ],
    tip: 'Best for: people who need to physically move to break the sleep cycle.',
  },
  QR_CODE: {
    type: 'QR_CODE',
    icon: '📷',
    name: 'QR Code',
    tagline: 'Find it to silence it.',
    description:
      'Scan a specific QR code to dismiss the alarm. You choose the QR code when setting up the alarm — it could be on a product in your kitchen, a card in another room, or anything you keep away from your bed.',
    howItWorks: [
      'When creating or editing the alarm, tap "Scan QR code" and scan any QR code.',
      'That QR code value is saved to the alarm.',
      'When the alarm rings, the camera opens automatically.',
      'Point the camera at your saved QR code.',
      'Correct code → alarm dismissed. Wrong code → try again.',
    ],
    tip: 'Best for: people who want to be forced out of bed to reach the QR code.',
  },
};

function HowItWorksStep({ index, text }: { index: number; text: string }) {
  return (
    <View className="mb-3 flex-row gap-3">
      <View className="mt-0.5 h-6 w-6 items-center justify-center rounded-full bg-primary/20">
        <Text className="text-xs font-bold text-primary">{index}</Text>
      </View>
      <Text className="flex-1 text-sm leading-relaxed text-foreground">{text}</Text>
    </View>
  );
}

function LevelBadge({ row }: { row: LevelRow }) {
  return (
    <View className="mb-3 rounded-xl border border-border bg-card p-4">
      <View className="mb-1 flex-row items-center gap-2">
        <Text className="text-base font-bold text-foreground">{row.label}</Text>
        <View className="rounded-md bg-muted px-2 py-0.5">
          <Text className="text-xs font-medium text-muted-foreground">{row.sublabel}</Text>
        </View>
      </View>
      <Text className="text-sm leading-relaxed text-muted-foreground">{row.description}</Text>
    </View>
  );
}

export function ChallengeDetailScreen({ type }: { type: ActionType }) {
  const detail = DETAILS[type];

  if (!detail) return null;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
    >
      {/* Hero */}
      <View className="mb-6 items-center py-8">
        <Text className="mb-3 text-7xl">{detail.icon}</Text>
        <Text className="text-3xl font-bold text-foreground">{detail.name}</Text>
        <Text className="mt-1 text-base font-medium text-primary">{detail.tagline}</Text>
      </View>

      {/* Description */}
      <View className="mb-6 rounded-2xl border border-border bg-card p-5">
        <Text className="text-base leading-7 text-foreground">{detail.description}</Text>
      </View>

      {/* How it works */}
      <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        How it works
      </Text>
      <View className="mb-6">
        {detail.howItWorks.map((step, i) => (
          <HowItWorksStep key={i} index={i + 1} text={step} />
        ))}
      </View>

      {/* Difficulty levels */}
      {detail.levels && detail.levels.length > 0 && (
        <>
          <Text className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Difficulty levels
          </Text>
          <View className="mb-6">
            {detail.levels.map((level) => (
              <LevelBadge key={level.sublabel} row={level} />
            ))}
          </View>
        </>
      )}

      {/* Tip */}
      {detail.tip && (
        <View className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Text className="text-sm leading-relaxed text-primary">{detail.tip}</Text>
        </View>
      )}
    </ScrollView>
  );
}
