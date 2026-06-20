# Padrões Adotados — Tiron Tasks Mobile

**Data:** 2026-06-20

## Nomenclatura de Arquivos

- **Arquivos de componente**: `kebab-case.tsx` — ex.: `task-item.tsx`, `priority-badge.tsx`, `due-date-label.tsx`.
- **Arquivos de store**: `kebab-case.ts` — ex.: `task-store.ts`, `filter-store.ts`.
- **Arquivos de repositório**: `kebab-case.ts` — ex.: `task-repository.ts`, `list-repository.ts`.
- **Arquivos de constantes/design token**: `kebab-case.ts` — ex.: `colors.ts`, `typography.ts`, `spacing.ts`.
- **Arquivos de tela (Expo Router)**: `kebab-case.tsx` ou nome da rota — ex.: `index.tsx`, `tasks.tsx`, `[id].tsx`.
- **Diretórios de rota**: `(group)` para grupos sem segmento de URL — ex.: `(tabs)/`.

## Nomenclatura de Código

- **Componentes React**: `PascalCase`, named exports — ex.: `export function TaskItem(...)`.
- **Hooks customizados**: prefixo `use` em camelCase — ex.: `useTaskFilters`, `useDateFormat`.
- **Stores Zustand**: variável exportada `use[Nome]Store` — ex.: `useTaskStore`, `useFilterStore`.
- **Interfaces/Types**: `PascalCase` — ex.: `Task`, `TaskList`, `TaskRepository`.
- **Constantes de design**: objetos `PascalCase` exportados — ex.: `Colors`, `FontSize`, `Spacing`.
- **Funções utilitárias**: `camelCase` — ex.: `generateId`, `nowISO`, `todayDate`.

## Estrutura de Componentes

```typescript
// task-item.tsx — exemplo canônico
import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
}

export function TaskItem({ task, onPress }: TaskItemProps) {
  return (
    <View style={styles.container}>
      {/* ... */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing[4],
    backgroundColor: Colors.light.surface,
  },
});
```

Regras:
- **Nunca inline styles** (`style={{ padding: 16 }}`). Sempre `StyleSheet.create`.
- Props tipadas em interface local no topo do arquivo.
- Named exports (não default exports para componentes).

## Ordem de Imports

1. Bibliotecas nativas React/React Native (`react`, `react-native`)
2. Bibliotecas Expo (`expo-router`, `expo-sqlite`, etc.)
3. Bibliotecas de terceiros (`zustand`, `@tanstack/react-query`)
4. Domain (`@/domain/entities`, `@/domain/repositories`)
5. Infrastructure (`@/infrastructure/database/...`)
6. Stores (`@/store/task-store`)
7. Hooks (`@/hooks/...`)
8. Components (`@/components/...`)
9. Constants (`@/constants/colors`, `@/constants/spacing`)
10. Utils (`@/utils/id`, `@/utils/date`)

## Padrão de Stores Zustand

```typescript
// store/example-store.ts
import { create } from 'zustand';

interface ExampleState {
  items: Item[];
  isLoading: boolean;
  error: string | null;
  // Ações
  loadItems: () => Promise<void>;
  addItem: (data: Omit<Item, 'id'>) => Promise<Item>;
}

export const useExampleStore = create<ExampleState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const items = await repository.findAll();
      set({ items, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  addItem: async (data) => {
    const item = await repository.create(data);
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },
}));
```

- Repositórios instanciados **fora** do `create` (nível de módulo), não dentro dos closures.
- `isLoading` e `error` em todo store que faz operações assíncronas.
- Ações de mutação atualizam o estado local após confirmação do repositório.

## Padrão de Repositórios

```typescript
// domain/repositories.ts — interface
export interface ExampleRepository {
  findAll(): Promise<Item[]>;
  create(data: Omit<Item, 'id'>): Promise<Item>;
  update(id: string, data: Partial<Item>): Promise<Item>;
  delete(id: string): Promise<void>;
}

// infrastructure/database/example-repository.ts — implementação
export class SQLiteExampleRepository implements ExampleRepository {
  private get db() { return getDatabase(); }

  async findAll(): Promise<Item[]> {
    const rows = this.db.getAllSync<ItemRow>('SELECT * FROM items ORDER BY position ASC', []);
    return rows.map((r) => this.mapRow(r));
  }
  // ...
}
```

- `mapRow()` privado que converte snake_case do SQLite para camelCase da entidade.
- FKs nullable no banco mapeadas para `undefined` (não `null`) na entidade TypeScript.
- Booleanos SQLite (`INTEGER 0/1`) convertidos com `Boolean(row.is_flag)`.

## Padrão de Design Tokens

```typescript
// Uso nos componentes — sempre via constantes, nunca valores literais
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';

const styles = StyleSheet.create({
  text: {
    color: Colors.light.text,
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    padding: Spacing[4],
  },
});
```

## Commits

Formato: `tipo(escopo): descrição`

| Tipo | Uso |
|---|---|
| `feat` | Nova funcionalidade |
| `fix` | Correção de bug |
| `refactor` | Refatoração sem mudança de comportamento |
| `docs` | Documentação |
| `style` | Formatação, lint (sem mudança de lógica) |
| `test` | Testes |
| `chore` | Manutenção (deps, configs) |

Escopo: `mobile` para mudanças neste projeto.

Exemplos:
- `feat(mobile): adicionar filtro por prioridade na listagem`
- `fix(mobile): corrigir crash ao abrir tarefa sem lista`
- `docs(mobile): atualizar Memorias/Arquitetura.md`

Ver também: `[[Arquitetura]]`, `[[Decisoes]]`.
