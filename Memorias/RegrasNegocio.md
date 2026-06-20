# Regras de Negócio — Tiron Tasks Mobile

**Data:** 2026-06-20

## Tarefas (`Task`)

### Prioridades
| Valor (código) | Rótulo exibido | Cor |
|---|---|---|
| `low` | Baixa | `#6B7280` (cinza) |
| `normal` | Normal | `#3B82F6` (azul) |
| `high` | Alta | `#F59E0B` (âmbar) |
| `critical` | Crítica | `#EF4444` (vermelho) |

- Prioridade padrão ao criar tarefa: `normal`.
- A prioridade não bloqueia transições de status.

### Status
| Valor (código) | Descrição |
|---|---|
| `not_started` | Tarefa criada, ainda não iniciada |
| `in_progress` | Em andamento |
| `completed` | Concluída — `completedAt` é preenchido com timestamp |
| `cancelled` | Cancelada — não aparece nas views de ativas por padrão |

- `toggleComplete` alterna entre `completed` e `not_started` (sem apagar a tarefa).
- Ao marcar `completed`, o campo `completedAt` recebe `new Date().toISOString()`.
- Ao desmarcar `completed`, o campo `completedAt` é limpo (`undefined`).
- Tarefas `cancelled` são excluídas logicamente do fluxo normal mas persistem no banco.

### Subtarefas
- Campo `parentId: string | null` — se preenchido, a tarefa é subtarefa da tarefa pai.
- Não há limite de profundidade na estrutura de dados, mas a UI na fase 1 suporta apenas 1 nível de subtarefa.
- `findAll()` do repositório retorna apenas tarefas raiz (`parent_id IS NULL`) por padrão. Subtarefas são carregadas separadamente via `findSubtasks(parentId)`.

### Listas (`listId`)
- Campo `listId: string | null` — tarefas podem existir sem lista (caixa de entrada).
- Uma tarefa pertence a exatamente uma lista (ou a nenhuma).

### Favoritos
- `isFavorite: boolean` — coluna `is_favorite INTEGER` no SQLite.
- Qualquer tarefa pode ser favoritada independentemente de status ou lista.
- Vista "Favoritos" mostra tarefas com `is_favorite = 1` de qualquer lista.

## Listas de Tarefas (`TaskList`)

### Listas Padrão (seed)
Criadas automaticamente no primeiro uso do app (`SEED_DEFAULT_LISTS_SQL`):

| ID | Nome | Cor | Ícone |
|---|---|---|---|
| `list-pessoal` | Pessoal | `#10B981` | 👤 |
| `list-trabalho` | Trabalho | `#3B82F6` | 💼 |
| `list-compras` | Compras | `#F59E0B` | 🛒 |
| `list-estudos` | Estudos | `#8B5CF6` | 📚 |

- Inseridas com `INSERT OR IGNORE` — seguro reexecutar sem duplicar.
- Usuário pode renomear, mudar cor/ícone ou arquivar as listas padrão.

### Arquivamento
- Campo `archivedAt: string | null` — lista arquivada não aparece na navegação principal mas permanece no banco.
- Tarefas de uma lista arquivada permanecem acessíveis via busca.

### Favoritos em Listas
- `isFavorite: boolean` — listas favoritas aparecem em destaque no menu lateral.

## Banco de Dados Local (Fase 1)

### Tabelas
| Tabela | Descrição |
|---|---|
| `task_lists` | Listas de tarefas |
| `tasks` | Tarefas (com suporte a subtarefas via `parent_id`) |
| `labels` | Etiquetas (tags com nome e cor) |
| `task_labels` | Pivot N:N entre tarefas e etiquetas |

### Integridade referencial
- `tasks.list_id REFERENCES task_lists(id)` — nullable.
- `tasks.parent_id REFERENCES tasks(id)` — nullable (auto-referência).
- `task_labels.task_id ... ON DELETE CASCADE` — ao deletar tarefa, as associações de etiqueta são removidas.

## Offline First

- **Toda ação funciona sem internet** na fase 1 — o banco é local.
- Não há validação de conectividade antes de operações.
- Dados não são perdidos em caso de fechamento abrupto do app (SQLite é transacional).
- Fila de sincronização e resolução de conflitos são responsabilidades da fase 2 (ver `openspec/specs/offline-first.md`).

Ver também: `[[Arquitetura]]`, `[[Decisoes]]`.
