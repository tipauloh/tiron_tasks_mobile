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
