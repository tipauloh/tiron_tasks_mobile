# Integração Microsoft 365 — Visão Geral e Análise Inicial

> Status: **Fase 1–3 (pesquisa, arquitetura, plano)**. Implementação iniciada.
> Escopo desta versão: **SOMENTE LEITURA (read-only)**. O app nunca altera dados na Microsoft.

## 1. Objetivo
Permitir conectar uma conta Microsoft 365 e **sincronizar/exibir** (read-only):
- **E-mails sinalizados** (Flagged) do Outlook.
- **Microsoft To Do** (listas e tarefas).

> ❌ **Outlook Tasks NÃO entra**: a API foi **descontinuada e parou de retornar dados em 20/08/2022** (fonte oficial Microsoft). O sucessor é o Microsoft To Do, que é o que implementamos.

Proibido nesta versão: enviar/responder/criar/excluir/arquivar e-mail; criar/editar/concluir tarefa; qualquer escrita na conta Microsoft.

## 2. Achados da pesquisa oficial (fonte: learn.microsoft.com)
| Tema | Conclusão | Endpoint / Detalhe |
|---|---|---|
| E-mails sinalizados | Filtrar por flag | `GET /me/messages?$filter=flag/flagStatus eq 'flagged'` (valores: notFlagged, complete, flagged) |
| Campos mínimos e-mail | `$select` reduz payload | `id,subject,from,receivedDateTime,bodyPreview,webLink,isRead,flag` |
| Outlook Tasks | **Descontinuada (2022)** | usar To Do |
| Microsoft To Do | Suportado | `GET /me/todo/lists`, `GET /me/todo/lists/{id}/tasks` |
| Sync incremental To Do | **Delta query suportado** | `/me/todo/lists/delta`, `/me/todo/lists/{id}/tasks/delta` |
| Sync incremental e-mail | Delta é **por pasta** (não por filtro de flag) | `/me/mailFolders/{id}/messages/delta`. Para flagged usamos filtro + paginação (ver ADR-002) |
| Auth mobile | OAuth 2.0 **Authorization Code + PKCE** | `expo-auth-session`; Azure rejeita proxy Expo → redirect próprio |
| Refresh | `offline_access` | refresh token + renovação automática |

## 3. Permissões mínimas (delegated — princípio do menor privilégio)
| Escopo | Por quê | Tipo |
|---|---|---|
| `User.Read` | Identificar a conta (displayName, mail/UPN) | delegated, read |
| `Mail.Read` | Ler e-mails sinalizados **com `bodyPreview`** (Mail.ReadBasic NÃO inclui preview) | delegated, read |
| `Tasks.Read` | Ler listas e tarefas do To Do | delegated, read |
| `offline_access` | Obter refresh token (renovação sem relogin) | OIDC |

Nenhuma permissão de **escrita** ou **administrativa**. Sem `.Shared`, sem `.All`.

## 4. Arquitetura proposta
Módulo **isolado** em `src/modules/microsoft365/` (baixo acoplamento com o resto do app), reaproveitando os padrões já existentes:
- **Tokens**: `expo-secure-store` (já usado via `src/lib/secure-storage.ts`).
- **Estado de servidor/cache**: React Query (`@tanstack/react-query`, já configurado).
- **Telas**: `expo-router` (screens em `src/app/`), acessadas a partir do **Perfil → Integrações → Microsoft 365**.
- **Persistência local (cache offline)**: SQLite (`expo-sqlite`, já no projeto) — tabelas próprias do módulo.

```
src/modules/microsoft365/
  auth/         # OAuth PKCE, token store, refresh
  graph/        # cliente Graph (fetch + rate limit + retry)
  sync/         # sync engine (inicial, incremental/delta, agendado)
  storage/      # SQLite local (accounts, items, delta tokens)
  repositories/ # acesso a dados (CRUD local)
  models/       # MicrosoftAccount, Microsoft365Item
  hooks/        # useMicrosoftAccount, useMicrosoft365Items, useSync
  services/     # orquestração (connect, disconnect, syncNow)
  components/    # cards, itens, estados
  screens/      # MicrosoftConnectionScreen (montada via src/app)
  types/  utils/  constants/  tests/
```

