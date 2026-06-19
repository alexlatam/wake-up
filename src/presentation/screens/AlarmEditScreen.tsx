import { useCallback, useEffect, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAlarms } from '@/presentation/hooks/useAlarms';
import { getContainer } from '@/infrastructure/di/container';
import type { ActionConfig, MathLevel, PuzzleLevel, ShakeLevel, TypeTextLevel, WalkLevel, Weekday } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';

// ─── Types ───────────────────────────────────────────────────────────────────

type DraftAction =
  | { type: 'BUTTON' }
  | { type: 'MATH'; level: MathLevel }
  | { type: 'PUZZLE'; level: PuzzleLevel; imageUri: string | null }
  | { type: 'TYPE_TEXT'; level: TypeTextLevel }
  | { type: 'SHAKE'; level: ShakeLevel }
  | { type: 'WALK'; level: WalkLevel }
  | { type: 'QR_CODE'; qrCodeValue: string | null };

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKDAY_LABELS: { day: Weekday; short: string }[] = [
  { day: 0, short: 'Su' },
  { day: 1, short: 'Mo' },
  { day: 2, short: 'Tu' },
  { day: 3, short: 'We' },
  { day: 4, short: 'Th' },
  { day: 5, short: 'Fr' },
  { day: 6, short: 'Sa' },
];

