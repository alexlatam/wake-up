import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAlarms } from '@/presentation/hooks/useAlarms';
import { getContainer } from '@/infrastructure/di/container';
import type { ActionConfig, MathLevel, PuzzleLevel, Weekday } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';

// ─── Types ───────────────────────────────────────────────────────────────────

type DraftAction =
  | { type: 'BUTTON' }
  | { type: 'MATH'; level: MathLevel }
  | { type: 'PUZZLE'; level: PuzzleLevel; imageUri: string | null };

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

const MATH_LEVELS: MathLevel[] = ['MINIMO', 'MEDIO', 'MAXIMO', 'EXTREMO'];
const PUZZLE_LEVELS: PuzzleLevel[] = ['MINIMO', 'MEDIO', 'MAXIMO'];
const PUZZLE_LEVEL_LABELS: Record<PuzzleLevel, string> = {
  MINIMO: '6 tiles',
  MEDIO: '12 tiles',
  MAXIMO: '36 tiles',
};
const MATH_LEVEL_LABELS: Record<MathLevel, string> = {
  MINIMO: 'Easy',
  MEDIO: 'Medium',
  MAXIMO: 'Hard',
  EXTREMO: 'Extreme',
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

function TimeSpinner({
  value,
  max,
  onChange,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <View className="items-center">
      <Pressable
        onPress={() => onChange((value + 1) % (max + 1))}
        className="px-4 py-2 active:opacity-50"
      >
        <Text className="text-2xl text-primary">▲</Text>
      </Pressable>
      <Text className="w-16 text-center text-5xl font-bold tabular-nums text-foreground">
        {String(value).padStart(2, '0')}
      </Text>
      <Pressable
        onPress={() => onChange((value + max) % (max + 1))}
        className="px-4 py-2 active:opacity-50"
      >
        <Text className="text-2xl text-primary">▼</Text>
      </Pressable>
    </View>
  );
}

function TimePicker({
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: {
  hour: number;
  minute: number;
  onHourChange: (h: number) => void;
  onMinuteChange: (m: number) => void;
}) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      <TimeSpinner value={hour} max={23} onChange={onHourChange} />
      <Text className="mb-1 text-5xl font-bold text-muted-foreground">:</Text>
      <TimeSpinner value={minute} max={59} onChange={onMinuteChange} />
    </View>
  );
}

// ─── Action row ───────────────────────────────────────────────────────────────

function ChipButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-lg px-3 py-1.5 ${active ? 'bg-primary' : 'bg-muted'}`}
    >
      <Text className={`text-xs font-semibold ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
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
        <View className="mb-3 flex-row gap-2">
          {(['BUTTON', 'MATH', 'PUZZLE'] as const).map((t) => (
            <ChipButton
              key={t}
              label={t}
              active={action.type === t}
              onPress={() => {
                if (t === 'BUTTON') onChange({ type: 'BUTTON' });
                if (t === 'MATH') onChange({ type: 'MATH', level: 'MINIMO' });
                if (t === 'PUZZLE') onChange({ type: 'PUZZLE', level: 'MINIMO', imageUri: null });
              }}
            />
          ))}
        </View>

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

        {/* BUTTON description */}
        {action.type === 'BUTTON' && (
          <Text className="text-sm text-muted-foreground">
            Press a button to complete this challenge.
          </Text>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function AlarmEditScreen({ alarmId }: { alarmId: string | null }) {
  const router = useRouter();
  const { create, update, getById } = useAlarms();

  const [label, setLabel] = useState('');
  const [days, setDays] = useState<Set<Weekday>>(new Set([1, 2, 3, 4, 5]));
  const [hour, setHour] = useState(7);
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
      setHour(a.schedule.hour);
      setMinute(a.schedule.minute);
      setRingtoneUri(a.ringtoneUri);
      setActions(
        a.actions.map((ac): DraftAction => {
          if (ac.type === 'BUTTON') return { type: 'BUTTON' };
          if (ac.type === 'MATH') return { type: 'MATH', level: ac.level };
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
      return { type: 'PUZZLE', position: i, level: a.level, imageUri: a.imageUri };
    });

    setSaving(true);
    try {
      if (alarmId) {
        await update({
          id: alarmId,
          label: label.trim() || 'Alarm',
          days: [...days] as Weekday[],
          hour,
          minute,
          actions: actionConfigs,
          ringtoneUri,
        });
      } else {
        await create({
          label: label.trim() || 'Alarm',
          days: [...days] as Weekday[],
          hour,
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
            hour={hour}
            minute={minute}
            onHourChange={setHour}
            onMinuteChange={setMinute}
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
