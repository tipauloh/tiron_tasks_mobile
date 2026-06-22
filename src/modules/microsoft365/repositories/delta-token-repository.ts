// Microsoft 365 — repositório de delta tokens (sync incremental do Graph).
//
// O deltaLink retornado pelo Graph (To Do) é opaco e NÃO é sensível (não contém
// token de acesso), por isso pode ficar no SQLite. Indexado por "scope" (ex.:
// 'todo:listId' ou 'mail:folderId').

import type { SQLiteDatabase } from 'expo-sqlite';
import { getMs365Database } from '../storage/db';
import { MS365_TABLES } from '../storage/schema';

interface DeltaRow {
  scope: string;
  delta_link: string;
  updated_at: number;
}

export class DeltaTokenRepository {
  private get db(): SQLiteDatabase {
    return getMs365Database();
  }

  /** Retorna o deltaLink salvo para um scope, ou null. */
  getDeltaToken(scope: string): string | null {
    const row = this.db.getFirstSync<DeltaRow>(
      `SELECT * FROM ${MS365_TABLES.deltaTokens} WHERE scope = ?`,
      [scope],
    );
    return row?.delta_link ?? null;
  }

  /** Salva/atualiza o deltaLink de um scope. */
  setDeltaToken(scope: string, deltaLink: string): void {
    this.db.runSync(
      `INSERT INTO ${MS365_TABLES.deltaTokens} (scope, delta_link, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(scope) DO UPDATE SET
         delta_link = excluded.delta_link,
         updated_at = excluded.updated_at`,
      [scope, deltaLink, Date.now()],
    );
  }

  /** Remove o deltaLink de um scope, ou todos se scope omitido. */
  clearDeltaToken(scope?: string): void {
    if (scope) {
      this.db.runSync(`DELETE FROM ${MS365_TABLES.deltaTokens} WHERE scope = ?`, [scope]);
    } else {
      this.db.runSync(`DELETE FROM ${MS365_TABLES.deltaTokens}`);
    }
  }
}

export const deltaTokenRepository = new DeltaTokenRepository();
