import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL, SEED_DEFAULT_LISTS_SQL } from './schema';

let _db: SQLite.SQLiteDatabase | null = null;

export function getDatabase(): SQLite.SQLiteDatabase {
  if (!_db) {
    _db = SQLite.openDatabaseSync('tiron_tasks.db');
    // Execute migrations on first open.
    // execSync accepts a string with multiple statements separated by semicolons.
    _db.execSync(CREATE_TABLES_SQL);
    _db.execSync(SEED_DEFAULT_LISTS_SQL);
  }
  return _db;
}
