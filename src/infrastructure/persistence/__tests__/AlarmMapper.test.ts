/**
 * Pure unit tests for AlarmMapper — no DB required.
 * Hand-built row objects are passed directly to toDomain/toRow/toActionRows.
 */
import { AlarmMapper } from '../AlarmMapper';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';
import { InvalidActionsError } from '../../../domain/alarm/errors';
import { InvalidScheduleError } from '../../../domain/alarm/errors';

// --- Factories ---

const CREATED_AT = new Date('2024-01-01T00:00:00Z');
const UPDATED_AT = new Date('2024-06-01T00:00:00Z');

/** Minimal valid alarm row — override individual fields per test. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeAlarmRow(overrides: Record<string, any> = {}) {
  return {
    id: 'alarm-1',
    label: 'Test alarm',
    hour: 7,
    minute: 30,
    days: '[1,2,3,4,5]',
    enabled: true,
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ringtoneUri: null as string | null,
    vibrationEnabled: true,
    flashlightEnabled: false,
    ...overrides,
  };
}

/** Minimal valid action row — override per test. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeActionRow(overrides: Record<string, any> = {}) {
  return {
    id: 'alarm-1-0',
    alarmId: 'alarm-1',
    position: 0,
    type: 'BUTTON',
    level: null as string | null,
    imageUri: null as string | null,
    puzzleRows: null as number | null,
    puzzleCols: null as number | null,
    typeTextWordCount: null as number | null,
    shakeSeconds: null as number | null,
    ...overrides,
  };
}

/** Build an Alarm domain object with a single action, ready for round-trip. */
function makeAlarm(overrides: Partial<ConstructorParameters<typeof Alarm>[0]> = {}): Alarm {
  return new Alarm({
    id: 'alarm-1',
    label: 'Test alarm',
    schedule: new Schedule([1, 2, 3, 4, 5], 7, 30),
    enabled: true,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: CREATED_AT,
    updatedAt: UPDATED_AT,
    ringtoneUri: null,
    vibrationEnabled: true,
    flashlightEnabled: false,
    ...overrides,
  });
}

// --- toDomain ---