const MATH_LEVELS: MathLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM', 'EXTREME'];
const WALK_LEVELS: WalkLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM'];
const WALK_LEVEL_LABELS: Record<WalkLevel, string> = {
  EASY: '15 steps',
  MEDIUM: '35 steps',
  MAXIMUM: '100 steps',
};
const SHAKE_LEVELS: ShakeLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM', 'EXTREME'];
const SHAKE_LEVEL_LABELS: Record<ShakeLevel, string> = {
  EASY: '3 sec',
  MEDIUM: '10 sec',
  MAXIMUM: '30 sec',
  EXTREME: '2 min',
};
const TYPE_TEXT_LEVELS: TypeTextLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM'];
const TYPE_TEXT_LEVEL_LABELS: Record<TypeTextLevel, string> = {
  EASY: 'Short',
  MEDIUM: 'Medium',
  MAXIMUM: 'Long',
};
const PUZZLE_LEVELS: PuzzleLevel[] = ['EASY', 'MEDIUM', 'MAXIMUM'];
const PUZZLE_LEVEL_LABELS: Record<PuzzleLevel, string> = {
  EASY: '6 tiles',
  MEDIUM: '12 tiles',
  MAXIMUM: '36 tiles',
};
const MATH_LEVEL_LABELS: Record<MathLevel, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  MAXIMUM: 'Hard',
  EXTREME: 'Extreme',
};

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
      {WEEKDAY_LABELS.map(({ day, short }) => {
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
              {short}
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

// ─── Action row ───────────────────────────────────────────────────────────────

function ChipButton({
  label,
  active,
  onPress,
  variant = 'level',
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  variant?: 'type' | 'level';
}) {
  const activeBg = variant === 'type' ? 'bg-indigo-500' : 'bg-primary';
  const activeText = variant === 'type' ? 'text-white' : 'text-primary-foreground';
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-lg px-3 py-1.5 ${active ? activeBg : 'bg-muted'}`}
    >
      <Text className={`text-xs font-semibold ${active ? activeText : 'text-muted-foreground'}`}>
        {label}
      </Text>
    </Pressable>
  );
}

function ActionRow({
  action,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  onChange,
}: {
  action: DraftAction;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onChange: (action: DraftAction) => void;
}) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showQrScanner, setShowQrScanner] = useState(false);
  const qrScannedRef = useRef(false);

  async function openQrScanner() {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert('Permission required', 'Camera access is needed to scan QR codes.');
        return;
      }
    }
    qrScannedRef.current = false;
    setShowQrScanner(true);
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Gallery access is needed to select an image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && action.type === 'PUZZLE') {
      onChange({ ...action, imageUri: result.assets[0].uri });
    }
  }

  return (
    <View className="mb-3 overflow-hidden rounded-2xl border border-border bg-card">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
        <Text className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Challenge {index + 1}
        </Text>
        <View className="flex-row items-center gap-2">
          {index > 0 && (
            <Pressable onPress={onMoveUp} className="rounded-lg bg-muted px-2 py-1">
              <Text className="text-xs font-bold text-muted-foreground">UP</Text>
            </Pressable>
          )}
          {index < total - 1 && (
            <Pressable onPress={onMoveDown} className="rounded-lg bg-muted px-2 py-1">
              <Text className="text-xs font-bold text-muted-foreground">DN</Text>
            </Pressable>
          )}
          <Pressable onPress={onDelete} className="rounded-lg bg-destructive/10 px-2 py-1">
            <Text className="text-xs font-bold text-destructive">X</Text>
          </Pressable>
        </View>
      </View>

      <View className="p-4">
        {/* Type selector */}
        <View className="flex-row flex-wrap gap-2">
          {(['BUTTON', 'MATH', 'PUZZLE', 'TYPE_TEXT', 'SHAKE', 'WALK', 'QR_CODE'] as const).map((t) => (
            <ChipButton
              key={t}
              label={t === 'TYPE_TEXT' ? 'TEXT' : t === 'QR_CODE' ? 'QR' : t}
              active={action.type === t}
              variant="type"
              onPress={() => {
                if (t === 'BUTTON') onChange({ type: 'BUTTON' });
                if (t === 'MATH') onChange({ type: 'MATH', level: 'EASY' });
                if (t === 'PUZZLE') onChange({ type: 'PUZZLE', level: 'EASY', imageUri: null });
                if (t === 'TYPE_TEXT') onChange({ type: 'TYPE_TEXT', level: 'EASY' });
                if (t === 'SHAKE') onChange({ type: 'SHAKE', level: 'EASY' });
                if (t === 'WALK') onChange({ type: 'WALK', level: 'EASY' });
                if (t === 'QR_CODE') onChange({ type: 'QR_CODE', qrCodeValue: null });
              }}
            />
          ))}
        </View>
        <View className="my-3 border-t border-border" />

        {/* MATH levels */}
        {action.type === 'MATH' && (
          <View className="flex-row flex-wrap gap-2">
            {MATH_LEVELS.map((level) => (
              <ChipButton
                key={level}
                label={MATH_LEVEL_LABELS[level]}
                active={action.level === level}
                onPress={() => onChange({ type: 'MATH', level })}
              />
            ))}
          </View>
        )}

        {/* PUZZLE levels + image */}
        {action.type === 'PUZZLE' && (
          <>
            <View className="mb-3 flex-row flex-wrap gap-2">
              {PUZZLE_LEVELS.map((level) => (
                <ChipButton
                  key={level}
                  label={PUZZLE_LEVEL_LABELS[level]}
                  active={action.level === level}
                  onPress={() => onChange({ ...action, level })}
                />
              ))}
            </View>
            {action.imageUri && (
              <View className="mb-2">
                <Image
                  source={{ uri: action.imageUri }}
                  style={{ width: '100%', height: 128, borderRadius: 12 }}
                  resizeMode="cover"
                />
              </View>
            )}
            <Pressable
              onPress={pickImage}
              className="rounded-xl border border-dashed border-border py-3 active:opacity-70"
            >
              <Text className="text-center text-sm text-muted-foreground">
                {action.imageUri ? '📷  Change image' : '📷  Choose image (optional)'}
              </Text>
            </Pressable>
          </>
        )}

        {/* TYPE_TEXT levels */}
        {action.type === 'TYPE_TEXT' && (
          <View className="flex-row flex-wrap gap-2">
            {TYPE_TEXT_LEVELS.map((level) => (
              <ChipButton
                key={level}
                label={TYPE_TEXT_LEVEL_LABELS[level]}
                active={action.level === level}
                onPress={() => onChange({ type: 'TYPE_TEXT', level })}
              />
            ))}
          </View>
        )}

        {/* SHAKE levels */}
        {action.type === 'SHAKE' && (
          <View className="flex-row flex-wrap gap-2">
            {SHAKE_LEVELS.map((level) => (
              <ChipButton
                key={level}
                label={SHAKE_LEVEL_LABELS[level]}
                active={action.level === level}
                onPress={() => onChange({ type: 'SHAKE', level })}
              />
            ))}
          </View>
        )}

        {/* WALK levels */}
        {action.type === 'WALK' && (
          <View className="flex-row flex-wrap gap-2">
            {WALK_LEVELS.map((level) => (
              <ChipButton
                key={level}
                label={WALK_LEVEL_LABELS[level]}
                active={action.level === level}
                onPress={() => onChange({ type: 'WALK', level })}
              />
            ))}
          </View>
        )}

        {/* BUTTON description */}
        {action.type === 'BUTTON' && (
          <Text className="text-sm text-muted-foreground">
            Press a button to complete this challenge.
          </Text>
        )}

        {/* QR_CODE scan setup */}
        {action.type === 'QR_CODE' && (
          <>
            {action.qrCodeValue ? (
              <Text className="mb-3 text-sm text-green-500">
                QR code saved. You can scan a different one below.
              </Text>
            ) : (
              <Text className="mb-3 text-sm text-muted-foreground">
                Scan a QR code now. When the alarm rings, you must scan this same code to dismiss it.
              </Text>
            )}
            <Pressable
              onPress={openQrScanner}
              className="rounded-xl border border-dashed border-border py-3 active:opacity-70"
            >
              <Text className="text-center text-sm text-muted-foreground">
                {action.qrCodeValue ? 'Scan a different QR code' : 'Scan QR code'}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* QR scanner modal */}
      {action.type === 'QR_CODE' && (
        <Modal
          visible={showQrScanner}
          animationType="slide"
          onRequestClose={() => setShowQrScanner(false)}
        >
          <View className="flex-1 bg-black">
            <CameraView
              className="flex-1"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={({ data }) => {
                if (qrScannedRef.current) return;
                qrScannedRef.current = true;
                onChange({ type: 'QR_CODE', qrCodeValue: data });
                setShowQrScanner(false);
              }}
            />
            <View className="absolute bottom-0 left-0 right-0 items-center pb-10">
              <Text className="mb-4 text-base text-white/70">Point at a QR code to save it</Text>
              <Pressable
                onPress={() => setShowQrScanner(false)}
                className="rounded-full bg-white/20 px-10 py-4"
              >
                <Text className="font-semibold text-white">Cancel</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function AlarmEditScreen({ alarmId }: { alarmId: string | null }) {
  const router = useRouter();
  const { create, update, getById } = useAlarms();

  const [label, setLabel] = useState('');
  const [days, setDays] = useState<Set<Weekday>>(new Set([1, 2, 3, 4, 5]));
  const [hour12, setHour12] = useState(7);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');
  const [minute, setMinute] = useState(0);
  const [actions, setActions] = useState<DraftAction[]>([{ type: 'BUTTON' }]);
  const [ringtoneUri, setRingtoneUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const player = useAudioPlayer(null);

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
      setActions(
        a.actions.map((ac): DraftAction => {
          if (ac.type === 'BUTTON') return { type: 'BUTTON' };
          if (ac.type === 'MATH') return { type: 'MATH', level: ac.level };
          if (ac.type === 'TYPE_TEXT') return { type: 'TYPE_TEXT', level: ac.level };
          if (ac.type === 'SHAKE') return { type: 'SHAKE', level: ac.level };
          if (ac.type === 'WALK') return { type: 'WALK', level: ac.level };
          if (ac.type === 'QR_CODE') return { type: 'QR_CODE', qrCodeValue: ac.qrCodeValue };
          return { type: 'PUZZLE', level: ac.level, imageUri: ac.imageUri };
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

  function addAction() {
    setActions([...actions, { type: 'BUTTON' }]);
  }

  function deleteAction(index: number) {
    if (actions.length === 1) {
      Alert.alert('Cannot remove', 'An alarm needs at least one challenge.');
      return;
    }
    setActions(actions.filter((_, i) => i !== index));
  }

  function updateAction(index: number, action: DraftAction) {
    const next = [...actions];
    next[index] = action;
    setActions(next);
  }

  async function handleSave() {
    if (!days.size) {
      Alert.alert('Select a day', 'Choose at least one day for the alarm.');
      return;
    }

    const actionConfigs: ActionConfig[] = actions.map((a, i): ActionConfig => {
      if (a.type === 'BUTTON') return { type: 'BUTTON', position: i };
      if (a.type === 'MATH') return { type: 'MATH', position: i, level: a.level };
      if (a.type === 'TYPE_TEXT') return { type: 'TYPE_TEXT', position: i, level: a.level };
      if (a.type === 'SHAKE') return { type: 'SHAKE', position: i, level: a.level };
      if (a.type === 'WALK') return { type: 'WALK', position: i, level: a.level };
      if (a.type === 'QR_CODE') return { type: 'QR_CODE', position: i, qrCodeValue: a.qrCodeValue ?? '' };
      return { type: 'PUZZLE', position: i, level: a.level, imageUri: a.imageUri };
    });

    const hour24 = ampm === 'AM'
      ? (hour12 === 12 ? 0 : hour12)
      : (hour12 === 12 ? 12 : hour12 + 12);

    setSaving(true);
    try {
      if (alarmId) {
        await update({
          id: alarmId,
          label: label.trim() || 'Alarm',
          days: [...days] as Weekday[],
          hour: hour24,
          minute,
          actions: actionConfigs,
          ringtoneUri,
        });
      } else {
        await create({
          label: label.trim() || 'Alarm',
          days: [...days] as Weekday[],
          hour: hour24,
          minute,
          actions: actionConfigs,
          ringtoneUri,
        });
      }
      router.back();
    } catch (e) {
      Alert.alert('Error', String(e));
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
        <SectionLabel>Alarm name</SectionLabel>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="e.g. Morning"
          placeholderTextColor="#94a3b8"
          className="rounded-2xl border border-border bg-card px-4 py-4 text-base text-foreground"
        />
      </View>

      {/* Time */}
      <View className="mb-6">
        <SectionLabel>Time</SectionLabel>
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
        <SectionLabel>Repeat</SectionLabel>
        <View className="rounded-2xl border border-border bg-card p-4">
          <DayPicker selected={days} onChange={setDays} />
        </View>
      </View>

      {/* Ringtone */}
      <View className="mb-6">
        <SectionLabel>Ringtone</SectionLabel>
        <View className="overflow-hidden rounded-2xl border border-border bg-card">
          <View className="flex-row items-center justify-between px-4 py-3.5">
            <View className="flex-1 mr-3">
              <Text className="text-sm font-medium text-foreground">
                {ringtoneUri
                  ? ringtoneUri.split('/').pop()?.split('?')[0] ?? 'Custom ringtone'
                  : 'Default alarm sound'}
              </Text>
              {ringtoneUri && (
                <Text className="mt-0.5 text-xs text-muted-foreground">Custom</Text>
              )}
              {!ringtoneUri && (
                <Text className="mt-0.5 text-xs text-muted-foreground">System alarm</Text>
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
                  <Text className="text-xs font-semibold text-muted-foreground">Reset</Text>
                </Pressable>
              )}
              <Pressable
                onPress={pickRingtone}
                className="rounded-lg bg-primary px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-primary-foreground">
                  {ringtoneUri ? 'Change' : 'Pick'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>

      {/* Challenges */}
      <View className="mb-6">
        <View className="mb-3 flex-row items-center justify-between">
          <SectionLabel>Challenges ({actions.length})</SectionLabel>
          <Pressable
            onPress={addAction}
            className="flex-row items-center gap-1 rounded-xl bg-primary px-3 py-1.5 active:opacity-80"
          >
            <Text className="text-xs font-bold text-primary-foreground">+ Add</Text>
          </Pressable>
        </View>

        {actions.map((action, i) => (
          <ActionRow
            key={i}
            action={action}
            index={i}
            total={actions.length}
            onMoveUp={() => moveAction(i, i - 1)}
            onMoveDown={() => moveAction(i, i + 1)}
            onDelete={() => deleteAction(i)}
            onChange={(a) => updateAction(i, a)}
          />
        ))}
      </View>

      {/* Save */}
      <Pressable
        disabled={saving}
        onPress={handleSave}
        className={`items-center rounded-2xl py-4 ${saving ? 'bg-primary/50' : 'bg-primary active:opacity-80'}`}
      >
        <Text className="text-base font-bold text-primary-foreground">
          {saving ? 'Saving…' : alarmId ? 'Save changes' : 'Create alarm'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}
