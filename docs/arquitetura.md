# Arquitetura — Tiron Tasks Mobile

**Data:** 2026-06-20

## Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION                             │
│                                                                 │
│   src/app/           src/components/       src/hooks/           │
│   (Expo Router)      (UI Components)       (Custom Hooks)       │
│                                                                 │
│   ├── _layout.tsx    ├── ui/               ├── useThemeColors   │
│   ├── (tabs)/        │   ├── Text          └── useTaskFilters   │
│   │   ├── index      │   ├── Button                             │
│   │   ├── tasks      │   ├── Card                               │
│   │   └── search     │   ├── Badge                              │
│   └── task/[id]      │   ├── Input                              │
│                      │   └── Checkbox                           │
│                      └── task/                                  │
│                          ├── TaskItem                            │
│                          ├── PriorityBadge                      │
│                          └── DueDateLabel                       │
└──────────────────────────────┬──────────────────────────────────┘
                               │ usa stores
┌──────────────────────────────▼──────────────────────────────────┐
│                        APPLICATION                              │
│                                                                 │
│   src/store/                                                    │
│                                                                 │
│   ├── useTaskStore    (tarefas, listas, ações CRUD)             │
│   └── useFilterStore  (lista ativa, status, busca, favoritos)   │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │ usa repositórios
┌──────────────────────────────▼──────────────────────────────────┐
│                      INFRASTRUCTURE                             │
│                                                                 │
│   src/infrastructure/database/                                  │
│                                                                 │
│   ├── db.ts                  (conexão singleton expo-sqlite)    │
│   ├── schema.ts              (DDL + seed de listas padrão)      │
│   ├── task-repository.ts     (SQLiteTaskRepository)             │
│   └── list-repository.ts     (SQLiteTaskListRepository)         │
│                                                                 │
└──────────────────────────────┬──────────────────────────────────┘
                               │ implementa interfaces de
┌──────────────────────────────▼──────────────────────────────────┐
│                           DOMAIN                                │
│                                                                 │
│   src/domain/                                                   │
│                                                                 │
│   ├── entities.ts      (Task, TaskList, Label, tipos)           │
│   └── repositories.ts  (TaskRepository, TaskListRepository)     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Fluxo de Dados

### Leitura (ex: carregar lista de tarefas)

```
Tab "Tarefas" (screen)
  └─► useTaskStore().loadAll()          (Application)
        └─► SQLiteTaskRepository.findAll()  (Infrastructure)
              └─► db.getAllSync(SQL)          (expo-sqlite)
                    └─► rows → mapRow() → Task[]
                          └─► set({ tasks })
                                └─► re-render da tela
```

### Escrita (ex: marcar tarefa como concluída)

```
TaskItem → onToggle()
  └─► useTaskStore().toggleComplete(id)           (Application)
        ├─► Calcula novo status ('completed')
        └─► SQLiteTaskRepository.update(id, data) (Infrastructure)
              └─► db.runSync(UPDATE SQL)
                    └─► set({ tasks: [...atualizado] })
                          └─► re-render otimista
```

## Navegação (Expo Router)

```
Stack Root (_layout.tsx)
  └─► Tab Navigator ((tabs)/_layout.tsx)
        ├─► Tab Início     → (tabs)/index.tsx
        ├─► Tab Tarefas    → (tabs)/tasks.tsx
        └─► Tab Busca      → (tabs)/search.tsx

  Modal (apresentado sobre os tabs)
        └─► task/[id].tsx
```

## Banco de Dados (SQLite)

```
tiron_tasks.db
  ├─ task_lists   (id, name, color, icon, is_favorite, position, archived_at, ...)
  ├─ tasks        (id, title, status, priority, due_date, list_id, parent_id, ...)
  ├─ labels       (id, name, color)
  └─ task_labels  (task_id FK, label_id FK) — pivot N:N
```

## Extensibilidade para API (Fase 2)

```
Troca de implementação no store — sem mudança na UI:

Fase 1: taskRepo = new SQLiteTaskRepository()    ←─ atual
Fase 2: taskRepo = new ApiTaskRepository()       ←─ futura

Mesma interface TaskRepository.
TanStack Query absorve cache/fetching dentro do ApiTaskRepository.
```