describe('AlarmMapper.toDomain', () => {
  it('maps a minimal BUTTON alarm row to domain', () => {
    const alarm = AlarmMapper.toDomain(makeAlarmRow() as never, [makeActionRow() as never]);
    expect(alarm.id).toBe('alarm-1');
    expect(alarm.label).toBe('Test alarm');
    expect(alarm.schedule.hour).toBe(7);
    expect(alarm.schedule.minute).toBe(30);
    expect([...alarm.schedule.days].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(alarm.enabled).toBe(true);
    expect(alarm.actions[0].type).toBe('BUTTON');
    expect(alarm.vibrationEnabled).toBe(true);
    expect(alarm.flashlightEnabled).toBe(false);
  });

  describe('days JSON parsing', () => {
    it('throws SyntaxError on malformed JSON days', () => {
      expect(() =>
        AlarmMapper.toDomain(makeAlarmRow({ days: 'not-json' }) as never, [makeActionRow() as never]),
      ).toThrow(SyntaxError);
    });

    it('throws SyntaxError on empty string days', () => {
      expect(() =>
        AlarmMapper.toDomain(makeAlarmRow({ days: '' }) as never, [makeActionRow() as never]),
      ).toThrow(SyntaxError);
    });

    it('throws InvalidScheduleError when days parses to empty array', () => {
      expect(() =>
        AlarmMapper.toDomain(makeAlarmRow({ days: '[]' }) as never, [makeActionRow() as never]),
      ).toThrow(InvalidScheduleError);
    });
  });

  describe('empty action rows', () => {
    it('throws InvalidActionsError when actionRows is empty', () => {
      expect(() =>
        AlarmMapper.toDomain(makeAlarmRow() as never, []),
      ).toThrow(InvalidActionsError);
    });
  });

  describe('action type mapping', () => {
    it('maps BUTTON action', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'BUTTON' }) as never],
      );
      expect(alarm.actions[0]).toEqual({ type: 'BUTTON', position: 0 });
    });

    it('maps MATH action with explicit level', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'MATH', level: 'EXTREME' }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('MATH');
      if (action.type === 'MATH') expect(action.level).toBe('EXTREME');
    });

    it('maps MATH action with null level → defaults to EASY', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'MATH', level: null }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('MATH');
      if (action.type === 'MATH') expect(action.level).toBe('EASY');
    });

    it('maps PUZZLE action with explicit level', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'PUZZLE', level: 'MEDIUM', imageUri: 'file:///img.jpg' }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('PUZZLE');
      if (action.type === 'PUZZLE') {
        expect(action.level).toBe('MEDIUM');
        expect(action.imageUri).toBe('file:///img.jpg');
      }
    });

    it('PUZZLE with null level → defaults to EASY (bug fix: missing ?? guard)', () => {
      // Before fix: `a.level as PuzzleLevel` — null level stayed null
      // After fix: `(a.level as PuzzleLevel) ?? 'EASY'`
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'PUZZLE', level: null }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('PUZZLE');
      if (action.type === 'PUZZLE') expect(action.level).toBe('EASY');
    });

    it('maps PUZZLE action with CUSTOM level and custom grid', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'PUZZLE', level: 'CUSTOM', puzzleRows: 4, puzzleCols: 5 }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('PUZZLE');
      if (action.type === 'PUZZLE') {
        expect(action.level).toBe('CUSTOM');
        expect(action.customRows).toBe(4);
        expect(action.customCols).toBe(5);
      }
    });

    it('maps TYPE_TEXT action with null level → EASY', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'TYPE_TEXT', level: null }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('TYPE_TEXT');
      if (action.type === 'TYPE_TEXT') expect(action.level).toBe('EASY');
    });

    it('maps TYPE_TEXT with CUSTOM level and customWordCount', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'TYPE_TEXT', level: 'CUSTOM', typeTextWordCount: 15 }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('TYPE_TEXT');
      if (action.type === 'TYPE_TEXT') expect(action.customWordCount).toBe(15);
    });

    it('TYPE_TEXT null typeTextWordCount → customWordCount is undefined', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'TYPE_TEXT', level: 'EASY', typeTextWordCount: null }) as never],
      );
      const action = alarm.actions[0];
      if (action.type === 'TYPE_TEXT') expect(action.customWordCount).toBeUndefined();
    });

    it('TYPE_TEXT customWordCount = 0 preserved (not coerced to undefined)', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'TYPE_TEXT', level: 'CUSTOM', typeTextWordCount: 0 }) as never],
      );
      const action = alarm.actions[0];
      if (action.type === 'TYPE_TEXT') expect(action.customWordCount).toBe(0);
    });

    it('maps SHAKE action with null level → EASY', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'SHAKE', level: null }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('SHAKE');
      if (action.type === 'SHAKE') expect(action.level).toBe('EASY');
    });

    it('maps SHAKE with CUSTOM level and customSeconds', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'SHAKE', level: 'CUSTOM', shakeSeconds: 30 }) as never],
      );
      const action = alarm.actions[0];
      if (action.type === 'SHAKE') expect(action.customSeconds).toBe(30);
    });

    it('SHAKE customSeconds = 0 preserved (not coerced to undefined)', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'SHAKE', level: 'CUSTOM', shakeSeconds: 0 }) as never],
      );
      const action = alarm.actions[0];
      if (action.type === 'SHAKE') expect(action.customSeconds).toBe(0);
    });

    it('maps WALK action with null level → EASY', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'WALK', level: null }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('WALK');
      if (action.type === 'WALK') expect(action.level).toBe('EASY');
    });

    it('maps QR_CODE action: imageUri column → qrCodeValue', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'QR_CODE', imageUri: 'https://example.com/qr' }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('QR_CODE');
      if (action.type === 'QR_CODE') expect(action.qrCodeValue).toBe('https://example.com/qr');
    });

    it('QR_CODE with null imageUri → qrCodeValue is empty string (asymmetric round-trip)', () => {
      // Null in DB becomes '' in domain (not null) — intentional default
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'QR_CODE', imageUri: null }) as never],
      );
      const action = alarm.actions[0];
      if (action.type === 'QR_CODE') expect(action.qrCodeValue).toBe('');
    });

    it('maps NFC action: imageUri column → nfcTagId', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'NFC', imageUri: 'tag-abc123' }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('NFC');
      if (action.type === 'NFC') expect(action.nfcTagId).toBe('tag-abc123');
    });

    it('NFC with null imageUri → nfcTagId is empty string', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'NFC', imageUri: null }) as never],
      );
      const action = alarm.actions[0];
      if (action.type === 'NFC') expect(action.nfcTagId).toBe('');
    });

    it('maps PHOTO_MATCH action: imageUri column → photoUri', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'PHOTO_MATCH', imageUri: 'file:///photo.jpg' }) as never],
      );
      const action = alarm.actions[0];
      expect(action.type).toBe('PHOTO_MATCH');
      if (action.type === 'PHOTO_MATCH') expect(action.photoUri).toBe('file:///photo.jpg');
    });

    it('PHOTO_MATCH with null imageUri → photoUri is empty string', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'PHOTO_MATCH', imageUri: null }) as never],
      );
      const action = alarm.actions[0];
      if (action.type === 'PHOTO_MATCH') expect(action.photoUri).toBe('');
    });

    it('unknown type string falls through to PUZZLE branch (silent coercion)', () => {
      // TODO: unknown action types are silently treated as PUZZLE actions.
      // A future improvement would be to throw or skip unknown types.
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow() as never,
        [makeActionRow({ type: 'FOOBAR', level: 'EASY' }) as never],
      );
      expect(alarm.actions[0].type).toBe('PUZZLE');
    });
  });

  describe('alarm-level field defaults', () => {
    it('vibrationEnabled null/undefined in row → defaults to true', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow({ vibrationEnabled: null }) as never,
        [makeActionRow() as never],
      );
      expect(alarm.vibrationEnabled).toBe(true);
    });

    it('vibrationEnabled explicit false preserved', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow({ vibrationEnabled: false }) as never,
        [makeActionRow() as never],
      );
      expect(alarm.vibrationEnabled).toBe(false);
    });

    it('flashlightEnabled null/undefined in row → defaults to false', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow({ flashlightEnabled: null }) as never,
        [makeActionRow() as never],
      );
      expect(alarm.flashlightEnabled).toBe(false);
    });

    it('flashlightEnabled explicit true preserved', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow({ flashlightEnabled: true }) as never,
        [makeActionRow() as never],
      );
      expect(alarm.flashlightEnabled).toBe(true);
    });

    it('ringtoneUri null preserved', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow({ ringtoneUri: null }) as never,
        [makeActionRow() as never],
      );
      expect(alarm.ringtoneUri).toBeNull();
    });

    it('ringtoneUri string preserved', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow({ ringtoneUri: 'file:///ringtone.mp3' }) as never,
        [makeActionRow() as never],
      );
      expect(alarm.ringtoneUri).toBe('file:///ringtone.mp3');
    });

    it('ringtoneUri empty string preserved (not coerced to null)', () => {
      const alarm = AlarmMapper.toDomain(
        makeAlarmRow({ ringtoneUri: '' }) as never,
        [makeActionRow() as never],
      );
      expect(alarm.ringtoneUri).toBe('');
    });
  });

  describe('position validation via Alarm constructor', () => {
    it('throws InvalidActionsError when positions are not consecutive starting at 0', () => {
      expect(() =>
        AlarmMapper.toDomain(
          makeAlarmRow() as never,
          [makeActionRow({ position: 1 }) as never],
        ),
      ).toThrow(InvalidActionsError);
    });

    it('throws InvalidActionsError on gap in positions [0, 2]', () => {
      expect(() =>
        AlarmMapper.toDomain(makeAlarmRow() as never, [
          makeActionRow({ id: 'a-0', position: 0 }) as never,
          makeActionRow({ id: 'a-2', position: 2 }) as never,
        ]),
      ).toThrow(InvalidActionsError);
    });

    it('throws InvalidActionsError on duplicate positions [0, 0]', () => {
      expect(() =>
        AlarmMapper.toDomain(makeAlarmRow() as never, [
          makeActionRow({ id: 'a-0a', position: 0 }) as never,
          makeActionRow({ id: 'a-0b', position: 0 }) as never,
        ]),
      ).toThrow(InvalidActionsError);
    });

    it('accepts two consecutive action rows at positions 0 and 1', () => {
      const alarm = AlarmMapper.toDomain(makeAlarmRow() as never, [
        makeActionRow({ id: 'a-0', position: 0, type: 'BUTTON' }) as never,
        makeActionRow({ id: 'a-1', position: 1, type: 'MATH', level: 'EASY' }) as never,
      ]);
      expect(alarm.actions).toHaveLength(2);
    });
  });
});

