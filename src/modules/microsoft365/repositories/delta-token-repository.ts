// Microsoft 365 — repositório de delta tokens (sync incremental do Graph).
//
// O deltaLink retornado pelo Graph (To Do) é opaco e NÃO é sensível (não contém
// token de acesso), por isso pode ficar no SQLite. Indexado por "scope" (ex.:
// 'todo:listId' ou 'mail:folderId').

import type { SQLiteDatabase } from 'expo-sqlite';
import { getMs365Database } from '../storage/db';
import { MS365_TABLES } from '../storage/schema';

interface DeltaRow {
  account_id: string;
  scope: string;
  delta_link: string;
  updated_at: number;
}

export class DeltaTokenRepository {
  private get db(): SQLiteDatabase {
    return getMs365Database();
  }

  /** Retorna o deltaLink salvo para (conta, scope), ou null. */
  getDeltaToken(accountId: string, scope: string): string | null {
    const row = this.db.getFirstSync<DeltaRow>(
      `SELECT * FROM ${MS365_TABLES.deltaTokens} WHERE account_id = ? AND scope = ?`,
      [accountId, scope],
    );
    return row?.delta_link ?? null;
  }

  /** Salva/atualiza o deltaLink de (conta, scope). */
  setDeltaToken(accountId: string, scope: string, deltaLink: string): void {
    this.db.runSync(
      `INSERT INTO ${MS365_TABLES.deltaTokens} (account_id, scope, delta_link, updated_at)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(account_id, scope) DO UPDATE SET
         delta_link = excluded.delta_link,
         updated_at = excluded.updated_at`,
      [accountId, scope, deltaLink, Date.now()],
    );
  }

  /**
   * Remove deltaLinks. Sem args = apaga todos; com accountId = apaga os da conta;
   * com accountId + scope = apaga o específico.
   */
  clearDeltaToken(accountId?: string, scope?: string): void {
    if (accountId && scope) {
      this.db.runSync(
        `DELETE FROM ${MS365_TABLES.deltaTokens} WHERE account_id = ? AND scope = ?`,
        [accountId, scope],
      );
    } else if (accountId) {
      this.db.runSync(`DELETE FROM ${MS365_TABLES.deltaTokens} WHERE account_id = ?`, [accountId]);
    } else {
      this.db.runSync(`DELETE FROM ${MS365_TABLES.deltaTokens}`);
    }
  }
}

export const deltaTokenRepository = new DeltaTokenRepository();
