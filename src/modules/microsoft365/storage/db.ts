// Microsoft 365 — acesso ao SQLite local do módulo.
//
// Reaproveita a MESMA conexão/arquivo do app (tiron_tasks.db) via getDatabase(),
// e garante que as tabelas do módulo existam (idempotente).

import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../../../infrastructure/database/db';
import { CREATE_MS365_TABLES_SQL, MS365_RECREATE_ON_MISSING_COLUMN } from './schema';

let _migrated = false;

/** True se a tabela EXISTE mas NÃO tem a coluna exigida (estrutura antiga). */
function tableMissingColumn(db: SQLiteDatabase, table: string, column: string): boolean {
  const cols = db.getAllSync<{ name: string }>(`PRAGMA table_info(${table})`);
  return cols.length > 0 && !cols.some((c) => c.name === column);
}

/**
 * Retorna a conexão SQLite garantindo que as tabelas do módulo Microsoft 365
 * existem. A migração roda uma vez por processo. As tabelas de cache que mudaram
 * de chave para multi-conta (account_id) são recriadas UMA ÚNICA VEZ — só quando
 * ainda estão na estrutura antiga —, sem apagar o cache nas aberturas seguintes.
 */
export function getMs365Database(): SQLiteDatabase {
  const db = getDatabase();
  if (!_migrated) {
    for (const { table, column } of MS365_RECREATE_ON_MISSING_COLUMN) {
      if (tableMissingColumn(db, table, column)) {
        db.execSync(`DROP TABLE IF EXISTS ${table};`);
      }
    }
    db.execSync(CREATE_MS365_TABLES_SQL);
    // Remove contas LEGADAS do single-account: lá o id era um UUID local (≠
    // microsoft_user_id) e os tokens ficavam numa chave fixa, incompatível com o
    // multi-conta. Precisam ser reconectadas; sem isto virariam contas-fantasma.
    db.execSync('DELETE FROM ms365_account_meta WHERE id <> microsoft_user_id;');
    _migrated = true;
  }
  return db;
}

/** Apenas para testes: reseta o guard de migração. */
export function __resetMs365Migration(): void {
  _migrated = false;
}