// --- toRow ---

describe('AlarmMapper.toRow', () => {
  it('serializes days Set to JSON array string', () => {
    const alarm = makeAlarm();
    const row = AlarmMapper.toRow(alarm);
    const parsed = JSON.parse(row.days);
    expect(parsed.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it('preserves all scalar fields', () => {
    const alarm = makeAlarm({ ringtoneUri: 'file:///tone.mp3', vibrationEnabled: false, flashlightEnabled: true });
    const row = AlarmMapper.toRow(alarm);
    expect(row.id).toBe('alarm-1');
    expect(row.label).toBe('Test alarm');
    expect(row.hour).toBe(7);
    expect(row.minute).toBe(30);
    expect(row.enabled).toBe(true);
    expect(row.ringtoneUri).toBe('file:///tone.mp3');
    expect(row.vibrationEnabled).toBe(false);
    expect(row.flashlightEnabled).toBe(true);
  });

  it('ringtoneUri null is preserved (not converted to undefined)', () => {
    const row = AlarmMapper.toRow(makeAlarm({ ringtoneUri: null }));
    expect(row.ringtoneUri).toBeNull();
  });
});

// --- toActionRows ---

describe('AlarmMapper.toActionRows', () => {
  it('synthesizes id as ${alarmId}-${position}', () => {
    const alarm = makeAlarm();
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.id).toBe('alarm-1-0');
  });

  it('BUTTON: level is null, imageUri is null', () => {
    const alarm = makeAlarm({ actions: [{ type: 'BUTTON', position: 0 }] });
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.type).toBe('BUTTON');
    expect(row.level).toBeNull();
    expect(row.imageUri).toBeNull();
  });

  it('MATH: level stored, imageUri null', () => {
    const alarm = makeAlarm({ actions: [{ type: 'MATH', position: 0, level: 'EXTREME' }] });
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.level).toBe('EXTREME');
    expect(row.imageUri).toBeNull();
  });

  it('PUZZLE: imageUri stored in image_uri, level stored', () => {
    const alarm = makeAlarm({
      actions: [{ type: 'PUZZLE', position: 0, level: 'CUSTOM', imageUri: 'file:///img.jpg', customRows: 3, customCols: 4 }],
    });
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.level).toBe('CUSTOM');
    expect(row.imageUri).toBe('file:///img.jpg');
    expect(row.puzzleRows).toBe(3);
    expect(row.puzzleCols).toBe(4);
  });

  it('QR_CODE: qrCodeValue stored in image_uri column, level null', () => {
    const alarm = makeAlarm({ actions: [{ type: 'QR_CODE', position: 0, qrCodeValue: 'https://qr.test' }] });
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.imageUri).toBe('https://qr.test');
    expect(row.level).toBeNull();
  });

  it('NFC: nfcTagId stored in image_uri column', () => {
    const alarm = makeAlarm({ actions: [{ type: 'NFC', position: 0, nfcTagId: 'tag-xyz' }] });
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.imageUri).toBe('tag-xyz');
  });

  it('PHOTO_MATCH: photoUri stored in image_uri column', () => {
    const alarm = makeAlarm({ actions: [{ type: 'PHOTO_MATCH', position: 0, photoUri: 'file:///photo.jpg' }] });
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.imageUri).toBe('file:///photo.jpg');
  });

  it('TYPE_TEXT: customWordCount stored in typeTextWordCount; shakeSeconds null', () => {
    const alarm = makeAlarm({ actions: [{ type: 'TYPE_TEXT', position: 0, level: 'CUSTOM', customWordCount: 20 }] });
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.typeTextWordCount).toBe(20);
    expect(row.shakeSeconds).toBeNull();
  });

  it('TYPE_TEXT undefined customWordCount → typeTextWordCount null', () => {
    const alarm = makeAlarm({ actions: [{ type: 'TYPE_TEXT', position: 0, level: 'EASY' }] });
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.typeTextWordCount).toBeNull();
  });

  it('SHAKE: customSeconds stored in shakeSeconds; typeTextWordCount null', () => {
    const alarm = makeAlarm({ actions: [{ type: 'SHAKE', position: 0, level: 'CUSTOM', customSeconds: 45 }] });
    const [row] = AlarmMapper.toActionRows(alarm);
    expect(row.shakeSeconds).toBe(45);
    expect(row.typeTextWordCount).toBeNull();
  });
});

