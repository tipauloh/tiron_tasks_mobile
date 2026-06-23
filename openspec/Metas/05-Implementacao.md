# Metas — 05 · Implementação

## Backend (app_api) — espelha o módulo Tasks
- **Models:** `app/database/models/{goal,key_result,goal_checkin}.py` (SQLAlchemy `Mapped`),
  registrados em `models/__init__.py`.
- **Migração:** lista `_MIGRATE_GOALS` em `app/main.py`, executada no `lifespan`
  (idempotente, `CREATE TABLE IF NOT EXISTS`) — sem Alembic.
- **Schemas:** `app/schemas/goal.py` (Summary/Detail com campo `progress` calculado;
  Create com KRs aninhados; Update; `KeyResultValueRequest{value}`; `DashboardResponse`;
  `ReportResponse`). `model_config={"from_attributes": True}`.
- **Service:** `app/services/goal_service.py` — funções puras do motor + CRUD via `text()`,
  `await db.commit()`, `audit_service.log_action`, `cache.cache_delete("goals:{uid}:*")`,
  controle de acesso por `user_id`, soft-delete.
- **Router:** `app/api/v1/goals.py`, registrado em `main.py`
  (`include_router(..., prefix="{PREFIX}/goals")` e `/key-results`). Rotas estáticas
  (`/goals/dashboard`, `/goals/reports`) **antes** de `/goals/{id}`.

### Endpoints
| Método | Rota | Função |
|---|---|---|
| GET | /api/v1/goals | listar (paginado) |
| POST | /api/v1/goals | criar (com KRs aninhados) |
| GET | /api/v1/goals/{id} | detalhe |
| PUT | /api/v1/goals/{id} | editar |
| DELETE | /api/v1/goals/{id} | excluir (soft, cascata KRs) |
| POST | /api/v1/goals/{id}/primary | tornar Meta Principal (exclusivo) |
| GET | /api/v1/goals/dashboard | score, status, tendência, principal, top-3, KPIs |
| GET | /api/v1/goals/reports | concluídas, andamento, taxa, evolução mensal |
| POST | /api/v1/goals/{id}/key-results | adicionar KR |
| PUT | /api/v1/key-results/{id} | editar KR |
| DELETE | /api/v1/key-results/{id} | excluir KR |
| PATCH | /api/v1/key-results/{id}/value | **atualização rápida** (grava check-in) |

## Mobile (app_mobile) — espelha o módulo Tasks
- **Navegação:** `src/app/(tabs)/_layout.tsx` ganha `metas` (🎯) entre `calendar` e `profile`.
- **API:** `src/infrastructure/api/{goal-api.ts, goal-types.ts}` (envelopes `SingleResponse`/`PaginatedResponse`).
- **Hooks:** `src/hooks/api/use-goals.ts` (React Query; keys `['goals']`, `['goals','dashboard']`).
- **Domínio:** `Goal`, `KeyResult`, `KpiType` em `src/domain/entities.ts`.
- **Telas:** `(tabs)/metas.tsx` (dashboard), `create-meta.tsx` (assistido), `goal/[id].tsx` (detalhe/atualizar).
- **Componentes:** `src/components/ui/{ProgressBar,CircularProgress}.tsx` (novos, reutilizáveis);
  `src/components/metas/{ScoreCard,GoalCard,KpiStat,TrendIndicator,CategoryPicker,KpiTypePicker,QuickUpdateSheet}.tsx`.
- **Util:** `src/utils/kpi-format.ts` (formata valor por `kpi_type`).

## Deploy
- Backend: `rsync app/ → VPS:/opt/apps/tiron-api/app/` + `docker compose up -d --build`
  (migração roda no startup; aplicar também no DB local p/ testes). Ver `[[reference_vps_deploy]]`.
- Mobile: **OTA** (`eas update --channel production`) — JS puro sobre nativos já no build.

## Convenções seguidas
Raw SQL com `text()`, soft-delete, auditoria, cache, envelopes, paginação por cursor,
`require_tasks_permission`/`auth.user["id"]`. Cálculo só no backend.
