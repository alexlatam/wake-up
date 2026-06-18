import { ListAlarms } from '../ListAlarms';
import { Alarm } from '../../../domain/alarm/Alarm';
import { Schedule } from '../../../domain/alarm/Schedule';
import type { AlarmRepository } from '../../../domain/ports/AlarmRepository';

const NOW = new Date('2024-01-01T00:00:00Z');

function makeAlarm(id: string, overrides: Partial<ConstructorParameters<typeof Alarm>[0]> = {}): Alarm {
  return new Alarm({
    id,
    label: `Alarm ${id}`,
    schedule: new Schedule([1, 2, 3, 4, 5], 7, 0),
    enabled: true,
    actions: [{ type: 'BUTTON', position: 0 }],
    createdAt: NOW,
    updatedAt: NOW,
    ringtoneUri: null,
    ...overrides,
  });
}

function makeRepo(alarms: Alarm[]): AlarmRepository {
  return {
    findById: jest.fn().mockResolvedValue(null),
    findAll: jest.fn().mockResolvedValue(alarms),
    save: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ListAlarms', () => {
  it('returns empty array when no alarms exist', async () => {
    const result = await new ListAlarms(makeRepo([])).execute();
    expect(result).toEqual([]);
  });

  it('returns single alarm', async () => {
    const alarm = makeAlarm('a1');
    const result = await new ListAlarms(makeRepo([alarm])).execute();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('a1');
  });

  it('returns all alarms including disabled ones', async () => {
    const enabled = makeAlarm('a1', { enabled: true });
    const disabled = makeAlarm('a2', { enabled: false });
    const result = await new ListAlarms(makeRepo([enabled, disabled])).execute();
    expect(result).toHaveLength(2);
    expect(result.map((a) => a.id)).toEqual(expect.arrayContaining(['a1', 'a2']));
  });

  it('preserves alarm fields including ringtoneUri', async () => {
    const alarm = makeAlarm('a1', { ringtoneUri: 'file:///storage/music/song.mp3' });
    const result = await new ListAlarms(makeRepo([alarm])).execute();
    expect(result[0].ringtoneUri).toBe('file:///storage/music/song.mp3');
  });

  it('calls repo.findAll exactly once', async () => {
    const repo = makeRepo([]);
    await new ListAlarms(repo).execute();
    expect(repo.findAll).toHaveBeenCalledTimes(1);
  });
});
