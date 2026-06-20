# Spec — Design System

**Projeto:** Tiron Tasks Mobile
**Data:** 2026-06-20
**Status:** Tokens implementados. Componentes base implementados.

## Princípios

1. **Consistência:** Toda cor, espaçamento e tipografia vem dos tokens. Nunca valores literais em StyleSheet.
2. **Tema automático:** Light/Dark mode segue o sistema operacional (`userInterfaceStyle: "automatic"`).
3. **Acessibilidade:** Contraste mínimo WCAG AA entre texto e fundo.
4. **Performance:** `StyleSheet.create` para todos os estilos — otimização nativa do React Native.

## Tokens

### Cores (`src/constants/colors.ts`)

#### Brand
| Token | Valor | Uso |
|---|---|---|
| `Colors.primary` | `#208AEF` | CTA principal, botões primários, links |
| `Colors.primaryDark` | `#1A70C5` | Estado pressionado/hover |
| `Colors.primaryLight` | `#E8F4FF` | Background de destaque sutil |

#### Semânticas
| Token | Valor | Uso |
|---|---|---|
| `Colors.success` | `#10B981` | Tarefas concluídas, confirmações |
| `Colors.warning` | `#F59E0B` | Alertas, prioridade alta |
| `Colors.danger` | `#EF4444` | Erros, prioridade crítica, exclusão |
| `Colors.info` | `#3B82F6` | Informações, prioridade normal |

#### Prioridades (tarefas)
| Token | Prioridade | Cor |
|---|---|---|
| `Colors.priorityLow` | Baixa | `#6B7280` |
| `Colors.priorityNormal` | Normal | `#3B82F6` |
| `Colors.priorityHigh` | Alta | `#F59E0B` |
| `Colors.priorityCritical` | Crítica | `#EF4444` |

#### Status (tarefas)
| Token | Status | Cor |
|---|---|---|
| `Colors.statusNotStarted` | Não iniciada | `#9CA3AF` |
| `Colors.statusInProgress` | Em andamento | `#3B82F6` |
| `Colors.statusCompleted` | Concluída | `#10B981` |
| `Colors.statusCancelled` | Cancelada | `#6B7280` |

#### Temas (Light / Dark)
Acessados via `Colors.light.*` ou `Colors.dark.*`:

| Token | Light | Dark |
|---|---|---|
| `background` | `#FFFFFF` | `#0F172A` |
| `surface` | `#F9FAFB` | `#1E293B` |
| `surfaceElevated` | `#FFFFFF` | `#334155` |
| `border` | `#E5E7EB` | `#334155` |
| `text` | `#111827` | `#F1F5F9` |
| `textSecondary` | `#6B7280` | `#94A3B8` |
| `textTertiary` | `#9CA3AF` | `#64748B` |

### Tipografia (`src/constants/typography.ts`)

| Token | Valor | Uso típico |
|---|---|---|
| `FontSize.xs` | 11px | Metadados, labels secundários |
| `FontSize.sm` | 13px | Texto secundário, descrições |
| `FontSize.base` | 15px | Corpo de texto padrão |
| `FontSize.md` | 17px | Títulos de card, subtítulos |
| `FontSize.lg` | 20px | Títulos de seção |
| `FontSize.xl` | 24px | Títulos de tela |
| `FontSize['2xl']` | 28px | Números destacados (dashboard) |
| `FontSize['3xl']` | 34px | Display/hero |

| Token | Valor |
|---|---|
| `FontWeight.regular` | `'400'` |
| `FontWeight.medium` | `'500'` |
| `FontWeight.semibold` | `'600'` |
| `FontWeight.bold` | `'700'` |

Famílias: System (iOS) / Roboto (Android) via `FontFamily.*`.

### Espaçamento (`src/constants/spacing.ts`)

Escala de 4px (`Spacing[1] = 4px`, `Spacing[2] = 8px`, `Spacing[4] = 16px`, etc.).

| Token | px | Uso típico |
|---|---|---|
| `Spacing[1]` | 4 | Gap mínimo |
| `Spacing[2]` | 8 | Padding interno de chip/badge |
| `Spacing[3]` | 12 | Padding de texto compacto |
| `Spacing[4]` | 16 | Padding padrão de card/tela |
| `Spacing[6]` | 24 | Espaço entre seções |
| `Spacing[8]` | 32 | Padding de tela |

Border radius via `Radius.*`:
- `Radius.sm` = 6px, `Radius.md` = 10px, `Radius.lg` = 14px, `Radius.full` = 9999px.

## Componentes

### Base (`src/components/ui/`)

| Componente | Descrição |
|---|---|
| `Text` | Texto tipado com variantes (body, label, heading, caption) e suporte a tema |
| `Button` | Botão com variantes (primary, secondary, ghost, danger) e estados de loading |
| `Card` | Container com sombra/elevação e suporte a tema |
| `Badge` | Chip de label pequeno com cor customizável |
| `Input` | Campo de texto com label, placeholder e estado de erro |
| `Checkbox` | Checkbox nativo com animação de conclusão |

### Tarefa (`src/components/task/`)

| Componente | Descrição |
|---|---|
| `TaskItem` | Item de tarefa na listagem (checkbox, título, prioridade, data) |
| `PriorityBadge` | Badge de prioridade com cor e rótulo em português |
| `DueDateLabel` | Exibição formatada da data de vencimento (hoje/atrasada/data normal) |

## Tema

`src/constants/theme.ts` exporta `useThemeColors()` — hook que retorna `Colors.light` ou `Colors.dark` baseado em `useColorScheme()` do React Native.

```typescript
// Uso em componente
const colors = useThemeColors();
const styles = StyleSheet.create({
  container: { backgroundColor: colors.background },
  text: { color: colors.text },
});
```
