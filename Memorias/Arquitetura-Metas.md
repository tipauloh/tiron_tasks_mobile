# Memória — Arquitetura Metas

## Camadas (espelham o módulo Tasks)
```
Mobile (app_mobile)                      Backend (app_api)
(tabs)/metas.tsx  ─┐                     api/v1/goals.py (router)
create-meta.tsx    ├─ use-goals (RQ) ──▶ services/goal_service.py (motor + CRUD)
goal/[id].tsx     ─┘     │               schemas/goal.py
components/metas/*       │               database/models/{goal,key_result,goal_checkin}.py
infrastructure/api/goal-api.ts          main.py: _CREATE_GOAL_TABLES (migração no lifespan)
```

## Dados
- 3 tabelas: `goals`, `key_results`, `goal_checkins` (Postgres compartilhado).
- Acesso por `user_id`; soft-delete (`deleted_at`); índices em FKs.
- Histórico imutável em `goal_checkins` (valor + kr_progress + goal_progress + recorded_at).

## Estado / sincronização
- **Server = fonte da verdade.** Mobile usa React Query (keys `['goals']`,
  `['goals','dashboard']`), invalida em toda mutação. Offline = cache do RQ.
- **Cálculo só no backend** (`goal_service`): progresso de KR (suporta crescente/decrescente),
  média ponderada do objetivo, score ponderado dos objetivos ativos, tendência (7 dias).

## Segurança / consistência
- `require_tasks_permission`; `auth.user["id"]`.
- Auditoria (`audit_service`), cache (`cache.cache_delete("goals:{uid}:*")`), envelopes
  `SingleResponse`/`PaginatedResponse`/`MessageResponse`.

## Pontos de extensão
- `goal_checkins` aceita origem genérica → futura integração KR↔Tarefas (uma tarefa
  concluída pode gerar um check-in). `is_primary` pronto para Home/widgets.
