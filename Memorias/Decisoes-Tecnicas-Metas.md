# Memória — Decisões Técnicas Metas

## DT-01 · KPI fundido no Resultado-Chave (sem tabela KPI)
**Decisão:** o KPI é a *medida* do `key_results` (`kpi_type`, `unit`,
`start/current/target`), não uma tabela separada.
**Por quê:** o próprio briefing trata KR ("atingir 85 kg") e KPI ("peso atual") como a
mesma métrica; separar criaria 4 níveis e mais toques, contra o princípio de
**simplicidade extrema**. Reduz telas e mantém a atualização em ≤ 3 toques.
**Trade-off:** um KR = uma métrica. Se um dia precisar de múltiplos KPIs por KR, adicionar
tabela `kpis` filha (estrutura permite).

## DT-02 · Cálculo no backend (fonte única)
Progresso/score/tendência calculados em `goal_service` (funções puras, testadas). O app só
exibe/formata. Garante consistência entre dashboard, detalhe e relatórios; evita lógica
divergente no cliente.

## DT-03 · Fórmula com `start_value` (metas crescentes e decrescentes)
`kr_progress = (current - start)/(target - start)` com clamp [0,1]. Cobre peso 90→85
(decrescente) e treinos 0→16 (crescente) com a mesma fórmula; `target==start` tratado.

## DT-04 · Histórico em `goal_checkins` (GoalProgress + GoalHistory)
Cada atualização grava valor + `kr_progress` + `goal_progress` no momento. Tendência e
evolução mensal derivam daí — sem tabela `goal_history` separada.

## DT-05 · Migração idempotente no `main.py`
Tabelas criadas no `lifespan` via `_CREATE_GOAL_TABLES` (`CREATE TABLE IF NOT EXISTS`),
mesmo padrão de `_CREATE_SHARING_TABLES`. Sem Alembic (convenção do projeto). Produção
"self-heal" no próximo restart; DB local recebe o mesmo SQL para os testes.

## DT-06 · Meta Principal exclusiva
`is_primary` único por usuário: ao marcar um objetivo, zera os demais (UPDATE). Preparado
para Home/widgets.

## DT-07 · Reuso do design system + nova primitiva
`ProgressBar` e `CircularProgress` adicionados a `components/ui` (reutilizáveis fora de
Metas). Demais telas reusam `Card`/`Button`/`Text`/`BottomSheet`/`Badge`/`EmptyState` e
`CalendarPicker`.

## DT-08 · Entrega
Backend via rsync+rebuild no VPS (migração no startup). Mobile via **OTA** (JS puro).
