# CalDAV — 04 · Autenticação & Segurança

## Dois níveis de autenticação
1. **Usuário ↔ container (CalDAV Basic Auth):** o cliente (iPhone) envia `username` +
   `password (token)`. O container valida via `POST /internal/caldav/auth`.
2. **Container ↔ API (service token):** todas as chamadas internas levam
   `X-Internal-Token: <CALDAV_INTERNAL_SECRET>` (segredo compartilhado por env entre a API
   e o container). Sem ele → 403. Endpoints `/internal/*` não são expostos publicamente.

## Token CalDAV do usuário
- Gerado no app (Perfil → Integrações → CalDAV).
- Formato: `tt_caldav_<random urlsafe>`. **Mostrado uma única vez.**
- Armazenado como `sha256(token)` em `caldav_tokens(token_hash)`.
- **Revogável** (regenerar invalida o anterior) e auditado (`last_used_at`).
- `username` = e-mail do usuário (ou `user{id}@tirontasks.com`).

## Tabela `caldav_tokens`
`id, user_id, username (unique), token_hash, label, revoked, last_used_at, created_at`.

## Segurança obrigatória (Fase 11)
- **TLS** via Traefik + Let's Encrypt (`synctasks.tiron.com.br`).
- **Rate limit** (middleware Traefik/`secure-headers@file` + limite no app).
- **Token revogável** (acima).
- **Auditoria:** `audit_service` registra `caldav.token_created/revoked`,
  `caldav.item_put`, `caldav.item_deleted` (login/criação/edição/exclusão).
- **Logs de acesso** estruturados (JSON) no container.
- Tokens/segredos **nunca** logados.

## Isolamento multi-tenant
A API resolve `user_id` do token e filtra **toda** consulta por ele. O `X-User-Id` enviado
pelo container deve corresponder ao usuário autenticado (o container só o envia após
`auth` bem-sucedido). Sem vazamento entre usuários.
