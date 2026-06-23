import { expo } from './drizzle/client';

export function getSettingSync(key: string): string | null {
  try {
    const row = expo.getFirstSync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [key],
    );
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export function saveSetting(key: string, value: string): void {
  expo.runSync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value],
  );
}
