# Backlog — Tiron Tasks Mobile

**Data:** 2026-06-20

Tarefas futuras organizadas por fase e prioridade. Cada item deve gerar uma spec em `openspec/specs/` antes da implementação.

---

## Concluído — Correções

### FIX-001 — Seletor de lista na edição de tarefa ✅ (2026-06-21)
**Sintoma:** sem opção de escolher/alterar a lista ao editar tarefa.
**Arquivo:** `src/app/task/[id].tsx` (usa `ListSelectorTrigger` de `src/components/tasks/ListSelector.tsx`).
**Mudança:** estado `listId` inicializado de `task.task_list`; seção "Lista" na UI; `task_list_id` enviado no `handleSave` (`null` = sem lista).
**Status:** typecheck ok, 131 testes passando, publicado OTA (production, runtime 1.0.0, update group `387b36b3-d780-4837-9409-175157b01b0b`).
**Detalhe:** `Memorias/Historico.md` → Fase 2 — Correções.

### FIX-002 — Seção "Concluídas" recolhível em todas as listagens ✅ (2026-06-21)
**Pedido:** concluídas agrupadas abaixo das pendentes, com ocultar/mostrar, em todo o app.
**Decisões:** padrão oculto · preferência global persistida · 4 telas (dashboard, tarefas, calendário, busca).
**Arquivos:** `src/utils/group-tasks.ts` (lógica pura testada), `src/components/tasks/CompletedSection.tsx` (header), `src/store/filter-store.ts` (`showCompleted`), telas `(tabs)/index|tasks|calendar|search.tsx`.
**Status:** typecheck ok, 139 testes (8 novos), OTA production runtime 1.0.0, update group `3e838724-9b42-4033-bcff-d412b92150d1`.

### FEAT-001m — Adição rápida na aba Tarefas ✅ (2026-06-21)
**Pedido:** campo para criar tarefa só com o nome, respeitando a lista ativa (lista → cria nela; "Todas" → sem lista), à esquerda do botão "+".
**Arquivo:** `src/app/(tabs)/tasks.tsx` (`handleQuickAdd` + `useCreateTask`, barra inferior com `TextInput` + FAB).
**Status:** incluído no mesmo OTA do FIX-002.

---

## Fase 2 — Integração com API

### API-001 — Backend REST/GraphQL
**Prioridade:** Alta
**Dependência:** Definição do servidor (app_web ou serviço dedicado)
- Definir contrato da API (endpoints, autenticação, paginação)
- Criar `ApiTaskRepository implements TaskRepository`
- Criar `ApiTaskListRepository implements TaskListRepository`
- Autenticação via Bearer token (armazenado no `expo-secure-store`)
- Spec: `openspec/specs/api-integration.md`

### API-002 — Sincronização Offline (fila de sync)
**Prioridade:** Alta
**Dependência:** API-001
- Tabela `sync_queue` no SQLite local
- Processar fila ao detectar conectividade
- Retry com backoff exponencial
- Indicador visual de status de sync
- Spec: `openspec/specs/offline-first.md` (seção Fase 2)

### API-003 — Resolução de Conflitos
**Prioridade:** Média
**Dependência:** API-002
- Estratégia Last Write Wins baseada em `updated_at`
- Merge por campo em caso de conflitos concorrentes
- UI para conflitos não resolvíveis automaticamente

### API-004 — Autenticação de Usuário
**Prioridade:** Alta
**Dependência:** API-001
- Tela de login (`src/app/(auth)/login.tsx`)
- Tela de cadastro
- Recuperação de senha
- Token persistido no `expo-secure-store`
- Spec: `openspec/specs/auth.md`

---

## Fase 2 — Funcionalidades

### FEAT-001 — Notificações Push
**Prioridade:** Alta
- Lembretes de tarefas (data/hora configurável)
- Notificações via FCM (Android) e APNs (iOS)
- `expo-notifications` já instalado
- Deep link ao tocar na notificação → `task/[id]`
- Spec: `openspec/specs/notifications.md`

### FEAT-002 — Compartilhamento de Tarefas
**Prioridade:** Média
- Compartilhar tarefa individual via link
- Colaboração em lista (convidar usuário por e-mail)
- Permissões: visualizar / editar / admin
- Spec: `openspec/specs/collaboration.md`

### FEAT-003 — Integrações Externas
**Prioridade:** Baixa
- Google Calendar (sincronizar tarefas com due_date)
- Apple Calendar (EventKit)
- Integração via OAuth 2.0
- Spec: `openspec/specs/external-integrations.md`

### FEAT-004 — Widget Nativo iOS/Android
**Prioridade:** Baixa
- Widget de tarefas do dia (iOS WidgetKit / Android App Widgets)
- Expo Modules API para implementação nativa
- Exige eject para managed workflow ou uso de bare workflow
- Spec: `openspec/specs/widget.md`

### FEAT-005 — Modo Focus / Pomodoro
**Prioridade:** Baixa
- Timer Pomodoro integrado à tarefa
- Sessões de 25min + pausa de 5min
- Histórico de sessões por tarefa
- Notificação ao fim do ciclo
- Spec: `openspec/specs/focus-mode.md`

