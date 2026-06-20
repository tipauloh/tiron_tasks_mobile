# Requisitos — Tiron Tasks Mobile

**Data:** 2026-06-20

## Requisitos Funcionais

### RF-01 — Gerenciamento de Tarefas

| ID | Requisito | Status |
|---|---|---|
| RF-01.1 | Criar tarefa com título (obrigatório), descrição (opcional), lista, prioridade e data de vencimento | Implementado |
| RF-01.2 | Editar todos os campos de uma tarefa existente | Implementado |
| RF-01.3 | Marcar tarefa como concluída (toggle) | Implementado |
| RF-01.4 | Deletar tarefa permanentemente | Implementado |
| RF-01.5 | Favoritar/desfavoritar tarefa | Implementado |
| RF-01.6 | Criar subtarefa vinculada a uma tarefa pai (via `parentId`) | Implementado (infra) |
| RF-01.7 | Definir prioridade: Baixa / Normal / Alta / Crítica | Implementado |
| RF-01.8 | Definir status: Não iniciada / Em andamento / Concluída / Cancelada | Implementado |
| RF-01.9 | Reordenar tarefas via drag-and-drop | Backlog (UX-001) |

### RF-02 — Listas de Tarefas

| ID | Requisito | Status |
|---|---|---|
| RF-02.1 | Criar lista com nome, cor e ícone | Implementado |
| RF-02.2 | Editar nome, cor e ícone de lista | Implementado (infra) |
| RF-02.3 | Arquivar lista (ocultar sem deletar) | Implementado (infra) |
| RF-02.4 | Deletar lista | Implementado (infra) |
| RF-02.5 | Favoritar/desfavoritar lista | Implementado (infra) |
| RF-02.6 | Listas padrão criadas automaticamente no primeiro uso | Implementado |

### RF-03 — Navegação e Visualizações

| ID | Requisito | Status |
|---|---|---|
| RF-03.1 | Tab "Início": dashboard com estatísticas e tarefas do dia | Implementado |
| RF-03.2 | Tab "Tarefas": listagem com filtros por lista e status | Implementado |
| RF-03.3 | Tab "Busca": pesquisa global por título | Implementado |
| RF-03.4 | Modal de detalhe/edição de tarefa | Implementado |
| RF-03.5 | Vista de tarefas atrasadas | Implementado (infra: `findOverdue`) |
| RF-03.6 | Vista de tarefas da semana | Implementado (infra: `findDueThisWeek`) |
| RF-03.7 | Vista de favoritos | Implementado (filtro `isFavorite`) |

### RF-04 — Design

| ID | Requisito | Status |
|---|---|---|
| RF-04.1 | Suporte a Dark Mode automático (segue preferência do SO) | Implementado |
| RF-04.2 | Design System com tokens (cores, tipografia, espaçamento) | Implementado |

### RF-05 — Funcionalidades Futuras (Fase 2)

| ID | Requisito |
|---|---|
| RF-05.1 | Notificações push para lembretes de tarefas |
| RF-05.2 | Recorrência de tarefas (diária, semanal, mensal, anual) |
| RF-05.3 | Compartilhamento de listas entre usuários |
| RF-05.4 | Integração com Google Calendar |
| RF-05.5 | Widget nativo iOS/Android |
| RF-05.6 | Modo Focus/Pomodoro |
| RF-05.7 | Anexos e comentários em tarefas |

## Requisitos Não Funcionais

### RNF-01 — Performance

| ID | Requisito |
|---|---|
| RNF-01.1 | Operações de leitura/escrita no banco devem completar em < 50ms (SQLite local síncrono) |
| RNF-01.2 | Animações a 60fps (react-native-reanimated no thread nativo) |
| RNF-01.3 | Tempo de cold start < 2s em dispositivos mid-range |
| RNF-01.4 | App responsivo durante operações de banco (sem bloquear thread JS por > 16ms) |

### RNF-02 — Offline First

| ID | Requisito |
|---|---|
| RNF-02.1 | 100% das funcionalidades da fase 1 disponíveis sem internet |
| RNF-02.2 | Nenhuma perda de dados em caso de fechamento abrupto do app |
| RNF-02.3 | Dados persistem entre sessões do app (SQLite local) |

### RNF-03 — Compatibilidade

| ID | Requisito |
|---|---|
| RNF-03.1 | iOS 16+ (requisito do Expo SDK 56) |
| RNF-03.2 | Android 10+ (API Level 29+) |
| RNF-03.3 | Suporte a tablet (iPad: `supportsTablet: true`) |
| RNF-03.4 | Web (Expo web output: `static`) |

### RNF-04 — Manutenibilidade

| ID | Requisito |
|---|---|
| RNF-04.1 | Cobertura de testes: domínio e stores com testes unitários |
| RNF-04.2 | TypeScript strict em todo o código |
| RNF-04.3 | Sem valores literais de cor/espaçamento — sempre via tokens |
| RNF-04.4 | Repositórios intercambiáveis via interface pattern (pronto para API) |

### RNF-05 — Distribuição

| ID | Requisito |
|---|---|
| RNF-05.1 | Build via EAS (sem Xcode/Android Studio local) |
| RNF-05.2 | OTA updates via expo-updates (sem publicar nova versão nas lojas para fixes) |
| RNF-05.3 | 3 environments distintos: development / preview / production |
