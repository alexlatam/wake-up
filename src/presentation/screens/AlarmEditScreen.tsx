import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAlarms } from '@/presentation/hooks/useAlarms';
import { getContainer } from '@/infrastructure/di/container';
import type { ActionConfig, MathLevel, PuzzleLevel, Weekday } from '@/domain/alarm/Action';
import { Text } from '~/components/ui/text';
import { Button } from '~/components/ui/button';

// ─── Types ───────────────────────────────────────────────────────────────────

type DraftAction =
  | { type: 'BUTTON' }
  | { type: 'MATH'; level: MathLevel }
  | { type: 'PUZZLE'; level: PuzzleLevel; imageUri: string | null };

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKDAY_LABELS: { day: Weekday; short: string }[] = [
  { day: 0, short: 'Do' },
  { day: 1, short: 'Lu' },
  { day: 2, short: 'Ma' },
  { day: 3, short: 'Mi' },
  { day: 4, short: 'Ju' },
  { day: 5, short: 'Vi' },
  { day: 6, short: 'Sá' },
];

const MATH_LEVELS: MathLevel[] = ['MINIMO', 'MEDIO', 'MAXIMO', 'EXTREMO'];
const PUZZLE_LEVELS: PuzzleLevel[] = ['MINIMO', 'MEDIO', 'MAXIMO'];
const PUZZLE_LEVEL_LABELS: Record<PuzzleLevel, string> = {
  MINIMO: '6 piezas',
  MEDIO: '12 piezas',
  MAXIMO: '36 piezas',
};
const MATH_LEVEL_LABELS: Record<MathLevel, string> = {
  MINIMO: 'Fácil',
  MEDIO: 'Medio',
  MAXIMO: 'Difícil',
  EXTREMO: 'Extremo',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

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
    <View className="flex-row gap-2">
      {WEEKDAY_LABELS.map(({ day, short }) => {
        const active = selected.has(day);
        return (
          <Pressable
            key={day}
            onPress={() => toggle(day)}
            className={`h-10 w-10 items-center justify-center rounded-full ${
              active ? 'bg-primary' : 'bg-muted'
            }`}
          >
            <Text className={`text-xs font-semibold ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
              {short}
            </Text>
          </Pressable>
        );
      })}
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
    <View className="flex-row items-center gap-4">
      <View className="items-center">
        <Pressable
          className="p-2"
          onPress={() => onHourChange((hour + 1) % 24)}
        >
          <Text className="text-2xl text-primary">▲</Text>
        </Pressable>
        <Text className="w-12 text-center text-4xl font-bold">
          {String(hour).padStart(2, '0')}
        </Text>
        <Pressable
          className="p-2"
          onPress={() => onHourChange((hour + 23) % 24)}
        >
          <Text className="text-2xl text-primary">▼</Text>
        </Pressable>
      </View>
      <Text className="text-4xl font-bold text-muted-foreground">:</Text>
      <View className="items-center">
        <Pressable
          className="p-2"
          onPress={() => onMinuteChange((minute + 1) % 60)}
        >
          <Text className="text-2xl text-primary">▲</Text>
        </Pressable>
        <Text className="w-12 text-center text-4xl font-bold">
          {String(minute).padStart(2, '0')}
        </Text>
        <Pressable
          className="p-2"
          onPress={() => onMinuteChange((minute + 59) % 60)}
        >
          <Text className="text-2xl text-primary">▼</Text>
        </Pressable>
      </View>
    </View>
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
      Alert.alert('Permiso requerido', 'Se necesita acceso a la galería para seleccionar una imagen.');
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
    <View className="mb-3 rounded-lg border border-border bg-background p-3">
      {/* Header: order controls + delete */}
      <View className="mb-2 flex-row items-center justify-between">
        <View className="flex-row gap-2">
          <Pressable
            disabled={index === 0}
            onPress={onMoveUp}
            className={`rounded px-2 py-1 ${index === 0 ? 'opacity-30' : 'bg-muted'}`}
          >
            <Text className="text-xs">↑</Text>
          </Pressable>
          <Pressable
            disabled={index === total - 1}
            onPress={onMoveDown}
            className={`rounded px-2 py-1 ${index === total - 1 ? 'opacity-30' : 'bg-muted'}`}
          >
            <Text className="text-xs">↓</Text>
          </Pressable>
          <Text className="py-1 text-xs text-muted-foreground">Reto {index + 1}</Text>
        </View>
        <Pressable onPress={onDelete}>
          <Text className="text-sm text-destructive">✕</Text>
        </Pressable>
      </View>

      {/* Type selector */}
      <View className="mb-2 flex-row gap-2">
        {(['BUTTON', 'MATH', 'PUZZLE'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => {
              if (t === 'BUTTON') onChange({ type: 'BUTTON' });
              if (t === 'MATH') onChange({ type: 'MATH', level: 'MINIMO' });
              if (t === 'PUZZLE') onChange({ type: 'PUZZLE', level: 'MINIMO', imageUri: null });
            }}
            className={`flex-1 rounded py-1.5 ${action.type === t ? 'bg-primary' : 'bg-muted'}`}
          >
            <Text
              className={`text-center text-xs font-medium ${
                action.type === t ? 'text-primary-foreground' : 'text-muted-foreground'
              }`}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Level selector for MATH */}
      {action.type === 'MATH' && (
        <View className="flex-row flex-wrap gap-2">
          {MATH_LEVELS.map((level) => (
            <Pressable
              key={level}
              onPress={() => onChange({ type: 'MATH', level })}
              className={`rounded px-2 py-1 ${action.level === level ? 'bg-primary' : 'bg-muted'}`}
            >
              <Text
                className={`text-xs ${action.level === level ? 'text-primary-foreground' : 'text-muted-foreground'}`}
              >
                {MATH_LEVEL_LABELS[level]}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {/* Level + image for PUZZLE */}
      {action.type === 'PUZZLE' && (
        <>
          <View className="mb-2 flex-row flex-wrap gap-2">
            {PUZZLE_LEVELS.map((level) => (
              <Pressable
                key={level}
                onPress={() => onChange({ ...action, level })}
                className={`rounded px-2 py-1 ${action.level === level ? 'bg-primary' : 'bg-muted'}`}
              >
                <Text
                  className={`text-xs ${action.level === level ? 'text-primary-foreground' : 'text-muted-foreground'}`}
                >
                  {PUZZLE_LEVEL_LABELS[level]}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable onPress={pickImage} className="rounded bg-muted px-3 py-2">
            <Text className="text-center text-xs text-muted-foreground">
              {action.imageUri ? '📷 Cambiar imagen' : '📷 Seleccionar imagen (opcional)'}
            </Text>
          </Pressable>
        </>
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
  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [actions, setActions] = useState<DraftAction[]>([{ type: 'BUTTON' }]);
  const [saving, setSaving] = useState(false);

  // Load existing alarm
  useEffect(() => {
    if (!alarmId) return;
    const alarm = getById(alarmId);
    if (!alarm) {
      // Fetch from repo directly if not in cache
      getContainer()
        .alarmRepository.findById(alarmId)
        .then((a) => {
          if (!a) return;
          setLabel(a.label);
          setDays(new Set(a.schedule.days));
          setHour(a.schedule.hour);
          setMinute(a.schedule.minute);
          setActions(
            a.actions.map((ac): DraftAction => {
              if (ac.type === 'BUTTON') return { type: 'BUTTON' };
              if (ac.type === 'MATH') return { type: 'MATH', level: ac.level };
              return { type: 'PUZZLE', level: ac.level, imageUri: ac.imageUri };
            }),
          );
        });
    } else {
      setLabel(alarm.label);
      setDays(new Set(alarm.schedule.days));
      setHour(alarm.schedule.hour);
      setMinute(alarm.schedule.minute);
      setActions(
        alarm.actions.map((ac): DraftAction => {
          if (ac.type === 'BUTTON') return { type: 'BUTTON' };
          if (ac.type === 'MATH') return { type: 'MATH', level: ac.level };
          return { type: 'PUZZLE', level: ac.level, imageUri: ac.imageUri };
        }),
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarmId]);

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
      Alert.alert('Error', 'Una alarma debe tener al menos un reto.');
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
      Alert.alert('Error', 'Selecciona al menos un día.');
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
          label: label.trim() || 'Alarma',
          days: [...days] as Weekday[],
          hour,
          minute,
          actions: actionConfigs,
        });
      } else {
        await create({
          label: label.trim() || 'Alarma',
          days: [...days] as Weekday[],
          hour,
          minute,
          actions: actionConfigs,
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
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-4 pb-24">
      {/* Label */}
      <Text className="mb-1 text-sm font-semibold text-foreground">Nombre</Text>
      <TextInput
        value={label}
        onChangeText={setLabel}
        placeholder="Alarma"
        placeholderTextColor="#94a3b8"
        className="mb-6 rounded-lg border border-border bg-background px-4 py-3 text-base text-foreground"
      />

      {/* Time */}
      <Text className="mb-3 text-sm font-semibold text-foreground">Hora</Text>
      <View className="mb-6 items-center">
        <TimePicker
          hour={hour}
          minute={minute}
          onHourChange={setHour}
          onMinuteChange={setMinute}
        />
      </View>

      {/* Days */}
      <Text className="mb-3 text-sm font-semibold text-foreground">Días</Text>
      <View className="mb-6">
        <DayPicker selected={days} onChange={setDays} />
      </View>

      {/* Actions */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-foreground">Retos ({actions.length})</Text>
        <Pressable onPress={addAction} className="rounded-full bg-primary px-3 py-1">
          <Text className="text-xs font-semibold text-primary-foreground">+ Añadir</Text>
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

      {/* Save */}
      <View className="mt-4">
        <Button disabled={saving} onPress={handleSave}>
          <Text>{saving ? 'Guardando…' : alarmId ? 'Guardar cambios' : 'Crear alarma'}</Text>
        </Button>
      </View>
    </ScrollView>
  );
}
