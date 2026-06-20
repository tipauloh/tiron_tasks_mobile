# Arquitetura — Tiron Tasks Mobile

**Data:** 2026-06-20
**Contexto:** Aplicativo mobile de produtividade pessoal construído com Expo SDK 56 / React Native 0.85.3. Arquitetura orientada a offline-first com banco local SQLite, preparada para migração a API REST na fase 2.

## Visão Geral

Clean Architecture com 4 camadas bem definidas. A regra de dependência flui sempre de dentro para fora: domínio não conhece infraestrutura; infraestrutura não conhece stores; stores não conhecem screens.

```
Presentation (src/app/ + src/components/)
        ↓  usa
Application (src/store/ — Zustand)
        ↓  usa
Infrastructure (src/infrastructure/ — SQLite repositories)
        ↓  implementa
Domain (src/domain/ — entidades e interfaces)
```

## Camadas

### Domain (`src/domain/`)
Núcleo da aplicação. Sem dependências externas.

- **`entities.ts`**: tipos TypeScript puros — `Task`, `TaskList`, `Label`, `TaskStatus`, `TaskPriority`.
- **`repositories.ts`**: interfaces `TaskRepository` e `TaskListRepository` — contrato que a infraestrutura deve cumprir.

### Infrastructure (`src/infrastructure/database/`)
Implementações concretas dos repositórios. Só conhece o domínio.

- **`db.ts`**: singleton da conexão `expo-sqlite` (`SQLiteDatabase`). Inicializado uma vez e reutilizado.
- **`schema.ts`**: SQL de criação das tabelas (`task_lists`, `tasks`, `labels`, `task_labels`) e seed das listas padrão.
- **`task-repository.ts`**: `SQLiteTaskRepository implements TaskRepository`. Métodos: `findAll`, `findById`, `findSubtasks`, `findDueToday`, `findOverdue`, `findDueThisWeek`, `create`, `update`, `delete`, `updatePositions`.
- **`list-repository.ts`**: `SQLiteTaskListRepository implements TaskListRepository`. CRUD completo de listas.

### Application (`src/store/`)
Stores Zustand. Conhecem os repositórios (infraestrutura), não as screens.

- **`task-store.ts`**: `useTaskStore` — estado global de tarefas e listas, com ações assíncronas que delegam ao repository e atualizam o estado local.
- **`filter-store.ts`**: `useFilterStore` — estado de filtros ativos (lista selecionada, status, favoritos, termo de busca).

### Presentation (`src/app/` + `src/components/`)
Screens (Expo Router) e componentes visuais. Só conhecem stores e componentes.

- **`src/app/`**: file-based routing do Expo Router. Tab navigator em `(tabs)/`, modais em rotas paralelas.
- **`src/components/`**: componentes reutilizáveis organizados por domínio (`ui/`, `task/`).
- **`src/constants/`**: design tokens — `colors.ts`, `typography.ts`, `spacing.ts`, `theme.ts`.
- **`src/hooks/`**: custom hooks que compõem stores + lógica de UI.
- **`src/utils/`**: funções puras utilitárias (`id.ts`, `date.ts`).

## Navegação (Expo Router)

File-based routing com Expo Router v4 (`expo-router ~56.2.11`):

```
src/app/
├── _layout.tsx          # Root layout (QueryClientProvider, SQLite init)
├── (tabs)/
│   ├── _layout.tsx      # Tab navigator (Início / Tarefas / Busca)
│   ├── index.tsx        # Tab Início — dashboard
│   ├── tasks.tsx        # Tab Tarefas — listagem com filtros
│   └── search.tsx       # Tab Busca — busca global
├── task/
│   └── [id].tsx         # Modal de detalhe/edição de tarefa
└── explore.tsx          # (template — a ser substituído)
```

Rotas tipadas habilitadas via `"typedRoutes": true` em `app.json`.

## Estado Global (Zustand)

Padrão `create<State>((set, get) => ({...}))`. Stores são módulos singleton instanciados fora do ciclo de render do React.

- Os repositórios SQLite são instanciados **uma vez** no módulo da store, não dentro dos hooks de React.
- Ações são assíncronas e atualizam o estado local otimisticamente após confirmação do SQLite.

## Cache / Fetching (TanStack Query)

`@tanstack/react-query ^5.101.0` instalado e `QueryClientProvider` configurado no root layout. Na fase 1 não é usado ativamente (SQLite é síncrono/direto). Na fase 2, quando a API REST for criada, os repositórios serão trocados e as queries TanStack Query assumirão o fetching/cache/invalidação.

## Banco Local (expo-sqlite)

`expo-sqlite ^56.0.5` — nativo, performático, suportado no Expo Managed Workflow. Conexão aberta com `openDatabaseSync('tiron_tasks.db')`. Operações síncronas (`runSync`, `getAllSync`, `getFirstSync`) usadas dentro de métodos `async` dos repositórios para simplificar a interface sem callbacks.

Tabelas: `task_lists`, `tasks`, `labels`, `task_labels`.

## Regra de Dependência (resumo)

```
Domain ← Infrastructure ← Store ← Hooks/Components ← Screens
```

Nenhuma camada importa de uma camada mais externa. Domínio nunca importa de `store/` ou `infrastructure/`. Infraestrutura nunca importa de `store/`.

Ver também: `[[Decisoes]]`, `[[Padroes]]`, `[[RegrasNegocio]]`.
