# Roadmap Futuro — Microsoft 365 (apenas documentação; NÃO implementar agora)

A versão atual é **somente leitura**. As fases abaixo exigiriam novos escopos de **escrita** e nova avaliação de segurança/privacidade.

## V2 — Escrita básica (To Do + Outlook)
- Criar tarefas no Microsoft To Do (`Tasks.ReadWrite`).
- Concluir/editar tarefas.
- Calendário Outlook (leitura → `Calendars.Read`).

## V3 — Ecossistema Microsoft
- Teams (mensagens/canais — escopos específicos).
- OneDrive (`Files.Read`).
- SharePoint (`Sites.Read.All` — requer admin consent).

## V4 — Inteligência
- Transformar e-mails sinalizados em tarefas automaticamente.
- Classificação automática por IA (categorias/prioridade).
- Sugestão automática de ações.

> Cada item acima é um novo épico, com novos escopos, novo consentimento e atualização das privacy labels (Apple) e Data safety (Google).
