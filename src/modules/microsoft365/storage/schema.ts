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

// MULTI-CONTA: ms365_items e ms365_delta_tokens passaram a ser indexados por
// account_id (= profile.id da Microsoft). Como são CACHE LOCAL (re-sincronizável),
// a migração (em db.ts) recria essas tabelas UMA ÚNICA VEZ — quando ainda estão na
// estrutura antiga (sem account_id). Aqui o DDL é IDEMPOTENTE (IF NOT EXISTS): NÃO
// dropa o cache a cada abertura. A coluna que dispara a recriação é `account_id`.
export const MS365_ITEMS_MIGRATION_COLUMN = 'account_id';
export const MS365_RECREATE_ON_MISSING_COLUMN: Array<{ table: string; column: string }> = [
  { table: 'ms365_items', column: 'account_id' },
  { table: 'ms365_delta_tokens', column: 'account_id' },
];

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
    account_id TEXT NOT NULL DEFAULT '',
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
    UNIQUE (account_id, source_type, external_id)
  );

  CREATE INDEX IF NOT EXISTS idx_ms365_items_source
    ON ms365_items (account_id, source_type, last_sync DESC);

  CREATE TABLE IF NOT EXISTS ms365_delta_tokens (
    account_id TEXT NOT NULL DEFAULT '',
    scope TEXT NOT NULL,
    delta_link TEXT NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY (account_id, scope)
  );
`;