// --- Round-trip: toDomain(toRow(x), toActionRows(x)) ≈ x ---

describe('AlarmMapper round-trip', () => {
  function roundTrip(alarm: Alarm): Alarm {
    return AlarmMapper.toDomain(
      AlarmMapper.toRow(alarm) as never,
      AlarmMapper.toActionRows(alarm) as never,
    );
  }

  it('BUTTON round-trip preserves all fields', () => {
    const original = makeAlarm();
    const restored = roundTrip(original);
    expect(restored.id).toBe(original.id);
    expect(restored.label).toBe(original.label);
    expect(restored.schedule.hour).toBe(7);
    expect(restored.schedule.minute).toBe(30);
    expect([...restored.schedule.days].sort()).toEqual([1, 2, 3, 4, 5]);
    expect(restored.enabled).toBe(true);
    expect(restored.ringtoneUri).toBeNull();
    expect(restored.vibrationEnabled).toBe(true);
    expect(restored.flashlightEnabled).toBe(false);
    expect(restored.actions[0].type).toBe('BUTTON');
  });

  it('MATH round-trip preserves level', () => {
    const original = makeAlarm({ actions: [{ type: 'MATH', position: 0, level: 'MAXIMUM' }] });
    const restored = roundTrip(original);
    const action = restored.actions[0];
    expect(action.type).toBe('MATH');
    if (action.type === 'MATH') expect(action.level).toBe('MAXIMUM');
  });

  it('PUZZLE round-trip preserves imageUri and custom grid', () => {
    const original = makeAlarm({
      actions: [{ type: 'PUZZLE', position: 0, level: 'CUSTOM', imageUri: 'file:///grid.jpg', customRows: 3, customCols: 4 }],
    });
    const restored = roundTrip(original);
    const action = restored.actions[0];
    expect(action.type).toBe('PUZZLE');
    if (action.type === 'PUZZLE') {
      expect(action.level).toBe('CUSTOM');
      expect(action.imageUri).toBe('file:///grid.jpg');
      expect(action.customRows).toBe(3);
      expect(action.customCols).toBe(4);
    }
  });

  it('TYPE_TEXT round-trip preserves customWordCount', () => {
    const original = makeAlarm({ actions: [{ type: 'TYPE_TEXT', position: 0, level: 'CUSTOM', customWordCount: 12 }] });
    const restored = roundTrip(original);
    const action = restored.actions[0];
    if (action.type === 'TYPE_TEXT') expect(action.customWordCount).toBe(12);
  });

  it('SHAKE round-trip preserves customSeconds', () => {
    const original = makeAlarm({ actions: [{ type: 'SHAKE', position: 0, level: 'CUSTOM', customSeconds: 60 }] });
    const restored = roundTrip(original);
    const action = restored.actions[0];
    if (action.type === 'SHAKE') expect(action.customSeconds).toBe(60);
  });

  it('QR_CODE round-trip preserves qrCodeValue', () => {
    const original = makeAlarm({ actions: [{ type: 'QR_CODE', position: 0, qrCodeValue: 'https://qr.test' }] });
    const restored = roundTrip(original);
    const action = restored.actions[0];
    if (action.type === 'QR_CODE') expect(action.qrCodeValue).toBe('https://qr.test');
  });

  it('NFC round-trip preserves nfcTagId', () => {
    const original = makeAlarm({ actions: [{ type: 'NFC', position: 0, nfcTagId: 'tag-abc' }] });
    const restored = roundTrip(original);
    const action = restored.actions[0];
    if (action.type === 'NFC') expect(action.nfcTagId).toBe('tag-abc');
  });

  it('PHOTO_MATCH round-trip preserves photoUri', () => {
    const original = makeAlarm({ actions: [{ type: 'PHOTO_MATCH', position: 0, photoUri: 'file:///photo.jpg' }] });
    const restored = roundTrip(original);
    const action = restored.actions[0];
    if (action.type === 'PHOTO_MATCH') expect(action.photoUri).toBe('file:///photo.jpg');
  });

  it('WALK round-trip preserves level', () => {
    const original = makeAlarm({ actions: [{ type: 'WALK', position: 0, level: 'MAXIMUM' }] });
    const restored = roundTrip(original);
    const action = restored.actions[0];
    expect(action.type).toBe('WALK');
    if (action.type === 'WALK') expect(action.level).toBe('MAXIMUM');
  });

  it('multi-action alarm round-trip preserves all actions in order', () => {
    const original = makeAlarm({
      actions: [
        { type: 'BUTTON', position: 0 },
        { type: 'MATH', position: 1, level: 'MEDIUM' },
        { type: 'PUZZLE', position: 2, level: 'EASY', imageUri: null },
      ],
    });
    const restored = roundTrip(original);
    expect(restored.actions).toHaveLength(3);
    expect(restored.actions[0].type).toBe('BUTTON');
    expect(restored.actions[1].type).toBe('MATH');
    expect(restored.actions[2].type).toBe('PUZZLE');
  });
});
