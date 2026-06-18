import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as schema from './schema';

export const expo = SQLite.openDatabaseSync('wakeup.db');
export const db = drizzle(expo, { schema });
