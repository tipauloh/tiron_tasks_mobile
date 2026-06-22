# Arquitetura — Microsoft 365

Módulo isolado em `src/modules/microsoft365/`, baixo acoplamento, Clean Architecture.

```
UI (screens/components)  →  hooks (React Query)  →  services (Microsoft365Service)
                                                        │
                        ┌───────────────────────────────┼───────────────────────────┐
                        ▼                               ▼                           ▼
                     auth/ (PKCE)                  graph/ (Graph REST)          storage/+repositories/ (SQLite)
                        │                               │                           │
                 Secure Store (tokens)          login.microsoftonline.com     tiron_tasks.db (cache offline)
                                                 graph.microsoft.com
```

## Camadas
- **screens/components**: apresentação pura (estados conectado/não-conectado, cards, itens).
- **hooks**: `useMicrosoftAccount`, `useMicrosoft365Items`, `useMicrosoftSync`, `useMicrosoft365AutoSync` — React Query sobre o service/repositories.
- **services**: `Microsoft365Service` (interface) com `RealMicrosoft365Service` (produção) e mock (testes/dev). `connect`, `disconnect`, `syncNow`, `getConnectionState`.
- **auth**: OAuth Code+PKCE, tokens no Secure Store, refresh automático.
- **graph**: `graphGet`/`graphGetAllPages`/`graphGetDelta`, `fetchFlaggedEmails`, `fetchTodoListsAndTasks`, `me()`.
- **storage/repositories**: SQLite (`ms365_items`, `ms365_account_meta`, `ms365_delta_tokens`), CRUD + delta tokens.
- **models/mappers**: Graph → `Microsoft365Item` unificado.

## Princípios
SOLID, type-safe, testável (interface trocável mock↔real), tokens isolados do cache, módulo desligável sem afetar o app.
