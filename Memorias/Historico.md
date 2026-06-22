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

## Fase 2 — Correções (2026-06-21)

### FIX-001 — Seletor de lista na edição de tarefa
- **Sintoma:** na tela de edição de tarefa (`src/app/task/[id].tsx`) não havia opção de escolher/alterar a lista da tarefa.
- **Causa raiz:** a tela nunca foi conectada ao seletor de lista. O componente `ListSelectorTrigger` (`src/components/tasks/ListSelector.tsx`) já existia mas não era usado em lugar nenhum, e o `handleSave` não enviava `task_list_id`. O suporte na API (`ApiTaskUpdateRequest.task_list_id`) já existia.
- **Correção:**
  - Importado `ListSelectorTrigger` na tela de edição.
  - Novo estado `listId`, inicializado de `task.task_list` no `useEffect` de carga.
  - Seção "Lista" renderizada entre Prioridade e Data de entrega (marca `isDirty` ao alterar).
  - `task_list_id` incluído no payload do `handleSave` (`null` para "Sem lista").
- **Validação:** typecheck limpo no arquivo editado; 131 testes passando.
- **Publicação OTA:** canal `production`, runtime `1.0.0`, update group `387b36b3-d780-4837-9409-175157b01b0b` (android+iOS).

### FIX-002 — Seção "Concluídas" recolhível em todas as listagens
- **Pedido:** em todo o app, separar tarefas concluídas num grupo abaixo das pendentes, com cabeçalho que oculta/mostra as concluídas.
- **Decisões (usuário):** padrão **oculto**; preferência **global e persistida**; aplicar nas **4 telas** (dashboard, tarefas, calendário, busca).
- **Implementação:**
  - `src/utils/group-tasks.ts`: lógica pura `partitionTasks` + `buildTaskRows` + `TaskRow` + `COMPLETED_HEADER_KEY` (testada).
  - `src/components/tasks/CompletedSection.tsx`: `CompletedSectionHeader` (cabeçalho clicável com chevron), reexporta a lógica pura.
  - `src/store/filter-store.ts`: `showCompleted` (default `false`) + `setShowCompleted`/`toggleShowCompleted`, persistido no SecureStore (`partialize`).
  - Telas `(tabs)/index.tsx`, `(tabs)/tasks.tsx`, `(tabs)/calendar.tsx`, `(tabs)/search.tsx`: `FlatList` passa a consumir `rows` (linhas discriminadas task/header). No dashboard, o modo "Concluídas" continua plano.
- **Testes:** `__tests__/utils/group-tasks.test.ts` (8 casos). Total 139 testes.

### FEAT-001m — Adição rápida na aba Tarefas
- **Pedido:** campo aberto na tela de tarefas para criar tarefa só com o nome; respeita a lista ativa (lista selecionada → cria nela; "Todas" → sem lista). Posicionado à esquerda do botão "+" existente.
- **Implementação:** em `(tabs)/tasks.tsx`, barra inferior (`KeyboardAvoidingView`) com `TextInput` à esquerda do FAB; `handleQuickAdd` usa `useCreateTask` com `task_list_id = activeListIntId`. Placeholder reflete a lista ativa.
- **Publicação OTA (FIX-002 + FEAT-001m):** canal `production`, runtime `1.0.0`, update group `3e838724-9b42-4033-bcff-d412b92150d1` (android+iOS).
- **Correção FEAT-001m:** o campo de adição rápida havia sido posto em `(tabs)/tasks.tsx`, que é **rota legada oculta** (`href: null` em `_layout.tsx`). A aba "Tarefas" do tab bar renderiza `(tabs)/index.tsx` (dashboard). O campo foi movido para `index.tsx`. Republicado: update group `93e10ab2-6e79-4354-96af-2d6f5efd97d8`. **Nota:** apenas `index.tsx` (Tarefas), `calendar.tsx` e `profile.tsx` são telas visíveis; `tasks.tsx` e `search.tsx` são legados ocultos.

