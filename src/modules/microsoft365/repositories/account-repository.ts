// Microsoft 365 — repositório das contas (metadados não sensíveis em SQLite).
//
// Tokens NÃO ficam aqui — só Secure Store. MULTI-CONTA: uma linha por conta
// Microsoft conectada (id = profile.id da Microsoft).

import type { SQLiteDatabase } from 'expo-sqlite';
import { getMs365Database } from '../storage/db';
import { MS365_TABLES } from '../storage/schema';
import type { MicrosoftAccount } from '../types';
import { ms365Logger } from '../utils/logger';

interface AccountRow {
  id: string;
  user_id: string;
  microsoft_user_id: string;
  email: string;
  display_name: string;
  token_expires_at: number;
  last_sync_at: number | null;
  created_at: number;
  updated_at: number;
}

function mapRow(row: AccountRow): MicrosoftAccount {
  return {
    id: row.id,
    userId: row.user_id,
    microsoftUserId: row.microsoft_user_id,
    email: row.email,
    displayName: row.display_name,
    tokenExpiresAt: row.token_expires_at,
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class MicrosoftAccountRepository {
  private get db(): SQLiteDatabase {
    return getMs365Database();
  }

  /** Retorna todas as contas conectadas (mais antigas primeiro). */
  getAccounts(): MicrosoftAccount[] {
    const rows = this.db.getAllSync<AccountRow>(
      `SELECT * FROM ${MS365_TABLES.accountMeta} ORDER BY created_at ASC`,
    );
    return rows.map(mapRow);
  }

  /** Retorna uma conta pelo id, ou null. */
  getAccountById(id: string): MicrosoftAccount | null {
    const row = this.db.getFirstSync<AccountRow>(
      `SELECT * FROM ${MS365_TABLES.accountMeta} WHERE id = ?`,
      [id],
    );
    return row ? mapRow(row) : null;
  }

  /** Upsert da conta (metadados não sensíveis). */
  saveAccount(account: MicrosoftAccount): void {
    this.db.runSync(
      `INSERT INTO ${MS365_TABLES.accountMeta}
         (id, user_id, microsoft_user_id, email, display_name,
          token_expires_at, last_sync_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         user_id = excluded.user_id,
         microsoft_user_id = excluded.microsoft_user_id,
         email = excluded.email,
         display_name = excluded.display_name,
         token_expires_at = excluded.token_expires_at,
         last_sync_at = excluded.last_sync_at,
         updated_at = excluded.updated_at`,
      [
        account.id,
        account.userId,
        account.microsoftUserId,
        account.email,
        account.displayName,
        account.tokenExpiresAt,
        account.lastSyncAt,
        account.createdAt,
        account.updatedAt,
      ],
    );
    ms365Logger.info('microsoft_cache', 'account meta salvo', { accountId: account.id });
  }

  /** Atualiza o timestamp da última sincronização da conta. */
  setLastSyncAt(accountId: string, lastSyncAt: number): void {
    this.db.runSync(
      `UPDATE ${MS365_TABLES.accountMeta} SET last_sync_at = ?, updated_at = ? WHERE id = ?`,
      [lastSyncAt, Date.now(), accountId],
    );
  }

  /** Remove UMA conta (itens/delta tratados separadamente). */
  clearAccount(accountId: string): void {
    this.db.runSync(`DELETE FROM ${MS365_TABLES.accountMeta} WHERE id = ?`, [accountId]);
    ms365Logger.info('microsoft_cache', 'account meta removido', { accountId });
  }
}

export const microsoftAccountRepository = new MicrosoftAccountRepository();
