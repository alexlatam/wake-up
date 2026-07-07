import { useCallback, useEffect, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Switch,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import { useRouter } from 'expo-router';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAlarms } from '@/presentation/hooks/useAlarms';
import { getContainer } from '@/infrastructure/di/container';
import { useTranslation } from '@/presentation/i18n/LanguageContext';
import type { ActionConfig, ActionType, MathLevel, PuzzleLevel, ShakeLevel, TypeTextLevel, WalkLevel, Weekday } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';

// ─── Types ───────────────────────────────────────────────────────────────────

type DraftAction =
  | { type: 'BUTTON' }
  | { type: 'MATH'; level: MathLevel }
  | { type: 'PUZZLE'; level: PuzzleLevel; imageUri: string | null; customRows: number; customCols: number }
  | { type: 'TYPE_TEXT'; level: TypeTextLevel; customWordCount: number }
  | { type: 'SHAKE'; level: ShakeLevel; customSeconds: number }
  | { type: 'WALK'; level: WalkLevel }
  | { type: 'QR_CODE'; qrCodeValue: string | null }
  | { type: 'NFC'; nfcTagId: string | null }
  | { type: 'PHOTO_MATCH'; photoUri: string | null };

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKDAY_LABELS: { day: Weekday }[] = [
  { day: 0 },
  { day: 1 },
  { day: 2 },
  { day: 3 },
  { day: 4 },
  { day: 5 },
  { day: 6 },
];

const MATH_LEVELS: MathLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM', 'EXTREME'];
const WALK_LEVELS: WalkLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM'];
const SHAKE_LEVELS: ShakeLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM', 'EXTREME', 'CUSTOM'];
const TYPE_TEXT_LEVELS: TypeTextLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM', 'CUSTOM'];
const PUZZLE_LEVELS: PuzzleLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM', 'CUSTOM'];

// ─── Grid stepper ─────────────────────────────────────────────────────────────

function GridStepper({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => onChange(Math.max(min, value - step))}
          className="h-9 w-9 items-center justify-center rounded-lg bg-background active:opacity-60"
        >
          <Text className="text-lg font-semibold text-foreground">−</Text>
        </Pressable>
        <Text className="w-12 text-center text-base font-semibold text-foreground">
          {value}{unit ? ` ${unit}` : ''}
        </Text>
        <Pressable
          onPress={() => onChange(Math.min(max, value + step))}
          className="h-9 w-9 items-center justify-center rounded-lg bg-background active:opacity-60"
        >
          <Text className="text-lg font-semibold text-foreground">+</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </Text>
  );
}

// ─── Day picker ───────────────────────────────────────────────────────────────