### BRAND-001 — Novo ícone da marca + branding da tela de login
- **Fonte:** SVG "TironTasks" (T preto #0D0D1A + check diagonal roxo #7B4DFF sobre fundo #F5F5F7). Gerado via `sharp` a partir de variantes SVG (full-bleed para iOS, transparente safe-zone para Android foreground, monochrome, rounded).
- **Assets atualizados** (`assets/images/`): `icon.png` (1024 full-bleed, sem transparência p/ iOS), `favicon.png`, `splash-icon.png` (transparente), `android-icon-foreground/background/monochrome.png`, novos `logo.png` e `google-logo.png` (G oficial 4 cores). `app.json`: `adaptiveIcon.backgroundColor` → `#F5F5F7`.
- **Login** (`src/app/(auth)/login.tsx`): logo trocado pelo ícone da marca; botões OAuth Google (branco + G colorido) e Apple (preto + maçã) seguindo guidelines oficiais, **desabilitados** ("Em breve") até configurar OAuth.
- **OTA (parte JS — logo+botões):** update group `e776304d-a82d-49fe-b079-534816bf82ba`.
- **Ícone nativo (launcher/splash/adaptive) exige BUILD:** disparada build production Android+iOS via `eas build --platform all --profile production`. Android build `1576059e-6e11-41ca-b0e7-4086e8edb8e9`, iOS `fd846657-0549-4047-a7bc-93c0c4ce8d89`. Credenciais iOS já existiam no EAS.
- **Pré-requisito do build:** as mudanças foram **commitadas no git** antes (eas build empacota o HEAD do git, não o working dir — diferente do eas update).

### AUTH-001 — Cadastro de usuário e recuperação de senha (mobile)
- **Telas:** `src/app/(auth)/register.tsx` (cadastro nome/email/senha → auto-login) e `src/app/(auth)/forgot-password.tsx` (email → código → nova senha). Links no `login.tsx`.
- **Backend:** signup em `app_api` (`POST /api/v1/auth/register`, grava em `mobile_users`); reset via `app_web` (`POST /api/mobile/password/{forgot,reset}`, tabela própria `mobile_password_reset_tokens`, código 6 dígitos por e-mail). Decidido centralizar o reset no Laravel por reaproveitar a infra de e-mail.
- **Config:** `app.json` `extra.webUrl` (placeholder `https://app.tiron.com.br` — **CONFIRMAR URL pública real do app_web**, diferente da apiUrl).
- **Implementado por 3 agentes em paralelo** (app_api / app_web / app_mobile) com contratos de API fixados.
- **PENDÊNCIAS antes de ativar em produção:**
  1. ✅ **Corrigido (app_api):** `user_service` (get/update profile) agora opera em `mobile_users` (era `users`), e `auditable_type` → `App\Models\MobileUser`. Sintaxe validada (py_compile); **testes do app_api ainda usam fixtures em `users`** — realinhar + rodar com Postgres no deploy/CI.
  2. ✅ **webUrl confirmado:** `https://tasks.tiron.com.br`.
  3. **SMTP:** seed das settings gravou os valores atuais do `.env` (driver `log` — "config teste"). Trocar para `smtp` real na tela de Configurações quando quiser e-mail de verdade.
  4. ✅ **OTA das telas de auth publicado:** update group `ffedd494-4d67-495f-badf-a0ea3bd06487`.
  5. ✅ **DEPLOY concluído (2026-06-21)** via SSH porta 8022 no VPS. app_web: `git pull` + migrations (`settings`, `mobile_password_reset_tokens`) + seed `manage-settings` + clear cache. app_api: `rsync` do código + `docker compose up -d --build`. **Validado ponta a ponta:** `POST /auth/register` → 201+token; `GET /me` → 200 (fix mobile_users OK); `/api/mobile/password/forgot` → 200; `/admin/settings` → 302. Usuário de teste removido. Ver `[[reference_vps_deploy]]`.
  6. SMTP segue em `log` (config teste) — trocar para `smtp` na tela de Configurações quando quiser e-mail real. Testes do app_api ainda usam fixtures em `users` (não afeta produção).

### Configurações + SMTP no app_web (base do reset)
- Tabela `settings` + `Admin/SettingController` + permissão `manage-settings` + menu + `SettingsServiceProvider` (injeta SMTP em runtime). Ver `app_web` (commit próprio).

### SOCIAL-001 — Login social Apple e Google (2026-06-21)
- **Mobile:** `expo-apple-authentication` + `@react-native-google-signin` (SDKs nativos); `app.json` com plugins, `ios.usesAppleSignIn`, `iosUrlScheme` e client IDs públicos; handlers em `login.tsx`; `auth-store.loginWithGoogle/loginWithApple`. Botões habilitados (Apple iOS; Google iOS+Android).
- **Backend (app_api):** `app/core/oauth.py` (validação JWKS Google/Apple), `/auth/google` e `/auth/apple` (eram stubs 501) → criam/logam em `mobile_users`. Deps `pyjwt[crypto]`+`httpx`. Deployado e validado (401 p/ token inválido).
- **Fix Dockerfile app_api:** o fallback `pip install` hardcoded não tinha pyjwt/httpx → container quebrava (ModuleNotFoundError). Corrigido + rebuild.
- **Credenciais:** 3 client IDs + secret no `.env` do VPS (fora do git). SHA-1 keystore EAS cadastrado no OAuth client Android. **Rotacionar o client secret** (vazou no chat).
- **Build iOS+Android disparada:** Android `1c549ec7`, iOS `c1553bb2`. Validar login no device após instalar.

### FOCO-001 — Lista fixa "Em Foco" + saudação harmônica (2026-06-21)
- **Em Foco:** chip fixo `🎯 Em Foco` sempre primeiro na barra de listas do dashboard (`(tabs)/index.tsx`), cor roxa da marca. Lista VIRTUAL (não é task_list real) — `activeListId === '__focus__'` → `apiTasks` retorna `importantQuery.data` (favoritas). Reaproveita 100% o `is_favorite`/estrela: favoritar adiciona em Em Foco sem tirar da lista original. StatCards saem do foco ao clicar (filtros globais).
- **Saudação:** nome grande não quebra mais em 2 linhas — `greetingRow` (flex row), nome com `numberOfLines={1}` + `flexShrink` + `ellipsizeMode tail`, e o 👋 num Text fixo sempre visível.
- **Entrega:** OTA `d675d8c9-745d-4bfb-b02d-f39b5c885400` (ambos JS puro).

### FOCO-002 — Em Foco usa favoritas reais + saudação inteira + ícone alvo (2026-06-21)
- **Bug:** "Em Foco" usava `/important` (prioridade alta/crítica), não favoritas → favoritar não refletia. **Backend (app_api):** adicionado filtro `is_favorite` ao endpoint de listagem (`GET /tasks?is_favorite=true`) + `task_service.list_tasks`. Deployado e validado.
- **Mobile:** "Em Foco" passou a usar `useTasks({ is_favorite: true })`. Ícone de favoritar trocado de estrela (★) para 🎯 (opacidade indica estado). Saudação com `adjustsFontSizeToFit` (nome inteiro em 1 linha, sem cortar).
- **OTA:** `f993937b-9370-4d9c-a93a-96781d3729a4`.

### FEAT-002 — Recorrência, horário início/fim e drag-and-drop (2026-06-21)
- **Migration (app_web):** colunas `start_time`/`end_time` (TIME) em `tasks`. Aplicada local E em produção (VPS git pull + artisan migrate).
- **Backend (app_api):** schemas/serviço com `start_time`/`end_time` ("HH:MM") + `recurrence` (upsert/delete em `task_recurrences`); endpoint `PATCH /api/v1/tasks/reorder`; listagem ordena por `position ASC, id DESC`. Deployado (rsync+rebuild) e validado em produção.
- **Mobile:** `TimeRangePicker` + `RecurrencePicker` em criar/editar; `TaskItem` mostra 🕘 horário e 🔁; `calendar.tsx` expande recorrência no cliente (`utils/recurrence.ts` `expandRecurrence`, 24 testes); `DraggableTaskList` (gesture-handler+reanimated, JS-only) no modo "Reordenar" → `useReorderTasks`. Total 163 testes.
- **Entrega:** backend via deploy VPS; mobile via OTA `b290c451-2c62-4f0c-a1ba-b783c33ea3fd` (sem build — nenhum módulo nativo novo).
- **Aprendizado:** agente rodou migration no Docker LOCAL; produção (VPS) precisou de git pull + migrate à parte (ver `[[reference_vps_deploy]]`).

### FEAT-003 — Lembretes, compartilhamento de listas, drag-drop pro e separador (2026-06-22)
- **Migration (app_web):** `task_list_members` (task_list_id, mobile_user_id, role admin/member; sem FK). Aplicada local e VPS. app_api também cria via `CREATE TABLE IF NOT EXISTS` no startup (self-healing).
- **Backend (app_api):** lembretes (`POST /tasks/{id}/reminders`, `DELETE /tasks/reminders/{id}`, `reminders[]` no detail); compartilhamento (`GET /task-lists` retorna `role`/`shared` + listas onde é membro; `POST/GET/DELETE /task-lists/{id}/members`; visibilidade de tarefas de listas compartilhadas). Deployado e validado em produção (2 usuários).
- **Fix de regressão:** `_fetch_recurrence` fazia `dict(None)` quando a tarefa não tinha recorrência → 500 ao criar tarefa. Corrigido (`first = ...first(); dict(first) if first else None`).
- **Mobile:** `lib/notifications.ts` (notificação LOCAL agendada — exige build, Expo Go não suporta) + `ReminderPicker`; `ListMembersSection` (convidar por e-mail) em edit-list; drag-and-drop profissional sem botão (long-press a qualquer momento, item flutuante + auto-scroll, manual sobre gesture-handler+reanimated, sem lib nova); separador hairline no `TaskItem`.
- **Entrega:** backend via VPS; mobile via **BUILD** (notificações precisam de binário) + TestFlight. Build disparada.
- **Decisão notificações:** LOCAL agendada (não push server) — mais simples/confiável p/ lembrete da própria tarefa.

### M365-001 — Integração Microsoft 365 (read-only) (2026-06-22)
- **Escopo:** somente leitura. E-mails sinalizados (Outlook) + Microsoft To Do. **Outlook Tasks descartado** (API descontinuada em 2022).
- **Auth:** OAuth 2.0 Authorization Code + PKCE (`expo-auth-session`+`expo-crypto`), tokens só no Secure Store, refresh automático, sem client secret. Client ID `135c417a-71ba-4f72-964a-b535bf441905` em `app.json extra.microsoftClientId`. Redirect `tirontasks://auth/microsoft`. Tenant `common`.
- **Escopos delegados mínimos:** User.Read, Mail.Read, Tasks.Read, offline_access.
- **Módulo:** `src/modules/microsoft365/` (auth, graph, sync, storage SQLite, repositories, models/mappers, services, hooks, components, screens). Flagged via filtro paginado; To Do via delta. Auto-sync (abrir/30min/foreground). Resumo de e-mail gerado localmente. Logs com redação.
- **UI:** Perfil → Integrações → Microsoft 365.
- **Docs:** `docs/integrations/microsoft365/` (overview, architecture, authentication, permissions, security, sync-engine, storage, testing, troubleshooting, future-roadmap).
- **Testes:** 231 (27 novos do M365). **Exige BUILD** (módulos nativos). Build disparada + TestFlight.

### FIX-UX-001 — Drag-drop (lib), separador, janela de horário, EmptyState, diagnóstico M365 (2026-06-22)
- **Drag-and-drop:** substituído o manual bugado (ia p/ extremos, sem ajuste fino) por `react-native-reorderable-list@0.18` (drop-in de FlatList, Reanimated 4). Long-press a qualquer momento, ajuste fino, highlight de destino (renderDropIndicator), auto-scroll. `GestureHandlerRootView` no root. Removido `DraggableTaskList.tsx`.
- **Separador:** `TaskItem` borderBottom `borderLight` → `border` (mais visível).
- **TimeRangePicker:** ao mudar o INÍCIO, desloca o FIM mantendo a duração (`shiftEndOnStartChange` em utils/time, testado); FIM independente.
- **EmptyState falso:** "Nenhuma tarefa" aparecia com tarefas listadas porque as pendentes saíam da FlatList; com o drop-in elas voltam para `data={rows}` → corrigido.
- **Microsoft 365 sync:** `Promise.allSettled` (e-mail e To Do independentes — um não derruba o outro); `GraphError` com status+código real; a tela mostra o erro real (ex.: HTTP 403 de permissão) em vez de "Sincronizado" genérico. **Causa provável do sync vazio:** escopos `Mail.Read`/`Tasks.Read` ausentes no token → exige reconectar após adicionar permissões.

### FIX-UX-002 — Drag (gesto), e-mail Graph, M365 só e-mails, separador, calendário (2026-06-22)
- **Drag não iniciava:** o `onLongPress` era de um `Pressable` (RN core) por fora do `Swipeable` (gesture-handler) → na nova arquitetura o gesto do gh tem prioridade e o long-press nunca disparava. Trocado por `Gesture.LongPress().runOnJS(true)` do gesture-handler (convive com o swipe-to-delete).
- **Microsoft 365 e-mails (HTTP 400 InefficientFilter):** o Graph rejeita `$filter` em flag/flagStatus combinado com `$orderby=receivedDateTime`. Removido o `$orderby` da query; ordenação feita no cliente. (Mail.Read estava OK — era erro de query, não permissão.)
- **Microsoft 365 — escopo reduzido:** removida a sincronização de tarefas (To Do = Tarefas do Outlook; API antiga de Outlook Tasks descontinuada em 2022). Agora só **e-mails sinalizados**. Escopo `Tasks.Read` removido; UI sem contador/lista de tarefas. Decisão do usuário.
- **Separador entre tarefas:** espessura `hairline → 1px` (mais visível, após já ter mudado a cor p/ `border`).
- **Calendário:** número do dia subido (`paddingBottom: 6` na célula) para centralizar melhor.

### FEAT-EMAIL-TASK — E-mails sinalizados viram tarefas (2026-06-22)
Feature faseada (decisões do usuário: criação automática; concluir tarefa marca e-mail; reabrir reverte; tela M365 = só conta+sync). **Mail.ReadWrite** necessário (Fase 3).
- **Fase 1 — BACKEND (app_api), deployada no VPS:** colunas `tasks.external_email_id`/`external_provider`, `task_lists.is_system`, índice único parcial (idempotência) — migração idempotente no startup (`main.py _MIGRATE_EMAIL_LINK`). Endpoint `POST /api/v1/tasks/email-sync` (`task_service.sync_emails` cria lista de sistema "E-mail Sinalizados" + tarefas vinculadas, sem duplicar). Lista `is_system` protegida de delete/rename. Lógica validada por script direto + verificada em produção.
- **Fase 2 — MOBILE (OTA):** `syncNow` espelha os e-mails via `taskApi.emailSync` → `POST /tasks/email-sync`; `ApiTaskSummary` expõe o vínculo; hooks invalidam tasks/task-lists; tela M365 simplificada (e-mails aparecem como tarefas na lista). Testes atualizados (236 verdes).
- **Fase 3 (pendente):** concluir/reabrir tarefa vinculada → `PATCH /me/messages/{id}` flag complete/flagged (simétrico). Exige `Mail.ReadWrite` + reconectar.

### FEAT-EMAIL-TASK Fase 3 — Concluir tarefa marca o e-mail (2026-06-22)
- `MS_SCOPES`: Mail.Read → **Mail.ReadWrite** (única escrita: flag/flagStatus). `graphPatch` em `graph/client.ts`; `setEmailFlagComplete/Flagged` em `graph/mail.ts`.
- `services/email-mirror.ts` `mirrorTaskCompletionToEmail` (best-effort, retorna needsReconnect). Ligado em `useToggleTaskStatus.onSuccess` (use-tasks.ts) via `res.data.external_email_id`/`external_provider`. Simétrico: concluir→'complete', reabrir→'flagged'. Falha por permissão → Alert orientando reconectar.
- **Exige usuário Desconectar→Conectar** uma vez (token novo com Mail.ReadWrite). Entregue por OTA.

### FIX-UX-003 — Drag mais fluido + destaque por cor (2026-06-22)
- **Mesmo toque:** trocado o gesto manual (Gesture.LongPress + useReorderableDrag) pela prop nativa da lib `panActivateAfterLongPress={180}` — segura e já arrasta no mesmo toque, mais fluido. Removido o componente `ReorderableTaskCell` e imports de gesto.
- **Cor no item arrastado:** `REORDER_CELL_ANIMATIONS` ganhou `backgroundColor` (primary suave) + sombra colorida; o TaskItem é transparente, então o fundo aparece só no item ativo. Antes não havia destaque de cor.
- **Indicador de destino:** a "listra" fina (dropIndicatorBar) virou um "slot" suave (fundo primary + contorno tracejado arredondado).
- **Segurança:** `handleReorder` ignora origem fora das pendentes (`from >= pendingCount`), pois agora o long-press é global na lista.

### FIX-UX-003b — Reverter panActivateAfterLongPress (quebrou o drag) (2026-06-22)
`panActivateAfterLongPress` instala um pan próprio que COMPETE com o `Swipeable` (swipe-delete) de cada item → o arraste parou de iniciar. Revertido para o gesto manual que convivia com o swipe (Gesture.LongPress minDuration 180 + useReorderableDrag no GestureDetector, restaurado ReorderableTaskCell). **Mantidos** os ganhos visuais: highlight por cor (cellAnimations backgroundColor) e slot suave no destino. Lição: nesta lib, long-press explícito > panActivateAfterLongPress quando há Swipeable na célula.

### FIX-UX-003c — Arraste no MESMO toque (sem 2º clique) (2026-06-22)
Raiz do "2º clique": o pan que move o item vive na LISTA (Gesture.Pan da lib); `drag()` só ATIVA a célula. Um `Gesture.LongPress` do gesture-handler é concorrente e CANCELA esse pan → precisa de 2º toque. Solução: padrão canônico da lib `Pressable onLongPress={drag}` (RN core) DENTRO do Swipeable (antes estava por fora → não disparava). O Pressable não cancela o pan da lib → mesmo toque já arrasta. `dragHandler` prop no TaskItemSwipeable; removido Gesture/GestureDetector. Se ainda exigir 2º toque, plano B = drag handle dedicado.

### FIX-UX-003c revertido — Pressable não dispara dentro do Swipeable (2026-06-22)
A tentativa `Pressable onLongPress={drag}` (RN core) DENTRO do Swipeable também não dispara o drag (o gesture-handler do Swipeable bloqueia o toque do RN core). Revertido para `Gesture.LongPress` (gesture-handler) que FUNCIONA, porém com "2º toque" (o LongPress cancela o pan interno da lib). CONCLUSÃO: com Swipeable na mesma linha, mesmo-toque puro não é viável sem redesenho — caminho definitivo seria um "drag handle" dedicado. Estado estável atual = Gesture.LongPress (minDuration 180) + cor + slot.

### Ajuste — ícone da lista "E-mail Sinalizados" (2026-06-22)
A lista era criada com `icon='flag'` (string), mas o app renderiza o ícone como emoji (`<Text>{list.icon}</Text>`) → aparecia o texto "flag". Trocado para 🚩 no backend (`task_service._get_or_create_email_list`, deployado VPS) + `UPDATE task_lists SET icon='🚩'` na lista já existente (DB produção). App reflete após refresh das listas.

### FEAT-DRAG-HANDLE — Punho de arraste (mesmo toque, definitivo) (2026-06-22)
Adicionado punho ⠿ dedicado à direita de cada tarefa pendente arrastável, FORA do Swipeable. Usa `Pressable onPressIn={() => drag()}` (RN core): toca e já arrasta no MESMO toque — o Pressable não cancela o pan interno da lib (≠ Gesture.LongPress) e, fora do Swipeable, não disputa com o swipe-to-delete. Resolve de vez o "2º toque". Mantém highlight por cor (cellAnimations) + slot no destino. ReorderableTaskCell virou View[reorderContent flex:1 + dragHandle].

### FEAT-EMAIL-TASK Etapa A — E-mail em campos próprios + bandeirinha (2026-06-22)
- **Backend (deployado VPS):** colunas `tasks.email_from/email_subject/email_preview/email_received_at/email_web_link`. `sync_emails` grava esses campos; descrição da tarefa passou a ser **"Conforme e-mail abaixo"** (editável). Re-sync atualiza o bloco do e-mail das tarefas existentes e migra a descrição auto-gerada antiga (LIKE '📧%') para o padrão. `TaskDetail.email` (EmailMetaSchema) em `get_task`.
- **Mobile (OTA):** `Task.isEmailLinked` (mapper: external_provider==microsoft && external_email_id); `TaskItem` mostra **🚩 antes do título**. Tela de detalhe ganhou bloco **"E-mail sinalizado"** (remetente, assunto, data, prévia) abaixo de Informações. `ApiTaskDetail.email`/`ApiEmailMeta`.
- Tarefas antigas: bandeirinha aparece já (têm external_email_id); o bloco do e-mail aparece após o próximo sync (preenche email_*).

### FEAT-EMAIL-TASK Etapa B — Resync no refresh + polling 10s (2026-06-22)
No dashboard (index.tsx): identifica a lista de sistema via `is_system` (ApiTaskListFull.is_system, backend já retornava). Pull-to-refresh na lista de e-mail dispara `microsoft365Service.syncNow()` + invalida tasks/task-lists. Enquanto a lista de e-mail está selecionada, `useEffect` roda um sync a cada 10s (clearInterval ao sair). Best-effort (sem conta/erro = silencioso; guard this.syncing evita concorrência).

### FEAT-EMAIL-TASK — Reconciliação Outlook→app (desmarcar flag conclui tarefa) (2026-06-22)
Espelho do fluxo: retirar o sinalizador do e-mail no Outlook conclui a tarefa no app. Backend `sync_emails(reconcile=True)`: tarefas vinculadas (provider microsoft, não concluídas) cujo external_email_id NÃO está na lista de sinalizados recebida → status='completed'. Guarda `updated_at < NOW()-60s` evita corrida com reabertura recente (que re-sinaliza). `EmailSyncRequest.reconcile`. Mobile: `syncNow` passou a chamar `taskApi.emailSync` SEMPRE (mesmo lista vazia) — senão ao desmarcar o último e-mail nada reconciliaria.

### FEAT-EMAIL-TASK Etapa C — Múltiplas contas Microsoft 365 (2026-06-22)
Refatoração do módulo M365 single->multi-conta (lista de e-mail ÚNICA; cada tarefa guarda de qual conta veio). `accountId = profile.id`. Tokens no Secure Store POR conta. `signIn` não persiste; `me(accessToken)` (fetch direto) define o accountId; `persistTokensForAccount`; `connect` faz upsert sem remover outras. `syncNow(accountId?)` itera todas as contas (isolado; falha de uma não derruba as demais); `taskApi.emailSync({account_id, reconcile})` por conta. Write na conta certa via `external_account_id` da tarefa → `mirrorTaskCompletionToEmail(msgId,completed,accountId)`. Schema SQLite multi-conta (ms365_items.account_id + UNIQUE) com migração que recria UMA vez (db.ts, sem apagar cache a cada abertura). UI: card/desconectar por conta + conectar adiciona conta. Backend C1 (account_id opcional + external_account_id + reconcile por conta) deployado no VPS. JS puro -> OTA. 247 testes verdes.
