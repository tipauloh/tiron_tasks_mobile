# Metas — 01 · Visão Geral

## Objetivo do módulo
Permitir que o usuário acompanhe objetivos pessoais e profissionais com uma abordagem
leve inspirada em **OKR / KPI / Goal Tracking**, sem a complexidade corporativa. A tela
inicial deve responder em **menos de 5 segundos** à pergunta:

> "Estou avançando no que realmente importa?"

## Posição na navegação
Nova aba na barra principal, entre **Calendário** e **Perfil**:

`Tarefas → Calendário → 🎯 Metas → Perfil`

(Implementada como `src/app/(tabs)/metas.tsx`, registrada em `(tabs)/_layout.tsx`.)

## Conceito funcional
```
Objetivo (Goal)
  └─ Resultado-Chave (Key Result) — carrega a métrica (KPI: tipo + unidade + alvo)
       └─ Check-ins (histórico de medições → progresso, tendência, evolução)
```

Exemplo:
- **Objetivo:** Ganhar Massa Magra
- **Resultados-Chave / KPIs:** peso 90→85 kg · treinar 16×/mês · 180 g proteína/dia

## Decisão central de simplicidade
O **KPI não é uma entidade separada** — é a *medida* do Resultado-Chave
(`kpi_type`, `unit`, `start_value`, `current_value`, `target_value`). O exemplo do
próprio briefing trata "atingir 85 kg" (KR) e "peso atual" (KPI) como a **mesma
métrica** — então fundi-los reduz toques e telas. Ver `04-Modelagem.md` e
`Decisoes-Tecnicas-Metas` (Memórias).

## Princípios
Mobile-first · uso com uma mão · simplicidade extrema · clareza visual · velocidade ·
mínimo de toques. Inspiração de UX: Apple Fitness, Things 3, Todoist, Sunsama, Linear.
Evitar dashboards corporativos, excesso de gráficos/métricas/cores/configurações.

## Pilares do Dashboard
1. **Score geral** (média ponderada dos objetivos ativos) + rótulo de status.
2. **Meta Principal** (única; topo; preparada para Home/widgets futuros).
3. **Objetivos prioritários** (até 3).
4. **KPIs em destaque** (até 4).
5. **Tendência** simples: ⬆ Melhorando · ➡ Estável · ⬇ Atenção.

## Ação principal
**Atualização rápida** de um valor (< 10 s, ≤ 3 toques). Todo o resto recalcula
automaticamente no backend (fonte única da verdade).