function DayPicker({
  selected,
  onChange,
}: {
  selected: Set<Weekday>;
  onChange: (days: Set<Weekday>) => void;
}) {
  const { t } = useTranslation();

  function toggle(day: Weekday) {
    const next = new Set(selected);
    if (next.has(day)) {
      if (next.size > 1) next.delete(day);
    } else {
      next.add(day);
    }
    onChange(next);
  }
  return (
    <View className="flex-row justify-between">
      {WEEKDAY_LABELS.map(({ day }) => {
        const active = selected.has(day);
        return (
          <Pressable
            key={day}
            onPress={() => toggle(day)}
            className={`h-11 w-11 items-center justify-center rounded-xl ${
              active ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <Text className={`text-xs font-bold ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              {t.alarmList.weekdayShort[day]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Time picker ─────────────────────────────────────────────────────────────

const STEP_PX = 40;

function TimeSpinner({
  value,
  min = 0,
  max,
  onChange,
}: {
  value: number;
  min?: number;
  max: number;
  onChange: (v: number) => void;
}) {
  const startValue = useRef(value);
  const lastSteps = useRef(0);

  function cycle(base: number, steps: number) {
    const range = max - min + 1;
    return ((base + steps - min) % range + range) % range + min;
  }

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      startValue.current = value;
      lastSteps.current = 0;
    })
    .onUpdate((e) => {
      const steps = Math.floor(-e.translationY / STEP_PX);
      if (steps !== lastSteps.current) {
        lastSteps.current = steps;
        onChange(cycle(startValue.current, steps));
      }
    });

  return (
    <GestureDetector gesture={pan}>
      <View className="items-center">
        <Pressable
          onPress={() => onChange(value === max ? min : value + 1)}
          className="px-4 py-2 active:opacity-50"
        >
          <Text className="text-2xl text-primary">▲</Text>
        </Pressable>
        <Text className="w-16 text-center text-5xl font-bold tabular-nums text-foreground">
          {String(value).padStart(2, '0')}
        </Text>
        <Pressable
          onPress={() => onChange(value === min ? max : value - 1)}
          className="px-4 py-2 active:opacity-50"
        >
          <Text className="text-2xl text-primary">▼</Text>
        </Pressable>
      </View>
    </GestureDetector>
  );
}

function AmPmSpinner({
  value,
  onChange,
}: {
  value: 'AM' | 'PM';
  onChange: (v: 'AM' | 'PM') => void;
}) {
  const startValue = useRef(value);
  const lastSteps = useRef(0);

  function flip(base: 'AM' | 'PM', steps: number): 'AM' | 'PM' {
    const n = ((base === 'AM' ? 0 : 1) - steps % 2 + 2) % 2;
    return n === 0 ? 'AM' : 'PM';
  }

  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin(() => {
      startValue.current = value;
      lastSteps.current = 0;
    })
    .onUpdate((e) => {
      const steps = Math.floor(-e.translationY / STEP_PX);
      if (steps !== lastSteps.current) {
        lastSteps.current = steps;
        onChange(flip(startValue.current, steps));
      }
    });

  function toggle() {
    onChange(value === 'AM' ? 'PM' : 'AM');
  }

  return (
    <GestureDetector gesture={pan}>
      <View className="items-center">
        <Pressable onPress={toggle} className="px-4 py-2 active:opacity-50">
          <Text className="text-2xl text-primary">▲</Text>
        </Pressable>
        <Text className="w-16 text-center text-4xl font-bold text-foreground">
          {value}
        </Text>
        <Pressable onPress={toggle} className="px-4 py-2 active:opacity-50">
          <Text className="text-2xl text-primary">▼</Text>
        </Pressable>
      </View>
    </GestureDetector>
  );
}

function TimePicker({
  hour12,
  minute,
  ampm,
  onHour12Change,
  onMinuteChange,
  onAmpmChange,
}: {
  hour12: number;
  minute: number;
  ampm: 'AM' | 'PM';
  onHour12Change: (h: number) => void;
  onMinuteChange: (m: number) => void;
  onAmpmChange: (v: 'AM' | 'PM') => void;
}) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      <TimeSpinner value={hour12} min={1} max={12} onChange={onHour12Change} />
      <Text className="mb-1 text-5xl font-bold text-muted-foreground">:</Text>
      <TimeSpinner value={minute} min={0} max={59} onChange={onMinuteChange} />
      <AmPmSpinner value={ampm} onChange={onAmpmChange} />
    </View>
  );
}

// ─── Challenge picker ─────────────────────────────────────────────────────────

const PICKER_TYPES: ActionType[] = [
  'MATH', 'PUZZLE', 'TYPE_TEXT', 'SHAKE', 'WALK', 'PHOTO_MATCH', 'QR_CODE', 'NFC', 'BUTTON',
];

const CHALLENGE_ICON: Record<string, string> = {
  BUTTON: '🔘',
  MATH: '🧮',
  PUZZLE: '🧩',
  TYPE_TEXT: '⌨️',
  SHAKE: '📳',
  WALK: '🚶',
  QR_CODE: '🔲',
  NFC: '📡',
  PHOTO_MATCH: '📸',
};

function defaultDraft(type: ActionType): DraftAction {
  if (type === 'BUTTON') return { type: 'BUTTON' };
  if (type === 'MATH') return { type: 'MATH', level: 'MEDIUM' };
  if (type === 'PUZZLE') return { type: 'PUZZLE', level: 'EASY', imageUri: null, customRows: 3, customCols: 3 };
  if (type === 'TYPE_TEXT') return { type: 'TYPE_TEXT', level: 'EASY', customWordCount: 15 };
  if (type === 'SHAKE') return { type: 'SHAKE', level: 'EASY', customSeconds: 30 };
  if (type === 'WALK') return { type: 'WALK', level: 'EASY' };
  if (type === 'QR_CODE') return { type: 'QR_CODE', qrCodeValue: null };
  if (type === 'NFC') return { type: 'NFC', nfcTagId: null };
  return { type: 'PHOTO_MATCH', photoUri: null };
}

function getChallengePreview(draft: DraftAction): string {
  if (draft.type === 'MATH') return '12 × 7 + 3 = ?';
  if (draft.type === 'PUZZLE') {
    if (draft.level === 'CUSTOM') return `${draft.customRows} × ${draft.customCols} grid`;
    if (draft.level === 'EASY') return '2 × 3 grid — 6 tiles';
    if (draft.level === 'MEDIUM') return '3 × 4 grid — 12 tiles';
    return '4 × 6 grid — 24 tiles';
  }
  if (draft.type === 'TYPE_TEXT') {
    const words = draft.level === 'CUSTOM' ? draft.customWordCount :
      draft.level === 'EASY' ? 5 : draft.level === 'MEDIUM' ? 10 : 20;
    return `Type ${words} words to dismiss`;
  }
  if (draft.type === 'SHAKE') {
    const secs = draft.level === 'CUSTOM' ? draft.customSeconds :
      draft.level === 'EASY' ? 10 : draft.level === 'MEDIUM' ? 20 : draft.level === 'MAXIMUM' ? 30 : 45;
    return `Shake for ${secs} seconds`;
  }
  if (draft.type === 'WALK') {
    const steps = draft.level === 'EASY' ? 50 : draft.level === 'MEDIUM' ? 100 : 200;
    return `Walk ${steps} steps`;
  }
  if (draft.type === 'BUTTON') return 'Tap the dismiss button';
  if (draft.type === 'QR_CODE') return 'Scan the registered QR code';
  if (draft.type === 'NFC') return 'Tap the registered NFC tag';
  if (draft.type === 'PHOTO_MATCH') return 'Photograph the registered spot';
  return '';
}

function ChallengeGridCard({ type, onPress }: { type: ActionType; onPress: () => void }) {
  const { t } = useTranslation();
  const card = t.challenges.cards[type];
  return (
    <Pressable
      onPress={onPress}
      style={{ width: '48%', margin: '1%' }}
      className="rounded-2xl border border-border bg-card p-4 active:opacity-70"
    >
      <Text className="mb-2 text-3xl">{CHALLENGE_ICON[type]}</Text>
      <Text className="mb-1 text-sm font-bold text-foreground" numberOfLines={1}>
        {card?.name ?? type}
      </Text>
      <Text className="text-xs text-muted-foreground" numberOfLines={2}>
        {card?.tagline ?? ''}
      </Text>
    </Pressable>
  );
}

function LevelPills<T extends string>({
  levels,
  current,
  getLabel,
  onChange,
}: {
  levels: T[];
  current: T;
  getLabel: (l: T) => string;
  onChange: (l: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {levels.map((l) => (
        <Pressable
          key={l}
          onPress={() => onChange(l)}
          className={`rounded-xl px-4 py-2 ${current === l ? 'bg-primary' : 'bg-muted'}`}
        >
          <Text className={`text-xs font-bold ${current === l ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
            {getLabel(l)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AddedChallengeRow({
  action,
  index,
  total,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: {
  action: DraftAction;
  index: number;
  total: number;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const card = t.challenges.cards[action.type];
  const levelText = 'level' in action ? (action as { level: string }).level : null;

  return (
    <Pressable
      onPress={onEdit}
      className="mb-2 flex-row items-center rounded-2xl border border-border bg-card px-4 py-3 active:opacity-70"
    >
      <Text className="mr-3 text-2xl">{CHALLENGE_ICON[action.type]}</Text>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-foreground">{card?.name ?? action.type}</Text>
        {levelText && (
          <Text className="text-xs capitalize text-muted-foreground">{levelText.toLowerCase()}</Text>
        )}
      </View>
      <View className="flex-row items-center gap-1">
        {index > 0 && (
          <Pressable onPress={onMoveUp} className="rounded-lg bg-muted px-2 py-1.5">
            <Text className="text-xs text-muted-foreground">↑</Text>
          </Pressable>
        )}
        {index < total - 1 && (
          <Pressable onPress={onMoveDown} className="rounded-lg bg-muted px-2 py-1.5">
            <Text className="text-xs text-muted-foreground">↓</Text>
          </Pressable>
        )}
        <Pressable onPress={onDelete} className="rounded-lg bg-destructive/10 px-2 py-1.5">
          <Text className="text-xs font-bold text-destructive">✕</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function ChallengePickerModal({
  visible,
  initialDraft,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initialDraft: DraftAction | null;
  onConfirm: (draft: DraftAction) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [step, setStep] = useState<'grid' | 'config'>('grid');
  const [draft, setDraft] = useState<DraftAction>({ type: 'MATH', level: 'MEDIUM' });

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showQrScanner, setShowQrScanner] = useState(false);
  const qrScannedRef = useRef(false);
  const [nfcScanning, setNfcScanning] = useState(false);
  const [showPhotoCamera, setShowPhotoCamera] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const photoCameraRef = useRef<CameraView>(null);
  const photoCapRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    if (initialDraft) {
      setDraft(initialDraft);
      setStep('config');
    } else {
      setDraft({ type: 'MATH', level: 'MEDIUM' });
      setStep('grid');
    }
  }, [visible]);

  function selectType(type: ActionType) {
    setDraft(defaultDraft(type));
    setStep('config');
  }

  async function openQrScanner() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(t.alarmEdit.permRequired, t.alarmEdit.cameraNeededQr);
        return;
      }
    }
    qrScannedRef.current = false;
    setShowQrScanner(true);
  }

  async function capturePhoto() {
    if (photoCapRef.current || !photoCameraRef.current) return;
    photoCapRef.current = true;
    try {
      const photo = await photoCameraRef.current.takePictureAsync({ quality: 0.7 });
      setPreviewUri(photo.uri);
    } catch {
      // ignore
    } finally {
      photoCapRef.current = false;
    }
  }

  function confirmPhoto() {
    if (!previewUri) return;
    setDraft({ type: 'PHOTO_MATCH', photoUri: previewUri });
    setPreviewUri(null);
    setShowPhotoCamera(false);
  }

  async function openPhotoCamera() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(t.alarmEdit.permRequired, t.alarmEdit.cameraNeededPhoto);
        return;
      }
    }
    setPreviewUri(null);
    setShowPhotoCamera(true);
  }

  async function scanNfcTag() {
    const supported = await NfcManager.isSupported();
    if (!supported) {
      Alert.alert(t.alarmEdit.notSupported, t.alarmEdit.nfcNotAvail);
      return;
    }
    setNfcScanning(true);
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      const tagId = (tag?.id ?? '').toLowerCase();
      await NfcManager.cancelTechnologyRequest().catch(() => {});
      if (tagId) {
        setDraft({ type: 'NFC', nfcTagId: tagId });
      } else {
        Alert.alert(t.alarmEdit.error, t.alarmEdit.nfcReadError);
      }
    } catch (_) {
      Alert.alert(t.alarmEdit.error, t.alarmEdit.nfcFailError);
      NfcManager.cancelTechnologyRequest().catch(() => {});
    } finally {
      setNfcScanning(false);
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t.alarmEdit.permRequired, t.alarmEdit.galleryNeeded);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && draft.type === 'PUZZLE') {
      setDraft({ ...draft, imageUri: result.assets[0].uri });
    }
  }

  const card = t.challenges.cards[draft.type];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-background">
        {/* Header */}
        <View className="flex-row items-center border-b border-border px-4 pb-4 pt-12">
          <Pressable
            onPress={step === 'config' && !initialDraft ? () => setStep('grid') : onClose}
            className="mr-3 rounded-xl p-2"
          >
            <Text className="text-xl text-foreground">←</Text>
          </Pressable>
          <Text className="text-lg font-bold text-foreground">
            {step === 'grid' ? 'Choose a Challenge' : card?.name ?? draft.type}
          </Text>
        </View>

        {step === 'grid' ? (
          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 48 }}>
            <View className="flex-row flex-wrap">
              {PICKER_TYPES.map((type) => (
                <ChallengeGridCard key={type} type={type} onPress={() => selectType(type)} />
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 48 }}>
            {/* Icon + name */}
            <View className="mb-6 items-center">
              <View className="mb-3 h-20 w-20 items-center justify-center rounded-2xl border border-border bg-card">
                <Text className="text-4xl">{CHALLENGE_ICON[draft.type]}</Text>
              </View>
              <Text className="text-xl font-bold text-foreground">{card?.name ?? draft.type}</Text>
            </View>

            {/* Preview */}
            <View className="mb-6 rounded-2xl border border-border bg-card p-5">
              <Text className="mb-2 text-center text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Preview
              </Text>
              <Text className="text-center text-base font-semibold text-foreground">
                {getChallengePreview(draft)}
              </Text>
            </View>

            {/* Config */}
            <View className="mb-6 gap-4 rounded-2xl border border-border bg-card p-4">
              {draft.type === 'MATH' && (
                <>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Difficulty</Text>
                  <LevelPills
                    levels={MATH_LEVELS}
                    current={draft.level}
                    getLabel={(l) => t.alarmEdit.mathLevels[l] ?? l}
                    onChange={(level) => setDraft({ type: 'MATH', level })}
                  />
                </>
              )}

              {draft.type === 'PUZZLE' && (
                <>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Difficulty</Text>
                  <LevelPills
                    levels={PUZZLE_LEVELS}
                    current={draft.level}
                    getLabel={(l) => t.alarmEdit.puzzleLevels[l] ?? l}
                    onChange={(level) => setDraft({ ...draft, level })}
                  />
                  {draft.level === 'CUSTOM' && (
                    <View className="gap-4 rounded-xl bg-muted p-4">
                      <GridStepper
                        label={t.alarmEdit.rows}
                        value={draft.customRows}
                        min={2}
                        max={8}
                        onChange={(v) => setDraft({ ...draft, customRows: v })}
                      />
                      <GridStepper
                        label={t.alarmEdit.cols}
                        value={draft.customCols}
                        min={2}
                        max={6}
                        onChange={(v) => setDraft({ ...draft, customCols: v })}
                      />
                    </View>
                  )}
                  {draft.imageUri && (
                    <Image
                      source={{ uri: draft.imageUri }}
                      style={{ width: '100%', height: 120, borderRadius: 12 }}
                      resizeMode="cover"
                    />
                  )}
                  <Pressable
                    onPress={pickImage}
                    className="rounded-xl border border-dashed border-border py-3 active:opacity-70"
                  >
                    <Text className="text-center text-sm text-muted-foreground">
                      {draft.imageUri ? t.alarmEdit.changeImage : t.alarmEdit.chooseImage}
                    </Text>
                  </Pressable>
                </>
              )}

              {draft.type === 'TYPE_TEXT' && (
                <>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Difficulty</Text>
                  <LevelPills
                    levels={TYPE_TEXT_LEVELS}
                    current={draft.level}
                    getLabel={(l) => t.alarmEdit.typeTextLevels[l] ?? l}
                    onChange={(level) => setDraft({ ...draft, level })}
                  />
                  {draft.level === 'CUSTOM' && (
                    <View className="rounded-xl bg-muted p-4">
                      <GridStepper
                        label={t.alarmEdit.words}
                        value={draft.customWordCount}
                        min={5}
                        max={150}
                        step={5}
                        onChange={(v) => setDraft({ ...draft, customWordCount: v })}
                      />
                    </View>
                  )}
                </>
              )}

              {draft.type === 'SHAKE' && (
                <>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Difficulty</Text>
                  <LevelPills
                    levels={SHAKE_LEVELS}
                    current={draft.level}
                    getLabel={(l) => t.alarmEdit.shakeLevels[l] ?? l}
                    onChange={(level) => setDraft({ ...draft, level })}
                  />
                  {draft.level === 'CUSTOM' && (
                    <View className="rounded-xl bg-muted p-4">
                      <GridStepper
                        label={t.alarmEdit.duration}
                        value={draft.customSeconds}
                        min={5}
                        max={300}
                        step={5}
                        unit="sec"
                        onChange={(v) => setDraft({ ...draft, customSeconds: v })}
                      />
                    </View>
                  )}
                </>
              )}

              {draft.type === 'WALK' && (
                <>
                  <Text className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Difficulty</Text>
                  <LevelPills
                    levels={WALK_LEVELS}
                    current={draft.level}
                    getLabel={(l) => t.alarmEdit.walkLevels[l] ?? l}
                    onChange={(level) => setDraft({ type: 'WALK', level })}
                  />
                </>
              )}

              {draft.type === 'BUTTON' && (
                <Text className="text-sm text-muted-foreground">{t.alarmEdit.buttonDesc}</Text>
              )}

              {draft.type === 'NFC' && (
                <>
                  {draft.nfcTagId ? (
                    <Text className="text-sm text-green-500">{t.alarmEdit.nfcSaved}</Text>
                  ) : (
                    <Text className="text-sm text-muted-foreground">{t.alarmEdit.nfcScanHint}</Text>
                  )}
                  <Pressable
                    onPress={scanNfcTag}
                    disabled={nfcScanning}
                    className="rounded-xl border border-dashed border-border py-3 active:opacity-70"
                  >
                    <Text className="text-center text-sm text-muted-foreground">
                      {nfcScanning ? t.alarmEdit.nfcScanning : draft.nfcTagId ? t.alarmEdit.nfcScanDiff : t.alarmEdit.nfcScan}
                    </Text>
                  </Pressable>
                </>
              )}

              {draft.type === 'QR_CODE' && (
                <>
                  {draft.qrCodeValue ? (
                    <Text className="text-sm text-green-500">{t.alarmEdit.qrSaved}</Text>
                  ) : (
                    <Text className="text-sm text-muted-foreground">{t.alarmEdit.qrScanHint}</Text>
                  )}
                  <Pressable
                    onPress={openQrScanner}
                    className="rounded-xl border border-dashed border-border py-3 active:opacity-70"
                  >
                    <Text className="text-center text-sm text-muted-foreground">
                      {draft.qrCodeValue ? t.alarmEdit.qrScanDiff : t.alarmEdit.qrScan}
                    </Text>
                  </Pressable>
                </>
              )}

              {draft.type === 'PHOTO_MATCH' && (
                <>
                  {draft.photoUri ? (
                    <>
                      <Image
                        source={{ uri: draft.photoUri }}
                        style={{ width: '100%', height: 120, borderRadius: 12 }}
                        resizeMode="cover"
                      />
                      <Text className="text-sm text-green-500">{t.alarmEdit.photoSaved}</Text>
                    </>
                  ) : (
                    <Text className="text-sm text-muted-foreground">{t.alarmEdit.photoHint}</Text>
                  )}
                  <Pressable
                    onPress={openPhotoCamera}
                    className="rounded-xl border border-dashed border-border py-3 active:opacity-70"
                  >
                    <Text className="text-center text-sm text-muted-foreground">
                      {draft.photoUri ? t.alarmEdit.photoRetake : t.alarmEdit.photoTake}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* Confirm */}
            <Pressable
              onPress={() => onConfirm(draft)}
              className="items-center rounded-2xl bg-primary py-4 active:opacity-80"
            >
              <Text className="text-base font-bold text-primary-foreground">
                {initialDraft ? t.alarmEdit.saveChanges : 'Add Challenge'}
              </Text>
            </Pressable>
          </ScrollView>
        )}

        {/* Photo camera modal */}
        {draft.type === 'PHOTO_MATCH' && (
          <Modal
            visible={showPhotoCamera}
            animationType="slide"
            onRequestClose={() => { setShowPhotoCamera(false); setPreviewUri(null); }}
          >
            <View className="flex-1 bg-black">
              {!previewUri ? (
                <>
                  <CameraView ref={photoCameraRef} style={{ flex: 1 }} facing="back" />
                  <View className="absolute bottom-0 left-0 right-0 items-center pb-10">
                    <Text className="mb-5 text-base text-white/70">{t.alarmEdit.pointAtPlace}</Text>
                    <View className="flex-row items-center gap-8">
                      <Pressable
                        onPress={() => setShowPhotoCamera(false)}
                        className="rounded-full bg-white/20 px-6 py-3"
                      >
                        <Text className="font-semibold text-white">{t.alarmEdit.cancel}</Text>
                      </Pressable>
                      <Pressable
                        onPress={capturePhoto}
                        style={{
                          width: 72, height: 72, borderRadius: 36,
                          borderWidth: 4, borderColor: 'white',
                          backgroundColor: 'rgba(255,255,255,0.3)',
                        }}
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Image source={{ uri: previewUri }} style={{ flex: 1 }} resizeMode="cover" />
                  <View className="absolute bottom-0 left-0 right-0 items-center pb-10">
                    <Text className="mb-5 text-base text-white/70">{t.alarmEdit.photoConfirmPrompt}</Text>
                    <View className="flex-row gap-4">
                      <Pressable
                        onPress={() => setPreviewUri(null)}
                        className="rounded-full bg-white/20 px-8 py-4"
                      >
                        <Text className="font-semibold text-white">{t.alarmEdit.retake}</Text>
                      </Pressable>
                      <Pressable
                        onPress={confirmPhoto}
                        className="rounded-full bg-primary px-8 py-4"
                      >
                        <Text className="font-semibold text-primary-foreground">{t.alarmEdit.confirm}</Text>
                      </Pressable>
                    </View>
                  </View>
                </>
              )}
            </View>
          </Modal>
        )}

        {/* QR scanner modal */}
        {draft.type === 'QR_CODE' && (
          <Modal
            visible={showQrScanner}
            animationType="slide"
            onRequestClose={() => setShowQrScanner(false)}
          >
            <View className="flex-1 bg-black">
              <CameraView
                style={{ flex: 1 }}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                onBarcodeScanned={({ data }) => {
                  if (qrScannedRef.current) return;
                  qrScannedRef.current = true;
                  setDraft({ type: 'QR_CODE', qrCodeValue: data });
                  setShowQrScanner(false);
                }}
              />
              <View className="absolute inset-0 items-center justify-center" pointerEvents="none">
                <View
                  style={{
                    width: 240, height: 240, borderWidth: 3,
                    borderColor: 'white', borderRadius: 16, backgroundColor: 'transparent',
                  }}
                />
              </View>
              <View className="absolute bottom-0 left-0 right-0 items-center pb-10">
                <Text className="mb-4 text-base text-white/70">{t.alarmEdit.pointAtQr}</Text>
                <Pressable
                  onPress={() => setShowQrScanner(false)}
                  className="rounded-full bg-white/20 px-10 py-4"
                >
                  <Text className="font-semibold text-white">{t.alarmEdit.cancel}</Text>
                </Pressable>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </Modal>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function AlarmEditScreen({ alarmId }: { alarmId: string | null }) {
  const router = useRouter();
  const { t } = useTranslation();
  const { create, update, getById } = useAlarms();

  const [label, setLabel] = useState('');
  const [days, setDays] = useState<Set<Weekday>>(new Set([1, 2, 3, 4, 5]));
  const [hour12, setHour12] = useState(7);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [minute, setMinute] = useState(0);
  const [actions, setActions] = useState<DraftAction[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [ringtoneUri, setRingtoneUri] = useState<string | null>(null);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [flashlightEnabled, setFlashlightEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  useEffect(() => {
    return () => { try { player.pause(); } catch (_) {} };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function togglePreview() {
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
      return;
    }
    const source = ringtoneUri
      ? { uri: ringtoneUri }
      : require('@/../assets/sounds/wake-up.mp3');
    await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false });
    player.replace(source);
    player.play();
    setIsPlaying(true);
  }

  useEffect(() => {
    if (!alarmId) return;
    const alarm = getById(alarmId);
    const load = (a: typeof alarm) => {
      if (!a) return;
      setLabel(a.label);
      setDays(new Set(a.schedule.days));
      const h = a.schedule.hour;
      setHour12(h === 0 ? 12 : h > 12 ? h - 12 : h);
      setAmpm(h < 12 ? 'AM' : 'PM');
      setMinute(a.schedule.minute);
      setRingtoneUri(a.ringtoneUri);
      setVibrationEnabled(a.vibrationEnabled);
      setFlashlightEnabled(a.flashlightEnabled);
      setActions(
        a.actions.map((ac): DraftAction => {
          if (ac.type === 'BUTTON') return { type: 'BUTTON' };
          if (ac.type === 'MATH') return { type: 'MATH', level: ac.level };
          if (ac.type === 'TYPE_TEXT') return { type: 'TYPE_TEXT', level: ac.level, customWordCount: ac.customWordCount ?? 15 };
          if (ac.type === 'SHAKE') return { type: 'SHAKE', level: ac.level, customSeconds: ac.customSeconds ?? 30 };
          if (ac.type === 'WALK') return { type: 'WALK', level: ac.level };
          if (ac.type === 'QR_CODE') return { type: 'QR_CODE', qrCodeValue: ac.qrCodeValue };
          if (ac.type === 'NFC') return { type: 'NFC', nfcTagId: ac.nfcTagId };
          if (ac.type === 'PHOTO_MATCH') return { type: 'PHOTO_MATCH', photoUri: ac.photoUri };
          return { type: 'PUZZLE', level: ac.level, imageUri: ac.imageUri, customRows: ac.customRows ?? 3, customCols: ac.customCols ?? 3 };
        }),
      );
    };
    if (alarm) {
      load(alarm);
    } else {
      getContainer().alarmRepository.findById(alarmId).then(load);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarmId]);

  async function handleFlashlightToggle(value: boolean) {
    setFlashlightEnabled(value);
    if (value && !cameraPermission?.granted) {
      await requestCameraPermission();
    }
  }

  async function pickRingtone() {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets.length > 0) {
      setRingtoneUri(result.assets[0].uri);
    }
  }

  function moveAction(from: number, to: number) {
    const next = [...actions];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setActions(next);
  }

  function deleteAction(index: number) {
    setActions(actions.filter((_, i) => i !== index));
  }

  function updateAction(index: number, action: DraftAction) {
    const next = [...actions];
    next[index] = action;
    setActions(next);
  }

  function openPickerForAdd() {
    setEditingIndex(null);
    setPickerOpen(true);
  }

  function openPickerForEdit(index: number) {
    setEditingIndex(index);
    setPickerOpen(true);
  }

  function handlePickerConfirm(action: DraftAction) {
    if (editingIndex !== null) {
      updateAction(editingIndex, action);
    } else {
      setActions([...actions, action]);
    }
    setPickerOpen(false);
    setEditingIndex(null);
  }

  async function handleSave() {
    if (!days.size) {
      Alert.alert(t.alarmEdit.selectDay, t.alarmEdit.selectDayDesc);
      return;
    }
    if (actions.length === 0) {
      Alert.alert('No challenge', 'Add at least one challenge before saving.');
      return;
    }

    const actionConfigs: ActionConfig[] = actions.map((a, i): ActionConfig => {
      if (a.type === 'BUTTON') return { type: 'BUTTON', position: i };
      if (a.type === 'MATH') return { type: 'MATH', position: i, level: a.level };
      if (a.type === 'TYPE_TEXT') return { type: 'TYPE_TEXT', position: i, level: a.level, customWordCount: a.customWordCount };
      if (a.type === 'SHAKE') return { type: 'SHAKE', position: i, level: a.level, customSeconds: a.customSeconds };
      if (a.type === 'WALK') return { type: 'WALK', position: i, level: a.level };
      if (a.type === 'QR_CODE') return { type: 'QR_CODE', position: i, qrCodeValue: a.qrCodeValue ?? '' };
      if (a.type === 'NFC') return { type: 'NFC', position: i, nfcTagId: a.nfcTagId ?? '' };
      if (a.type === 'PHOTO_MATCH') return { type: 'PHOTO_MATCH', position: i, photoUri: a.photoUri ?? '' };
      return { type: 'PUZZLE', position: i, level: a.level, imageUri: a.imageUri, customRows: a.customRows, customCols: a.customCols };
    });

    const hour24 = ampm === 'AM'
      ? (hour12 === 12 ? 0 : hour12)
      : (hour12 === 12 ? 12 : hour12 + 12);

    setSaving(true);
    try {
      if (alarmId) {
        await update({
          id: alarmId,
          label: label.trim() || t.alarmList.alarmDefault,
          days: [...days] as Weekday[],
          hour: hour24,
          minute,
          actions: actionConfigs,
          ringtoneUri,
          vibrationEnabled,
          flashlightEnabled,
        });
      } else {
        await create({
          label: label.trim() || t.alarmList.alarmDefault,
          days: [...days] as Weekday[],
          hour: hour24,
          minute,
          actions: actionConfigs,
          ringtoneUri,
          vibrationEnabled,
          flashlightEnabled,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert(t.alarmEdit.error, String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
    >
      {/* Label */}
      <View className="mb-6">
        <SectionLabel>{t.alarmEdit.alarmName}</SectionLabel>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder={t.alarmEdit.namePlaceholder}
          placeholderTextColor="#94a3b8"
          className="rounded-2xl border border-border bg-card px-4 py-4 text-base text-foreground"
        />
      </View>

      {/* Time */}
      <View className="mb-6">
        <SectionLabel>{t.alarmEdit.time}</SectionLabel>
        <View className="rounded-2xl border border-border bg-card py-4">
          <TimePicker
            hour12={hour12}
            minute={minute}
            ampm={ampm}
            onHour12Change={setHour12}
            onMinuteChange={setMinute}
            onAmpmChange={setAmpm}
          />
        </View>
      </View>

      {/* Days */}
      <View className="mb-6">
        <SectionLabel>{t.alarmEdit.repeat}</SectionLabel>
        <View className="rounded-2xl border border-border bg-card p-4">
          <DayPicker selected={days} onChange={setDays} />
        </View>
      </View>

      {/* Ringtone */}
      <View className="mb-6">
        <SectionLabel>{t.alarmEdit.ringtone}</SectionLabel>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-medium text-foreground">
                {ringtoneUri
                  ? ringtoneUri.split('/').pop()?.split('?')[0] ?? t.alarmEdit.customLabel
                  : t.alarmEdit.defaultSound}
              </Text>
              {ringtoneUri && (
                <Text className="mt-0.5 text-xs text-muted-foreground">{t.alarmEdit.customLabel}</Text>
              )}
              {!ringtoneUri && (
                <Text className="mt-0.5 text-xs text-muted-foreground">{t.alarmEdit.systemAlarm}</Text>
              )}
            </View>
            <View className="flex-row gap-2">
              <Pressable
                onPress={togglePreview}
                className="h-8 w-8 items-center justify-center rounded-lg bg-muted"
              >
                <Text className="text-sm text-foreground">{isPlaying ? '⏹' : '▶'}</Text>
              </Pressable>
              {ringtoneUri && (
                <Pressable
                  onPress={() => { player.pause(); setIsPlaying(false); setRingtoneUri(null); }}
                  className="rounded-lg bg-muted px-3 py-1.5"
                >
                  <Text className="text-xs font-semibold text-muted-foreground">{t.alarmEdit.reset}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={pickRingtone}
                className="rounded-lg bg-primary px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-primary-foreground">
                  {ringtoneUri ? t.alarmEdit.change : t.alarmEdit.pick}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Alerts */}
      <View className="mb-6">
        <SectionLabel>{t.alarmEdit.alerts}</SectionLabel>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-medium text-foreground">{t.alarmEdit.vibration}</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">{t.alarmEdit.vibrationDesc}</Text>
            </View>
            <Switch value={vibrationEnabled} onValueChange={setVibrationEnabled} />
          </View>
          <View className="h-px bg-border mx-4" />
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-medium text-foreground">{t.alarmEdit.flashlight}</Text>
              <Text className="mt-0.5 text-xs text-muted-foreground">{t.alarmEdit.flashlightDesc}</Text>
            </View>
            <Switch value={flashlightEnabled} onValueChange={handleFlashlightToggle} />
          </View>
        </View>
      </View>

      {/* Challenges */}
      <View className="mb-6">
        <SectionLabel>
          {actions.length > 0 ? t.alarmEdit.challengesLabel(actions.length) : 'Challenge'}
        </SectionLabel>

        {actions.map((action, i) => (
          <AddedChallengeRow
            key={i}
            action={action}
            index={i}
            total={actions.length}
            onEdit={() => openPickerForEdit(i)}
            onMoveUp={() => moveAction(i, i - 1)}
            onMoveDown={() => moveAction(i, i + 1)}
            onDelete={() => deleteAction(i)}
          />
        ))}

        <Pressable
          onPress={openPickerForAdd}
          className="mt-1 flex-row items-center justify-center rounded-2xl border border-dashed border-border py-4 active:opacity-70"
        >
          <Text className="text-sm font-bold text-primary">+ ADD A CHALLENGE</Text>
        </Pressable>
      </View>

      <ChallengePickerModal
        visible={pickerOpen}
        initialDraft={editingIndex !== null ? actions[editingIndex] ?? null : null}
        onConfirm={handlePickerConfirm}
        onClose={() => { setPickerOpen(false); setEditingIndex(null); }}
      />

      {/* Save */}
      <Pressable
        disabled={saving}
        onPress={handleSave}
        className={`items-center rounded-2xl py-4 ${saving ? 'bg-primary/50' : 'bg-primary active:opacity-80'}`}
      >
        <Text className="text-base font-bold text-primary-foreground">
          {saving ? t.alarmEdit.saving : alarmId ? t.alarmEdit.saveChanges : t.alarmEdit.createAlarm}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
