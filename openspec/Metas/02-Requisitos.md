# Metas — 02 · Requisitos

## Funcionais

### Dashboard (tela inicial)
- RF-01 Exibir **Score geral** = média ponderada do progresso dos objetivos **ativos**.
- RF-02 Exibir rótulo de status do score (No caminho certo / Avançando / Atenção / Precisa de foco).
- RF-03 Exibir **Tendência** (⬆ / ➡ / ⬇).
- RF-04 Exibir **Meta Principal** (nome, progresso, prazo, %), se houver.
- RF-05 Exibir até **3 objetivos prioritários** (nome, %, barra, prazo).
- RF-06 Exibir até **4 KPIs em destaque** (rótulo + valor formatado pelo tipo).
- RF-07 Estado vazio com CTA "Criar meta".
- RF-08 Pull-to-refresh.

### Criação de meta (fluxo assistido)
- RF-10 Passo 1 — Categoria: Saúde, Trabalho, Estudos, Finanças, Família, Pessoal, Outro.
- RF-11 Passo 2 — Nome.
- RF-12 Passo 3 — Prazo (data).
- RF-13 Passo 4 — Resultados-Chave: **1 a 5**.
- RF-14 Passo 5 — KPI por KR: tipo (Número, Percentual, Monetário, Quantidade, Tempo, Peso, Personalizado), unidade (custom), valor inicial, alvo, peso.

### Atualização / progresso
- RF-20 **Atualização rápida**: digitar valor atual de um KR e salvar (≤ 3 toques, < 10 s).
- RF-21 Cada atualização grava um **check-in** (histórico) e recalcula KR/Objetivo/Score.
- RF-22 Editar KR (título, alvo, peso, destaque) e excluir.
- RF-23 Editar/excluir objetivo (soft-delete em cascata dos KRs).

### Meta Principal (Modo Foco)
- RF-30 Apenas **uma** meta pode ser principal por usuário (exclusiva).
- RF-31 Marcar/desmarcar como principal a partir do detalhe.

### Relatórios
- RF-40 Tela simples: metas concluídas, em andamento, taxa de sucesso, evolução mensal.

## Não-funcionais
- RNF-01 Mobile-first; uso com uma mão; alvos de toque ≥ 44pt.
- RNF-02 Dashboard compreensível em **< 5 s**; atualização de KPI em **< 10 s** / **≤ 3 toques**.
- RNF-03 Funciona de iPhone SE a Plus/Max e Android compacto/grande, **sem rolagem excessiva**.
- RNF-04 Seguir design system, navegação, padrões de API e persistência existentes.
- RNF-05 Cálculo no **backend** (consistência/testabilidade); app só exibe.
- RNF-06 Soft-delete, auditoria, cache e envelopes de resposta como nos demais módulos.

## Fora de escopo (v1)
- Integração automática KR↔Tarefas (estrutura preparada — ver Roadmap).
- Notificações ativas (infra preparada; ativação em fase 2).
- Gráficos avançados / relatórios corporativos.
