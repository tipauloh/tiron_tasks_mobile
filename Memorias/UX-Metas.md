# Memória — UX Metas

**Norte:** entender o status em < 5 s; atualizar um KPI em ≤ 3 toques / < 10 s.
Inspiração: Apple Fitness, Things 3, Todoist, Sunsama, Linear.

## Dashboard (acima da dobra, sem rolagem excessiva)
1. **ScoreCard** — anel circular grande + % + rótulo (No caminho certo / Avançando /
   Atenção / Precisa de foco) + **Tendência** (⬆ Melhorando · ➡ Estável · ⬇ Atenção).
2. **Meta Principal** — card destacado (nome, %, barra, prazo).
3. **Objetivos prioritários** — até 3 (nome, %, ProgressBar, dias restantes).
4. **KPIs em destaque** — até 4 (rótulo + valor formatado pelo tipo).
5. **+** cria meta (FAB/header).

## Cores de progresso
`≥70%` success · `≥40%` warning · `<40%` danger. Marca = primary (#208AEF).

## Atualização rápida
Toque no KPI → **QuickUpdateSheet** (BottomSheet) com valor atual preenchido +
teclado numérico em foco → Salvar. Recalcula tudo.

## Criar meta (assistido, leve)
Categoria (chips) → Nome → Prazo → Resultados-Chave (1–5; tipo de KPI + alvo) → salvar.

## Regras de ouro
Mínimo de texto; alvos grandes (uma mão); sem gráficos pesados; sem excesso de cores ou
configurações; feedback imediato; foco em progresso.
