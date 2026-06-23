# Metas — 06 · Testes

## Unitários — Motor de cálculo (backend, pytest)
- `kr_progress`:
  - crescente: (0,14,16) → 0.875.
  - decrescente: (90,87.4,85) → ≈0.52.
  - clamp acima: (0,20,16) → 1.0.
  - clamp abaixo: (0,-5,16) → 0.0.
  - `target == start`: (5,5,5) → 1.0; (5,4,5) → 0.0.
- `goal_progress`: média ponderada — ex.: [(0.5, w1), (1.0, w3)] → 0.875; sem KRs → 0.
- `dashboard_score`: média ponderada só dos objetivos **ativos**; nenhum → 0.
- `trend`: Δ>+0.02 up · Δ<-0.02 down · senão stable.
- `status_label`: faixas 0.85 / 0.60 / 0.40.

## Integração (backend)
- Criar meta com KRs aninhados → 201, retorna `progress` calculado.
- Listar / detalhar / editar / **soft-delete** (verifica `deleted_at`).
- `is_primary` **exclusivo**: marcar B desmarca A.
- **Atualização rápida** (`PATCH /key-results/{id}/value`): atualiza `current_value`,
  grava `goal_checkin`, recalcula `kr_progress`/`goal_progress`.
- `GET /goals/dashboard`: retorna score, status, tendência, principal, top-3, KPIs.

> Obs.: a fixture HTTP de auth pode retornar 401 neste ambiente (mesmo sintoma do
> `test_tasks` local). Quando ocorrer, validar também via chamadas diretas ao
> `goal_service` com um usuário temporário (padrão de script de validação já usado no
> projeto), garantindo cobertura do motor + CRUD.

## UX (validação manual / critérios)
- Atualizar um KPI em **≤ 3 toques** (toque no KPI → digita → Salvar).
- Dashboard compreensível em **< 5 s** (score + status + tendência acima da dobra).
- Sem rolagem excessiva de iPhone SE a Plus/Max.
- Navegação intuitiva (dashboard → toque → atualizar/abrir; "+" cria).

## Mobile (jest)
- `kpi-format`: cada `kpi_type` formata corretamente (kg, %, R$, h, unidade custom).
- Hooks `use-goals` compilam e expõem as mutações esperadas.
- Sem regressão na suíte existente (`npm test`).
