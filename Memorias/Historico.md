# Histórico de Desenvolvimento

## Fase 1 — Foundation (2026-06-20)

- Projeto criado com `create-expo-app@4.0.0 --template default`
- Expo SDK 56.0.12, Router 56.2.11, RN 0.85.3, TypeScript 6.0.3
- Configurado `app.json` com projeto Expo `tiron-tasks` (ID: `c63cddf2-8ce3-4109-99f8-c0f7782f09e7`), bundle ID `br.com.tiron.tasks`, deep link scheme `tirontasks`, New Architecture habilitada, React Compiler experimental habilitado.
- EAS configurado (`eas.json`) com ambientes `development` (dev client, distribuição interna) / `preview` (channel preview) / `production` (channel production, autoIncrement). OTA channels mapeados 1:1 com perfis de build.
- Dependências instaladas: `zustand ^5.0.14`, `@tanstack/react-query ^5.101.0`, `expo-sqlite ^56.0.5`, `expo-secure-store ^56.0.4`, `expo-notifications ^56.0.18`, `expo-updates ^56.0.19`, `react-native-reanimated 4.3.1`, `react-native-worklets 0.8.3`.
- Arquitetura Clean definida em 4 camadas: `domain/` → `infrastructure/` → `store/` → `presentation`.
- Banco local SQLite implementado:
  - `src/infrastructure/database/schema.ts`: DDL completo + seed das 4 listas padrão.
  - `src/infrastructure/database/db.ts`: singleton da conexão.
  - `src/infrastructure/database/task-repository.ts`: `SQLiteTaskRepository` com 9 métodos.
  - `src/infrastructure/database/list-repository.ts`: `SQLiteTaskListRepository` com CRUD completo.
- Domain implementado:
  - `src/domain/entities.ts`: tipos `Task`, `TaskList`, `Label`, `TaskStatus`, `TaskPriority`.
  - `src/domain/repositories.ts`: interfaces `TaskRepository` e `TaskListRepository`.
- Stores Zustand implementados:
  - `src/store/task-store.ts`: `useTaskStore` com `loadAll`, `createTask`, `updateTask`, `deleteTask`, `toggleComplete`, `toggleFavorite`, `createList`.
  - `src/store/filter-store.ts`: `useFilterStore`.
- Design System criado com tokens:
  - `src/constants/colors.ts`: `Colors` (brand, semantic, priority, status, light/dark themes).
  - `src/constants/typography.ts`: `FontFamily`, `FontSize`, `LineHeight`, `FontWeight`.
  - `src/constants/spacing.ts`: `Spacing`, `Radius`.
  - `src/constants/theme.ts`: composição dos tokens por tema.
- Navegação implementada via Expo Router: 3 tabs (Início / Tarefas / Busca) + modal de detalhe de tarefa.
- Estrutura de testes configurada com `jest-expo` preset.
- Documentação criada: `Memorias/`, `openspec/`, `docs/`, `README.md`, `CHANGELOG.md`.
- OTA configurada via `src/lib/updates.ts`.

## Fase 2 — Correções (2026-06-21)

### FIX-001 — Seletor de lista na edição de tarefa
- **Sintoma:** na tela de edição de tarefa (`src/app/task/[id].tsx`) não havia opção de escolher/alterar a lista da tarefa.
- **Causa raiz:** a tela nunca foi conectada ao seletor de lista. O componente `ListSelectorTrigger` (`src/components/tasks/ListSelector.tsx`) já existia mas não era usado em lugar nenhum, e o `handleSave` não enviava `task_list_id`. O suporte na API (`ApiTaskUpdateRequest.task_list_id`) já existia.
- **Correção:**
  - Importado `ListSelectorTrigger` na tela de edição.
  - Novo estado `listId`, inicializado de `task.task_list` no `useEffect` de carga.
  - Seção "Lista" renderizada entre Prioridade e Data de entrega (marca `isDirty` ao alterar).
  - `task_list_id` incluído no payload do `handleSave` (`null` para "Sem lista").
- **Validação:** typecheck limpo no arquivo editado; 131 testes passando.
- **Publicação OTA:** canal `production`, runtime `1.0.0`, update group `387b36b3-d780-4837-9409-175157b01b0b` (android+iOS).

### FIX-002 — Seção "Concluídas" recolhível em todas as listagens
- **Pedido:** em todo o app, separar tarefas concluídas num grupo abaixo das pendentes, com cabeçalho que oculta/mostra as concluídas.
- **Decisões (usuário):** padrão **oculto**; preferência **global e persistida**; aplicar nas **4 telas** (dashboard, tarefas, calendário, busca).
- **Implementação:**
  - `src/utils/group-tasks.ts`: lógica pura `partitionTasks` + `buildTaskRows` + `TaskRow` + `COMPLETED_HEADER_KEY` (testada).
  - `src/components/tasks/CompletedSection.tsx`: `CompletedSectionHeader` (cabeçalho clicável com chevron), reexporta a lógica pura.
  - `src/store/filter-store.ts`: `showCompleted` (default `false`) + `setShowCompleted`/`toggleShowCompleted`, persistido no SecureStore (`partialize`).
  - Telas `(tabs)/index.tsx`, `(tabs)/tasks.tsx`, `(tabs)/calendar.tsx`, `(tabs)/search.tsx`: `FlatList` passa a consumir `rows` (linhas discriminadas task/header). No dashboard, o modo "Concluídas" continua plano.
- **Testes:** `__tests__/utils/group-tasks.test.ts` (8 casos). Total 139 testes.

### FEAT-001m — Adição rápida na aba Tarefas
- **Pedido:** campo aberto na tela de tarefas para criar tarefa só com o nome; respeita a lista ativa (lista selecionada → cria nela; "Todas" → sem lista). Posicionado à esquerda do botão "+" existente.
- **Implementação:** em `(tabs)/tasks.tsx`, barra inferior (`KeyboardAvoidingView`) com `TextInput` à esquerda do FAB; `handleQuickAdd` usa `useCreateTask` com `task_list_id = activeListIntId`. Placeholder reflete a lista ativa.
- **Publicação OTA (FIX-002 + FEAT-001m):** canal `production`, runtime `1.0.0`, update group `3e838724-9b42-4033-bcff-d412b92150d1` (android+iOS).
- **Correção FEAT-001m:** o campo de adição rápida havia sido posto em `(tabs)/tasks.tsx`, que é **rota legada oculta** (`href: null` em `_layout.tsx`). A aba "Tarefas" do tab bar renderiza `(tabs)/index.tsx` (dashboard). O campo foi movido para `index.tsx`. Republicado: update group `93e10ab2-6e79-4354-96af-2d6f5efd97d8`. **Nota:** apenas `index.tsx` (Tarefas), `calendar.tsx` e `profile.tsx` são telas visíveis; `tasks.tsx` e `search.tsx` são legados ocultos.
