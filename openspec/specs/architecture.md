# Spec Técnica — Arquitetura

**Projeto:** Tiron Tasks Mobile
**Data:** 2026-06-20
**Status:** Implementado (Fase 1)

## Objetivo

Definir a arquitetura técnica do aplicativo mobile de forma que seja extensível (migração para API na fase 2), testável (camadas desacopladas) e consistente (convenções claras para novos desenvolvedores).

## Decisão Arquitetural

**Clean Architecture adaptada para React Native/Expo**, com 4 camadas:

```
┌─────────────────────────────────────────────┐
│  Presentation                               │
│  src/app/ (Expo Router screens)             │
│  src/components/ (UI components)            │
│  src/hooks/ (custom hooks)                  │
├─────────────────────────────────────────────┤
│  Application                                │
│  src/store/ (Zustand stores)                │
├─────────────────────────────────────────────┤
│  Infrastructure                             │
│  src/infrastructure/database/ (SQLite)      │
├─────────────────────────────────────────────┤
│  Domain                                     │
│  src/domain/entities.ts                     │
│  src/domain/repositories.ts (interfaces)    │
└─────────────────────────────────────────────┘
```

## Regra de Dependência

As dependências fluem de fora para dentro — camadas externas conhecem camadas internas, nunca o contrário:

- **Presentation** pode importar de Application, Domain.
- **Application (stores)** pode importar de Infrastructure, Domain.
- **Infrastructure** pode importar de Domain.
- **Domain** não importa de nenhuma outra camada.

## Camada Domain

**Responsabilidade:** Definir o quê o sistema manipula, sem saber como.

### Entidades (`src/domain/entities.ts`)

```typescript
// Tipos puros — sem dependência de biblioteca externa
type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';
type TaskPriority = 'low' | 'normal' | 'high' | 'critical';

interface Task { id, title, description?, status, priority, dueDate?,
                 listId?, parentId?, isFavorite, position, completedAt?,
                 createdAt, updatedAt }

interface TaskList { id, name, color, icon?, isFavorite, position,
                    archivedAt?, createdAt, updatedAt }

interface Label { id, name, color }
```

### Interfaces de Repositório (`src/domain/repositories.ts`)

```typescript
interface TaskRepository {
  findAll(options?): Promise<Task[]>;
  findById(id): Promise<Task | null>;
  findSubtasks(parentId): Promise<Task[]>;
  findDueToday(): Promise<Task[]>;
  findOverdue(): Promise<Task[]>;
  findDueThisWeek(): Promise<Task[]>;
  create(data): Promise<Task>;
  update(id, data): Promise<Task>;
  delete(id): Promise<void>;
  updatePositions(updates): Promise<void>;
}

interface TaskListRepository {
  findAll(): Promise<TaskList[]>;
  findById(id): Promise<TaskList | null>;
  create(data): Promise<TaskList>;
  update(id, data): Promise<TaskList>;
  archive(id): Promise<void>;
  delete(id): Promise<void>;
}
```

## Camada Infrastructure

**Responsabilidade:** Implementar as interfaces do domínio usando tecnologia concreta (SQLite na fase 1).

### Arquivos
- `src/infrastructure/database/db.ts` — singleton da conexão expo-sqlite.
- `src/infrastructure/database/schema.ts` — DDL das tabelas + seed das listas padrão.
- `src/infrastructure/database/task-repository.ts` — `SQLiteTaskRepository implements TaskRepository`.
- `src/infrastructure/database/list-repository.ts` — `SQLiteTaskListRepository implements TaskListRepository`.

### Convenção de Mapeamento

Banco SQLite usa `snake_case`. Entidades TypeScript usam `camelCase`.

| Banco (snake_case) | TypeScript (camelCase) |
|---|---|
| `is_favorite INTEGER` | `isFavorite: boolean` |
| `due_date TEXT` | `dueDate?: string` |
| `created_at TEXT` | `createdAt: string` |
| `list_id TEXT` | `listId?: string` |

Nullable SQLite → `undefined` TypeScript (nunca `null`).

## Camada Application

**Responsabilidade:** Orquestrar casos de uso combinando repositórios e estado global.

### Stores Zustand (`src/store/`)

Cada store encapsula um domínio funcional:

- `useTaskStore`: tarefas e listas (estado + ações CRUD).
- `useFilterStore`: filtros ativos (lista selecionada, status, favoritos, busca).

Repositórios são instanciados **uma vez** no nível de módulo (fora do `create`).

## Camada Presentation

**Responsabilidade:** Renderizar UI e capturar interações do usuário.

### Estrutura de Screens (Expo Router)

File-based routing: cada arquivo em `src/app/` corresponde a uma rota.

```
src/app/
├── _layout.tsx          # Root: providers globais (QueryClient, SQLite init)
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator
│   ├── index.tsx        # Início (dashboard)
│   ├── tasks.tsx        # Tarefas (lista + filtros)
│   └── search.tsx       # Busca global
└── task/[id].tsx        # Modal: detalhe/edição de tarefa
```

### Componentes (`src/components/`)

Organizados por domínio:
- `ui/` — componentes genéricos (Button, Text, Card, Badge, Input, Checkbox).
- `task/` — componentes específicos de tarefa (TaskItem, PriorityBadge, DueDateLabel).

## Inicialização

Sequência ao abrir o app:

1. Root layout (`_layout.tsx`) renderiza.
2. `QueryClientProvider` wrapa a árvore.
3. Banco SQLite é inicializado (`openDatabaseSync` + `CREATE TABLE IF NOT EXISTS` + seed).
4. `useTaskStore().loadAll()` carrega tarefas e listas do SQLite.
5. Tabs renderizam com dados.

## Extensibilidade (Fase 2)

Para migrar para API:

1. Criar `ApiTaskRepository implements TaskRepository` em `src/infrastructure/api/`.
2. Trocar a instância do repositório na store (`task-store.ts`).
3. Usar TanStack Query dentro do repositório de API para cache/invalidação.
4. Nenhuma mudança em `src/domain/`, `src/app/`, `src/components/`.
