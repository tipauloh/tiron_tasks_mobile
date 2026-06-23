# Metas — 04 · Modelagem & Motor de Cálculo

## Entidades conceituais x tabelas
| Conceito (briefing) | Implementação |
|---|---|
| Goal | tabela `goals` |
| KeyResult | tabela `key_results` |
| KPI | **atributos** do `key_results` (`kpi_type`, `unit`, `start/current/target`) — sem tabela |
| GoalProgress | tabela `goal_checkins` (cada medição) |
| GoalHistory | derivado de `goal_checkins` (`goal_progress` ao longo do tempo) |

## Tabelas (Postgres, migração idempotente no `main.py`)
```sql
goals(
  id BIGSERIAL PK, user_id BIGINT NOT NULL,
  title VARCHAR(255), category VARCHAR(50),
  status VARCHAR(50) DEFAULT 'active',   -- active | completed | archived
  end_date DATE, is_primary BOOLEAN DEFAULT false,
  weight DOUBLE PRECISION DEFAULT 1, position INT DEFAULT 0,
  created_at, updated_at, deleted_at)
key_results(
  id BIGSERIAL PK, goal_id BIGINT NOT NULL, user_id BIGINT NOT NULL,
  title VARCHAR(255),
  kpi_type VARCHAR(30) DEFAULT 'number', -- number|percent|currency|quantity|time|weight|custom
  unit VARCHAR(50),
  start_value DOUBLE PRECISION DEFAULT 0,
  current_value DOUBLE PRECISION DEFAULT 0,
  target_value DOUBLE PRECISION DEFAULT 0,
  weight DOUBLE PRECISION DEFAULT 1, is_highlight BOOLEAN DEFAULT false,
  position INT DEFAULT 0, created_at, updated_at, deleted_at)
goal_checkins(
  id BIGSERIAL PK, key_result_id BIGINT, goal_id BIGINT, user_id BIGINT,
  value DOUBLE PRECISION, kr_progress DOUBLE PRECISION, goal_progress DOUBLE PRECISION,
  recorded_at, created_at)
```
Relacionamentos: `goals 1—N key_results 1—N goal_checkins`. Acesso sempre por `user_id`.
Soft-delete (`deleted_at IS NULL`). Índices: `goals(user_id)`, `goals(deleted_at)`,
`key_results(goal_id)`, `goal_checkins(goal_id)`, `goal_checkins(key_result_id)`.

## Motor de cálculo (fonte única no backend — `goal_service`)

### Progresso de um Resultado-Chave
```
kr_progress(start, current, target):
  if target == start:  return 1.0 if current == target else 0.0
  p = (current - start) / (target - start)
  return clamp(p, 0, 1)
```
Funciona para metas **crescentes** e **decrescentes**:
- Peso 90→85, atual 87.4 → (87.4-90)/(85-90) = 0.52 → **52%**.
- Treinos 0→16, atual 14 → 14/16 = **87.5%**.
- Limita a 100% (sem ultrapassar) e a 0% (sem negativo).

### Progresso de um Objetivo (média ponderada dos KRs)
```
goal_progress = Σ(kr_progress_i · weight_i) / Σ(weight_i)   (0 se sem KRs ou Σpeso=0)
```

### Score do Dashboard (média ponderada dos objetivos ATIVOS)
```
score = Σ(goal_progress_j · weight_j) / Σ(weight_j)   sobre status='active'  (0 se nenhum)
```

### Tendência
Compara o progresso atual com o `goal_checkin` mais antigo dos **últimos 7 dias**:
`Δ > +0.02 → up (⬆ Melhorando)` · `Δ < -0.02 → down (⬇ Atenção)` · senão `stable (➡)`.

### Rótulo de status do score
`≥0.85 "No caminho certo"` · `≥0.60 "Avançando"` · `≥0.40 "Atenção"` · `else "Precisa de foco"`.

### Meta Principal (exclusiva)
Ao marcar `is_primary=true` num objetivo, zera `is_primary` nos demais do usuário.

## Histórico, versionamento e sincronização
- **Histórico:** cada atualização de valor cria um `goal_checkin` (imutável) com o valor,
  o `kr_progress` e o `goal_progress` no momento → base de tendência e evolução mensal.
- **Versionamento:** auditoria via `audit_service` (`goal.created/updated/deleted/kr_updated`).
- **Sincronização:** server é a fonte da verdade; app via React Query (invalida em mutações).
