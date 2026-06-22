# CHANGELOG

Todos os releases documentados seguem [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed
- Drag-and-drop voltou a iniciar (gesto via gesture-handler). [FIX-UX-002]
- Microsoft 365: e-mails sinalizados sincronizam (corrigido HTTP 400 InefficientFilter); integração passou a ser só e-mails. [FIX-UX-002]
- Separador entre tarefas mais visível; número do dia no calendário mais centralizado. [FIX-UX-002]
- Drag-and-drop reescrito (lib, ajuste fino, highlight de destino) + separador mais visível. [FIX-UX-001]
- Editar horário: mover o início desloca o fim mantendo a duração. [FIX-UX-001]
- Corrigido "Nenhuma tarefa" aparecendo com tarefas na lista. [FIX-UX-001]
- Microsoft 365: sync resiliente e mensagem de erro real (diagnóstico). [FIX-UX-001]

### Added
- Lembretes de tarefa por notificação (na hora / minutos antes / personalizado). [FEAT-003]
- Compartilhar listas por e-mail (admin/membros); tarefas da lista visíveis aos membros. [FEAT-003]
- Drag-and-drop sem botão (long-press) e separador visual entre tarefas. [FEAT-003]
- Recorrência de tarefas (diária/semanal/mensal/anual) refletida no calendário. [FEAT-002]
- Horário de início e fim nas tarefas. [FEAT-002]
- Reordenar tarefas por drag-and-drop (modo Reordenar). [FEAT-002]
- Lista fixa "Em Foco" (🎯): agrupa tarefas favoritadas sem tirá-las das listas; sempre no topo. [FOCO-001]
- Saudação do dashboard não quebra mais em 2 linhas com nomes grandes. [FOCO-001]
- Login: cadastro de novo usuário e "esqueci minha senha" (código por e-mail). Backend: signup no app_api + reset no app_web. [AUTH-001]
- Aba Tarefas: campo de adição rápida (cria tarefa só com o nome, na lista ativa ou sem lista) ao lado do botão "+". [FEAT-001m]
- Identidade visual: novo ícone da marca (T + check) em launcher/splash/adaptive/favicon e logo na tela de login. Botões Google/Apple conforme guidelines oficiais (desabilitados até configurar OAuth). [BRAND-001]

### Changed
- Listagens de tarefas (dashboard, tarefas, calendário, busca): tarefas concluídas agora ficam numa seção "Concluídas (N)" recolhível abaixo das pendentes — oculta por padrão, preferência global persistida. [FIX-002]

### Fixed
- Edição de tarefa: adicionado seletor de lista (`task_list_id`), que estava ausente na tela `task/[id]`. Publicado via OTA (production, runtime 1.0.0). [FIX-001]

### Added (foundation)
- Arquitetura Clean com camadas domain/infrastructure/store/presentation
- Banco local SQLite com expo-sqlite v56
- Design System: tokens de cor, tipografia e espaçamento
- Componentes base: Text, Button, Card, Badge, Input, Checkbox
- Componentes de tarefa: TaskItem, PriorityBadge, DueDateLabel
- Navegação com Expo Router: 3 tabs + modais
- Dashboard com estatísticas e listagem de tarefas
- Gestão de tarefas: criar, editar, concluir, deletar
- Filtros por lista, status e favoritos
- Busca global
- OTA configurado com expo-updates (channels: dev/preview/production)
- Dark Mode com tema automático do dispositivo
- Offline First via banco local SQLite
