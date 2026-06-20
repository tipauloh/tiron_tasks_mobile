# Spec — Navegação

**Projeto:** Tiron Tasks Mobile
**Data:** 2026-06-20
**Status:** Implementado (Fase 1)

## Tecnologia

**Expo Router v4** (`expo-router ~56.2.11`) com:
- `"typedRoutes": true` em `app.json` — rotas tipadas em TypeScript.
- `"reactCompiler": true` — otimização de re-renders.
- Deep link scheme: `tirontasks://` (configurado em `app.json` como `scheme: "tirontasks"`).

## Estrutura de Arquivos (File-based Routing)

```
src/app/
├── _layout.tsx              # Root layout
│                            # - QueryClientProvider
│                            # - SQLite init (openDatabase + createTables + seed)
│                            # - ThemeProvider (tema automático)
│                            # - ExpoStatusBar
│
├── (tabs)/                  # Grupo de abas (sem segmento de URL)
│   ├── _layout.tsx          # Tab Navigator
│   │                        # - 3 tabs: index, tasks, search
│   │                        # - Ícones do sistema (expo-symbols)
│   │                        # - Cor de tinta: Colors.primary
│   │
│   ├── index.tsx            # Tab "Início" — dashboard
│   │                        # - Saudação com hora do dia
│   │                        # - Estatísticas (total, concluídas hoje, atrasadas)
│   │                        # - Seção "Tarefas de Hoje"
│   │                        # - Seção "Atrasadas"
│   │                        # - Acesso rápido às listas favoritas
│   │
│   ├── tasks.tsx            # Tab "Tarefas" — listagem principal
│   │                        # - Seletor de lista (ScrollView horizontal)
│   │                        # - Filtros: status, favoritos
│   │                        # - Lista de TaskItem com swipe actions
│   │                        # - FAB para criar nova tarefa
│   │
│   └── search.tsx           # Tab "Busca" — pesquisa global
│                            # - Input de busca com debounce
│                            # - Resultados em tempo real
│                            # - Filtro por lista nos resultados
│
├── task/
│   └── [id].tsx             # Modal de detalhe/edição de tarefa
│                            # - Título editável inline
│                            # - Descrição (textarea)
│                            # - Seletores: lista, prioridade, data, status
│                            # - Subtarefas
│                            # - Botão de deletar
│                            # - Navegação: botão "Fechar" (modal dismiss)
│
└── explore.tsx              # Template padrão do Expo (a substituir)
```

## Tab Navigator

3 abas com ícones do sistema (SF Symbols no iOS, equivalentes Android):

| Tab | Rota | Ícone | Rótulo |
|---|---|---|---|
| Início | `(tabs)/index` | `house` | Início |
| Tarefas | `(tabs)/tasks` | `checklist` | Tarefas |
| Busca | `(tabs)/search` | `magnifyingglass` | Busca |

## Modais

- `task/[id]` — modal de tela cheia (`presentation: 'modal'`) ao tocar em qualquer `TaskItem`.
- Ao criar nova tarefa via FAB: `router.push('/task/new')` — a tela de detalhe trata `id === 'new'` como modo de criação.

## Navegação Programática

```typescript
import { router } from 'expo-router';

// Abrir detalhe de tarefa
router.push(`/task/${task.id}`);

// Criar nova tarefa
router.push('/task/new');

// Fechar modal
router.back();
```

## Deep Links

Schema: `tirontasks://`

| URL | Destino |
|---|---|
| `tirontasks:///` | Tab Início |
| `tirontasks:///tasks` | Tab Tarefas |
| `tirontasks:///task/[id]` | Detalhe de tarefa específica |

## Rotas Tipadas

Com `"typedRoutes": true`, o Expo Router gera tipos automáticos. Uso via `href`:

```typescript
import { Link } from 'expo-router';

// Tipado — erro de compilação se rota não existir
<Link href="/task/123">Ver tarefa</Link>
<Link href="/(tabs)/tasks">Ir para Tarefas</Link>
```

## Root Layout — Inicialização

```typescript
// src/app/_layout.tsx — responsabilidades
// 1. Inicializar banco SQLite (síncrono, antes do primeiro render de tela)
// 2. Configurar QueryClient para TanStack Query
// 3. Exportar SplashScreen.preventAutoHideAsync() até banco pronto
// 4. Exibir tabs com SplashScreen.hideAsync() após init
```

## Evolução Futura (Fase 2)

- Adicionar `modal/create-list.tsx` — modal de criação de lista.
- Adicionar `modal/label-manager.tsx` — gerenciamento de etiquetas.
- Adicionar `(auth)/login.tsx` — tela de login (com API).
- Adicionar `settings/index.tsx` — configurações do usuário.
- Adicionar notificações push via `expo-notifications` (deep link ao tocar na notificação).
