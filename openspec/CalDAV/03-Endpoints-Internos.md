# CalDAV — 03 · Endpoints Internos (contrato API ↔ container)

Base: API existente. **Não públicos.** Protegidos por header de service token.

## Cabeçalhos
- `X-Internal-Token: <CALDAV_INTERNAL_SECRET>` — em **todas** as chamadas internas
  (comparação em tempo constante; se o secret estiver vazio, rejeita 403).
- `X-User-Id: <id>` — usuário em nome de quem o container atua (nas rotas de dados).

## Autenticação
```
POST /internal/caldav/auth
body: { "username": "...", "password": "tt_caldav_..." }
200:  { "valid": true, "user_id": 123, "tenant_id": null, "display_name": "Paulo" }
```

## Calendários
```
GET /internal/caldav/calendars        (X-User-Id)
200: { "data": [ { "id": "42", "name": "Trabalho", "color": "#208AEF",
                   "ctag": "a1b2...", "component": "VTODO" } ] }
```

## Itens (tarefas)
```
GET /internal/caldav/calendars/{cal_id}/items
200: { "data": [ {
  "uid": "tiron-77@tirontasks.com", "etag": "9f...", "kind": "todo",
  "title": "...", "description": null, "due": "2026-06-30",
  "priority": 5, "status": "NEEDS-ACTION", "completed": false,
  "categories": ["Trabalho"], "start_time": null, "end_time": null,
  "created": "...", "updated": "..." } ] }

GET    /internal/caldav/calendars/{cal_id}/items/{uid}   → { "data": item }

PUT    /internal/caldav/calendars/{cal_id}/items/{uid}
body:  { "kind", "title", "description", "due", "priority", "status",
         "completed", "categories", "start_time", "end_time" }
200:   { "data": { "uid": "...", "etag": "..." } }   (cria se não existir)

DELETE /internal/caldav/calendars/{cal_id}/items/{uid}
200:   { "message": "removido" }   (soft-delete da task)
```

## Gestão de tokens (rotas do APP, auth normal do usuário)
Base `/api/v1/caldav` (bearer do usuário):
```
GET    /api/v1/caldav/tokens                → lista (sem o token)
POST   /api/v1/caldav/tokens  {label?, regenerate?}  → { username, token } (token 1×)
DELETE /api/v1/caldav/tokens/{id}           → revoga
```

## Mapeamento ETag/CTag
- `etag(item)` = `md5(updated_at)`; muda a cada edição → cliente sabe re-baixar.
- `ctag(collection)` = `md5(max(updated_at) + count)`; muda a cada inclusão/edição/exclusão
  na lista → cliente dispara sync da collection.
