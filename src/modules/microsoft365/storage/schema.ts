// Microsoft 365 — DDL das tabelas locais (cache offline, read-only).
//
// IMPORTANTE (segurança): NENHUMA destas tabelas guarda tokens. Tokens (access/
// refresh) vivem APENAS no Secure Store (fora do escopo desta camada). Aqui só
// metadados não sensíveis da conta + itens sincronizados + delta tokens do Graph.

export const MS365_TABLES = {
  accountMeta: 'ms365_account_meta',
  items: 'ms365_items',
  deltaTokens: 'ms365_delta_tokens',
} as const;

export const CREATE_MS365_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS ms365_account_meta (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    microsoft_user_id TEXT NOT NULL,
    email TEXT NOT NULL,
    display_name TEXT NOT NULL,
    token_expires_at INTEGER NOT NULL DEFAULT 0,
    last_sync_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ms365_items (
    id TEXT PRIMARY KEY,
    external_id TEXT NOT NULL,
    source_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    status TEXT,
    priority TEXT,
    due_date TEXT,
    web_link TEXT,
    last_sync INTEGER NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    email_from TEXT,
    email_received_at TEXT,
    email_is_read INTEGER,
    email_flag_status TEXT,
    email_preview TEXT,
    UNIQUE (source_type, external_id)
  );

  CREATE INDEX IF NOT EXISTS idx_ms365_items_source
    ON ms365_items (source_type, last_sync DESC);

  CREATE TABLE IF NOT EXISTS ms365_delta_tokens (
    scope TEXT PRIMARY KEY,
    delta_link TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`;
