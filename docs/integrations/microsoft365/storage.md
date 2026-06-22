# Storage — Microsoft 365

## Secure Store (Expo Secure Store) — sensível
- `ms365_access_token`, `ms365_refresh_token`, `ms365_access_token_exp`. Nunca sai daqui.

## SQLite (`tiron_tasks.db`, mesma conexão do app) — cache offline
- **ms365_account_meta**: metadados não-sensíveis da conta (microsoftUserId, email, displayName, tokenExpiresAt, lastSyncAt). Sem tokens.
- **ms365_items**: itens unificados (`id, external_id, source_type, title, summary, status, priority, due_date, web_link, last_sync, …` + colunas auxiliares de e-mail). UNIQUE `(source_type, external_id)` para upsert idempotente.
- **ms365_delta_tokens**: `scope` (ex.: `todo:<listId>`) → `delta_link`.

Migração idempotente (CREATE TABLE IF NOT EXISTS) no boot do módulo.

## Ciclo de vida
- Conectar → cria/atualiza `account_meta`.
- Sync → upsert em `items`, atualiza delta tokens.
- Desconectar: pergunta **remover dados** (apaga items+delta+account+tokens) ou **manter histórico** (mantém items locais, apaga tokens).
