// Microsoft 365 — acesso ao SQLite local do módulo.
//
// Reaproveita a MESMA conexão/arquivo do app (tiron_tasks.db) via getDatabase(),
// e garante que as tabelas do módulo existam (idempotente).

import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../../../infrastructure/database/db';
import { CREATE_MS365_TABLES_SQL } from './schema';

let _migrated = false;

/**
 * Retorna a conexão SQLite garantindo que as tabelas do módulo Microsoft 365
 * existem. A migração roda uma única vez por processo.
 */
export function getMs365Database(): SQLiteDatabase {
  const db = getDatabase();
  if (!_migrated) {
    db.execSync(CREATE_MS365_TABLES_SQL);
    _migrated = true;
  }
  return db;
}

/** Apenas para testes: reseta o guard de migração. */
export function __resetMs365Migration(): void {
  _migrated = false;
}
