// Microsoft 365 — repositório de itens sincronizados (cache offline, read-only).

import type { SQLiteDatabase } from 'expo-sqlite';
import { getMs365Database } from '../storage/db';
import { MS365_TABLES } from '../storage/schema';
import type { Microsoft365Item, Microsoft365SourceType } from '../types';
import { ms365Logger } from '../utils/logger';

interface ItemRow {
  id: string;
  external_id: string;
  source_type: string;
  title: string;
  summary: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  web_link: string | null;
  last_sync: number;
  created_at: number;
  updated_at: number;
  email_from: string | null;
  email_received_at: string | null;
  email_is_read: number | null;
  email_flag_status: string | null;
  email_preview: string | null;
}

function mapRow(row: ItemRow): Microsoft365Item {
  return {
    id: row.id,
    externalId: row.external_id,
    sourceType: row.source_type as Microsoft365SourceType,
    title: row.title,
    summary: row.summary,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    webLink: row.web_link,
    lastSync: row.last_sync,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    emailFrom: row.email_from,
    emailReceivedAt: row.email_received_at,
    emailIsRead: row.email_is_read == null ? null : Boolean(row.email_is_read),
    emailFlagStatus: row.email_flag_status,
    emailPreview: row.email_preview,
  };
}

export interface ListItemsOptions {
  sourceType?: Microsoft365SourceType;
}

export class Microsoft365ItemRepository {
  private get db(): SQLiteDatabase {
    return getMs365Database();
  }

  /** Lista itens do cache, opcionalmente filtrando por tipo. */
  listItems(options?: ListItemsOptions): Microsoft365Item[] {
    let sql = `SELECT * FROM ${MS365_TABLES.items}`;
    const params: (string | number)[] = [];
    if (options?.sourceType) {
      sql += ' WHERE source_type = ?';
      params.push(options.sourceType);
    }
    sql += ' ORDER BY COALESCE(email_received_at, due_date, created_at) DESC, created_at DESC';
    const rows = this.db.getAllSync<ItemRow>(sql, params);
    return rows.map(mapRow);
  }

  /** Conta itens por tipo (para o card de status). */
  countItems(sourceType?: Microsoft365SourceType): number {
    let sql = `SELECT COUNT(*) AS c FROM ${MS365_TABLES.items}`;
    const params: (string | number)[] = [];
    if (sourceType) {
      sql += ' WHERE source_type = ?';
      params.push(sourceType);
    }
    const row = this.db.getFirstSync<{ c: number }>(sql, params);
    return row?.c ?? 0;
  }

  /**
   * Upsert (em lote, transacional) de itens. A chave de unicidade é
   * (source_type, external_id): re-sincronizar o mesmo item atualiza a linha
   * sem duplicar, preservando created_at original.
   */
  upsertItems(items: Microsoft365Item[]): void {
    if (items.length === 0) return;
    this.db.withTransactionSync(() => {
      for (const item of items) {
        this.db.runSync(
          `INSERT INTO ${MS365_TABLES.items}
             (id, external_id, source_type, title, summary, status, priority,
              due_date, web_link, last_sync, created_at, updated_at,
              email_from, email_received_at, email_is_read, email_flag_status, email_preview)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(source_type, external_id) DO UPDATE SET
             title = excluded.title,
             summary = excluded.summary,
             status = excluded.status,
             priority = excluded.priority,
             due_date = excluded.due_date,
             web_link = excluded.web_link,
             last_sync = excluded.last_sync,
             updated_at = excluded.updated_at,
             email_from = excluded.email_from,
             email_received_at = excluded.email_received_at,
             email_is_read = excluded.email_is_read,
             email_flag_status = excluded.email_flag_status,
             email_preview = excluded.email_preview`,
          [
            item.id,
            item.externalId,
            item.sourceType,
            item.title,
            item.summary ?? null,
            item.status ?? null,
            item.priority ?? null,
            item.dueDate ?? null,
            item.webLink ?? null,
            item.lastSync,
            item.createdAt,
            item.updatedAt,
            item.emailFrom ?? null,
            item.emailReceivedAt ?? null,
            item.emailIsRead == null ? null : item.emailIsRead ? 1 : 0,
            item.emailFlagStatus ?? null,
            item.emailPreview ?? null,
          ],
        );
      }
    });
    ms365Logger.info('microsoft_cache', 'itens upsert', { count: items.length });
  }

  /** Remove todos os itens (ou apenas de um tipo). */
  clearItems(sourceType?: Microsoft365SourceType): void {
    if (sourceType) {
      this.db.runSync(`DELETE FROM ${MS365_TABLES.items} WHERE source_type = ?`, [sourceType]);
    } else {
      this.db.runSync(`DELETE FROM ${MS365_TABLES.items}`);
    }
    ms365Logger.info('microsoft_cache', 'itens removidos', { sourceType: sourceType ?? 'all' });
  }
}

export const microsoft365ItemRepository = new Microsoft365ItemRepository();
