# Memória — Módulo Metas

**O que é:** módulo de acompanhamento de objetivos (OKR/KPI leve), aba 🎯 entre
Calendário e Perfil. Responde "Estou avançando no que realmente importa?" em < 5 s.

**Estrutura:** Objetivo (Goal) → Resultado-Chave (Key Result, que carrega o KPI:
tipo+unidade+alvo) → Check-ins (histórico). KPI **não** é tabela separada (simplicidade).

**Backend (app_api):** tabelas `goals`, `key_results`, `goal_checkins`; `goal_service`
com o motor de cálculo (progresso de KR/objetivo, score do dashboard, tendência); router
`/api/v1/goals` (+ `/key-results`). Migração idempotente no `main.py` (`_MIGRATE_GOALS`).

**Mobile (app_mobile):** tab `(tabs)/metas.tsx` (dashboard: score, meta principal, top-3
objetivos, 4 KPIs, tendência), `create-meta.tsx` (assistido), `goal/[id].tsx` (detalhe +
atualização rápida). API `goal-api`/`goal-types`, hooks `use-goals`. Componentes em
`components/metas/` + `ui/{ProgressBar,CircularProgress}`.

**Ação principal:** atualização rápida de KPI (≤ 3 toques, < 10 s) → recalcula tudo.

**Cálculo:** sempre no backend (fonte única). App só exibe/formata.

**Doc detalhada:** `openspec/Metas/01..06`. Decisões em `Decisoes-Tecnicas-Metas.md`.