### FEAT-006 — Recorrência de Tarefas
**Prioridade:** Média
- Tarefas recorrentes: diária, semanal, mensal, anual
- Configuração de dias da semana (para recorrência semanal)
- Limite por data de encerramento
- Geração automática da próxima ocorrência ao concluir
- Spec: `openspec/specs/recurrence.md`

### FEAT-007 — Anexos e Comentários
**Prioridade:** Baixa
- Upload de imagens/documentos em tarefas
- Comentários de texto por tarefa
- Depende de API (Fase 2 API-001)
- Spec: `openspec/specs/attachments-comments.md`

### FEAT-008 — Subtarefas com múltiplos níveis
**Prioridade:** Baixa
- UI de subtarefas indentadas com múltiplos níveis (fase 1 suporta apenas 1 nível na UI)
- Progresso de conclusão baseado em subtarefas
- Spec: `openspec/specs/subtasks.md`

---

## Fase 2 — UX / Performance

### UX-001 — Drag-and-Drop para reordenar tarefas
**Prioridade:** Média
- Reordenar tarefas arrastando (react-native-reanimated + gesture handler)
- Atualizar `position` via `updatePositions()` no repositório
- Haptic feedback ao iniciar drag

### UX-002 — Swipe Actions em TaskItem
**Prioridade:** Alta
- Swipe para direita: concluir tarefa
- Swipe para esquerda: deletar tarefa (com confirmação)
- react-native-gesture-handler (já instalado)

### UX-003 — Animações de Transição Avançadas
**Prioridade:** Baixa
- Shared element transition entre lista e detalhe de tarefa
- react-native-reanimated Layout Animations
- Animação de checkbox ao marcar concluída

### UX-004 — Atalhos de Teclado (iPad / teclado externo)
**Prioridade:** Baixa
- Cmd+N para nova tarefa
- Cmd+F para busca
- ESC para fechar modal

---

## Infraestrutura / Técnico

### TECH-001 — Backup automático
**Prioridade:** Média
- Backup do banco SQLite para iCloud Drive (iOS) / Google Drive (Android)
- Restauração em novo dispositivo

### TECH-002 — CI/CD com EAS
**Prioridade:** Alta
- GitHub Actions integrado ao EAS
- Build automático em PR para `preview` channel
- OTA automático em merge para `main` (production channel)

### TECH-003 — Monitoramento de erros
**Prioridade:** Média
- Integração com Sentry para React Native
- Tracking de crashes e erros de runtime

### TECH-004 — Testes de integração
**Prioridade:** Média
- Testes E2E com Detox
- Cobertura dos fluxos principais (criar/concluir/deletar tarefa)

### FIX-UX-001 ✅ (2026-06-22)
Drag-drop via react-native-reorderable-list; separador `border`; TimeRangePicker mantém janela ao mudar início; EmptyState corrigido; M365 sync resiliente + diagnóstico (GraphError). Arquivos: `(tabs)/index.tsx`, `TaskItem.tsx`, `TimeRangePicker.tsx`, `utils/time.ts`, `_layout.tsx`, `modules/microsoft365/{graph/client,services/real-microsoft365.service,screens/MicrosoftConnectionScreen}`.

### FIX-UX-002 ✅ (2026-06-22)
Drag via Gesture.LongPress (gesture-handler); M365 e-mails corrigido (InefficientFilter) e reduzido a só e-mails (Tasks.Read removido); separador 1px; número do dia no calendário. Arquivos: `(tabs)/index.tsx`, `(tabs)/calendar.tsx`, `TaskItem.tsx`, `modules/microsoft365/{constants,graph/mail,services/real-microsoft365.service,components/MicrosoftAccountCard,screens/MicrosoftConnectionScreen}`.

### FEAT-EMAIL-TASK Fase 1-2 ✅ (2026-06-22)
Backend (app_api, deployado VPS): colunas external_email_id/provider + is_system + endpoint POST /tasks/email-sync (lista sistema 'E-mail Sinalizados', idempotente). Mobile (OTA): syncNow espelha e-mails via taskApi.emailSync; tela M365 = só conta+sync. Fase 3 (concluir->marca e-mail) pendente: Mail.ReadWrite + reconectar.

### FEAT-EMAIL-TASK Fase 3 ✅ (2026-06-22)
Mail.ReadWrite; graphPatch + setEmailFlagComplete/Flagged; email-mirror ligado em useToggleTaskStatus (simétrico). Exige reconectar. OTA.

### FIX-UX-003 ✅ (2026-06-22)
Drag: panActivateAfterLongPress (mesmo toque) + highlight por cor no item (cellAnimations backgroundColor) + slot suave no destino (sem listra). Removido ReorderableTaskCell.

### FEAT-EMAIL-TASK Etapa A ✅ (2026-06-22)
Backend (VPS): colunas email_* + sync grava + descrição 'Conforme e-mail abaixo' + TaskDetail.email. Mobile (OTA): bandeirinha 🚩 no título + bloco do e-mail na tela de detalhe.

### FEAT-EMAIL-TASK Etapa B ✅ (2026-06-22)
Resync M365 no pull-to-refresh da lista de e-mail + polling 10s enquanto selecionada (index.tsx, via is_system).

### FEAT-EMAIL-TASK Etapa C ✅ (2026-06-22)
Multi-conta M365: tokens/itens/sync/escrita por conta (accountId=profile.id); lista única; external_account_id na tarefa; UI por conta. OTA.
