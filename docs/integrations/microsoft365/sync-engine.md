# Sync Engine — Microsoft 365

## Gatilhos
- **Inicial**: dentro de `connect()` (best-effort; se falhar, conta segue conectada e UI pode retry).
- **Automático**: `useMicrosoft365AutoSync` — ao abrir o app, ao voltar para foreground, e a cada **30 min** (`SYNC_INTERVAL_MS`). Guard: só roda se conectado, com token, online e se passou o intervalo desde `lastSyncAt` (poupa bateria/rede).
- **Manual**: botão "Sincronizar Agora".
- Guard de concorrência: uma sync por vez.

## E-mails sinalizados (ADR-002 — sem delta)
`GET /me/messages?$filter=flag/flagStatus eq 'flagged'&$select=…&$top=50&$orderby=receivedDateTime desc`, paginado por `@odata.nextLink`. Delta de mensagens é por pasta e não combina com filtro de flag.

## Microsoft To Do (com delta)
- `GET /me/todo/lists` → para cada lista, `tasks/delta`.
- `@odata.deltaLink` persistido por lista (`delta-token-repository`, escopo `todo:<listId>`). Próxima sync usa o deltaLink salvo → só mudanças.
- Itens `@removed` (delta) são filtrados (mantemos só ativos).

## Rate limit / resiliência
- 429/503 → respeita `Retry-After` com backoff.
- 401 → tenta refresh 1x e repete; falha → reconexão.
- Paginação completa antes de persistir.

## Persistência
Resultados mapeados (`mappers`) + resumo local → `upsertItems` (UNIQUE `source_type, external_id`). `lastSyncAt` atualizado. UI mostra "Última atualização: DD/MM/YYYY HH:mm".
