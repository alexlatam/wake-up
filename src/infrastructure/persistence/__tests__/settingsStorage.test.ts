/**
 * Pure unit tests for settingsStorage — no real DB required.
 * The expo sqlite client is mocked at the module level.
 *
 * NOTE: Integration-level tests (verifying the actual SQL dialect, WAL mode,
 * table creation, etc.) are intentionally not covered here — those belong in
 * an integration test that spins up a real SQLite database.
 */

const mockGetFirstSync = jest.fn();
const mockRunSync = jest.fn();

jest.mock('../drizzle/client', () => ({
  expo: {
    getFirstSync: (...args: unknown[]) => mockGetFirstSync(...args),
    runSync: (...args: unknown[]) => mockRunSync(...args),
  },
}));

import { getSettingSync, saveSetting } from '../settingsStorage';

// --- getSettingSync ---

describe('getSettingSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the stored value when key exists', () => {
    mockGetFirstSync.mockReturnValue({ value: 'dark' });

    const result = getSettingSync('theme');

    expect(mockGetFirstSync).toHaveBeenCalledWith(
      'SELECT value FROM settings WHERE key = ?',
      ['theme'],
    );
    expect(result).toBe('dark');
  });

  it('returns null when key not found (row is undefined)', () => {
    mockGetFirstSync.mockReturnValue(undefined);

    const result = getSettingSync('missing-key');

    expect(result).toBeNull();
  });

  it('returns null when row exists but value is undefined (row?.value ?? null)', () => {
    // Defensive: row returned but value field absent
    mockGetFirstSync.mockReturnValue({} as never);

    const result = getSettingSync('partial-row');

    expect(result).toBeNull();
  });

  it('returns null and swallows the error when DB throws (e.g. table missing)', () => {
    mockGetFirstSync.mockImplementation(() => {
      throw new Error('no such table: settings');
    });

    const result = getSettingSync('theme');

    expect(result).toBeNull();
  });

  it('passes the key as a bound parameter, not interpolated into SQL', () => {
    mockGetFirstSync.mockReturnValue({ value: 'en' });

    getSettingSync('language');

    const [sql, params] = mockGetFirstSync.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('?');
    expect(params).toEqual(['language']);
  });
});

// --- saveSetting ---

describe('saveSetting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls runSync with INSERT OR REPLACE SQL and bound parameters', () => {
    saveSetting('theme', 'dark');

    expect(mockRunSync).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['theme', 'dark'],
    );
  });

  it('calling twice with the same key issues two runSync calls (upsert semantics — DB deduplicates)', () => {
    // The function itself does not deduplicate; it always delegates to DB.
    // INSERT OR REPLACE in SQLite ensures no duplicate rows — but here we
    // only verify the correct SQL is issued both times.
    saveSetting('theme', 'light');
    saveSetting('theme', 'dark');

    expect(mockRunSync).toHaveBeenCalledTimes(2);
    expect(mockRunSync).toHaveBeenNthCalledWith(1,
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['theme', 'light'],
    );
    expect(mockRunSync).toHaveBeenNthCalledWith(2,
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['theme', 'dark'],
    );
  });

  it('saving a different key does not affect calls made for the first key', () => {
    saveSetting('theme', 'dark');
    saveSetting('language', 'es');

    expect(mockRunSync).toHaveBeenCalledTimes(2);
    expect(mockRunSync).toHaveBeenNthCalledWith(1,
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['theme', 'dark'],
    );
    expect(mockRunSync).toHaveBeenNthCalledWith(2,
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      ['language', 'es'],
    );
  });

  it('passes key and value as bound parameters, not interpolated into SQL', () => {
    saveSetting('theme', "'; DROP TABLE settings; --");

    const [sql, params] = mockRunSync.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('?');
    expect(params).toEqual(['theme', "'; DROP TABLE settings; --"]);
  });

  it('returns void (no return value)', () => {
    const result = saveSetting('theme', 'dark');

    expect(result).toBeUndefined();
  });
});