## 5. Modelo de dados
**MicrosoftAccount** (1 por usuário do app): `id, userId, microsoftUserId, email, displayName, accessToken*, refreshToken*, tokenExpiresAt, lastSyncAt, createdAt, updatedAt` (*tokens **só** no Secure Store, nunca no SQLite/logs).

**Microsoft365Item** (modelo unificado): `id, externalId, sourceType('EMAIL'|'TODO_TASK'), title, summary, status, priority, dueDate, webLink, lastSync, createdAt, updatedAt`. Campos extras de e-mail (from, receivedDateTime, isRead, flagStatus, preview) em colunas/JSON auxiliares.

**Lista de sistema "Microsoft365"**: criada automaticamente ao conectar; **não removível/editável/renomeável/compartilhável** (flag `system`). Ao desconectar, perguntar: remover dados sincronizados **ou** manter histórico local.

## 6. Sincronização
- **Inicial**: logo após conectar (full fetch com paginação).
- **Automática**: ao abrir o app, ao abrir a lista Microsoft365, e a cada **30 min** (throttle/guard para poupar bateria — só roda se passou o intervalo e há rede).
- **Manual**: botão "Sincronizar Agora".
- **Incremental**: **delta** para To Do (deltaLink persistido); e-mails flagged via filtro + `receivedDateTime` watermark (ADR-002).
- **Rate limit**: respeitar `Retry-After`, backoff exponencial, paginação `@odata.nextLink`.

## 7. Cache e offline
Últimos dados ficam no SQLite e são exibidos offline. UI mostra "Última atualização: DD/MM/YYYY HH:mm".

## 8. Segurança
OWASP Mobile/API Top 10 + Microsoft Secure Dev. Tokens só no Secure Store (criptografado pelo OS); refresh automático; logout limpa tudo; **logs nunca registram tokens nem conteúdo de e-mail**. Resumo de e-mail é gerado **localmente** (sem enviar conteúdo a terceiros sem consentimento explícito).

## 9. Compatibilidade
- **Expo SDK 56 / RN 0.85**: `expo-auth-session` + `expo-web-browser` (auth no browser do sistema/ASWebAuthenticationSession). Exige **build nativa** (config de scheme/plugins) — não funciona via OTA puro nem Expo Go para o redirect.
- **iOS / Android**: redirect via custom scheme `tirontasks://`. App Registration precisa da plataforma **"Mobile and desktop applications"** com esse redirect.
- **App Store / Play**: integração read-only de conta corporativa do próprio usuário é permitida; declarar uso de dados (privacy nutrition labels / Data safety) — ver checklist na doc de publicação.

## 10. Riscos e rollback
- **Risco**: mudança de API Microsoft / limites de tenant que bloqueiam apps de terceiros → mitigado por módulo isolado e feature-flag.
- **Rollback**: a integração é **aditiva e isolada**; desligar via flag remove a entrada no Perfil sem afetar o resto. Desconectar limpa tokens e (opcional) dados locais.

## 11. ⚠️ Pré-requisito BLOQUEANTE (precisa de você)
Igual ao Google/Apple: o OAuth **não funciona sem um App Registration no Microsoft Entra ID**. Detalhes e passo a passo em [`authentication.md`](./authentication.md). Sem o **Client ID** + redirect configurado, implementamos todo o código mas não há login real.

## Fontes (oficiais)
- https://learn.microsoft.com/en-us/graph/api/resources/message?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/resources/followupflag?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/previous-versions/office/office-365-api/api/version-2.0/task-rest-operations (Outlook Tasks DEPRECATED)
- https://learn.microsoft.com/en-us/graph/api/resources/todo-overview?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/api/todotask-delta?view=graph-rest-1.0
- https://learn.microsoft.com/en-us/graph/delta-query-messages
- https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow
- https://docs.expo.dev/versions/latest/sdk/auth-session/
- https://learn.microsoft.com/en-us/graph/permissions-reference
