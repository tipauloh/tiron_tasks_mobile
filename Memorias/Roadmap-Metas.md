# Memória — Roadmap Metas

## v1 (entregue)
- Dashboard (score, meta principal, top-3 objetivos, 4 KPIs, tendência).
- Criar meta assistida (categoria → nome → prazo → KRs → KPI tipo+alvo).
- Atualização rápida de KPI (check-in + recálculo).
- Detalhe do objetivo (editar/atualizar KRs, tornar Meta Principal).
- Relatórios simples (concluídas, andamento, taxa, evolução mensal).
- Motor de cálculo no backend + testes.

## v2 — Integração com Tarefas
- KR vinculado a tarefas: ex. "Treinar 16×" ↑ a cada tarefa "Treino" concluída.
- Estrutura já preparada (`goal_checkins` aceita origem). Quando uma tarefa marcada
  concluir, gerar um check-in no KR vinculado.

## v3 — Notificações ativas
- Lembrete de check-in (semanal), prazo próximo, meta concluída.
- Reusa `lib/notifications.ts` (DAILY/WEEKLY/MONTHLY + recorrência).

## v4 — Home / Widgets
- Meta Principal na Home e em widgets do sistema (iOS/Android).

## v5 — Insights
- Sugestões leves ("KR X parado há 2 semanas"), sem dashboards corporativos.

## Débitos técnicos / observações
- Paginação do dashboard não necessária (poucos objetivos por usuário).
- `goal_history` derivado de `goal_checkins` (sem tabela extra) — reavaliar se a
  evolução mensal exigir agregações pesadas.
