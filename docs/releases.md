# Releases — Tiron Tasks Mobile

Histórico de versões publicadas. Versões internas (dev/preview) não são listadas aqui.

---

## v1.0.0-alpha (2026-06-20)

**EAS Channel:** preview
**Build:** EAS Build (iOS + Android)
**OTA:** não aplicável (primeira versão)

### Incluído

- Arquitetura Clean com 4 camadas (domain / infrastructure / store / presentation)
- Banco local SQLite com `expo-sqlite` — offline first
- Design System completo: tokens de cor, tipografia, espaçamento, tema light/dark
- Componentes base: Text, Button, Card, Badge, Input, Checkbox
- Componentes de tarefa: TaskItem, PriorityBadge, DueDateLabel
- Navegação com Expo Router v4: 3 tabs + modal de detalhe de tarefa
- Dashboard (Tab Início): estatísticas, tarefas do dia, atrasadas
- Gestão de tarefas: criar, editar, concluir, deletar, favoritar
- Filtros: por lista, por status, favoritos
- Busca global por título
- Listas padrão: Pessoal, Trabalho, Compras, Estudos
- Suporte a subtarefas (estrutura de dados + repositório)
- Dark Mode automático
- OTA configurado com expo-updates (channels: development / preview / production)
- EAS Build configurado para 3 ambientes

### Stack

- Expo SDK 56.0.12
- React Native 0.85.3
- TypeScript 6.0.3
- Expo Router 56.2.11
- Zustand 5.0.14
- TanStack Query 5.101.0
- expo-sqlite 56.0.5
- react-native-reanimated 4.3.1

---

## v1.0.0 (previsto)

**EAS Channel:** production
**Critérios para promoção de alpha para v1.0.0:**

- [ ] Testes de integração E2E passando (Detox)
- [ ] Revisão de UX com usuários reais
- [ ] Swipe actions em TaskItem (UX-002)
- [ ] Animações de conclusão de tarefa
- [ ] Aprovação nas lojas (App Store + Google Play)
- [ ] TECH-002: CI/CD com EAS + GitHub Actions

---

## v1.1.0 (planejado — Fase 2)

**Critérios:**

- [ ] API-001: Integração com backend REST
- [ ] API-004: Autenticação de usuário
- [ ] FEAT-001: Notificações push (lembretes)
- [ ] API-002: Sincronização offline com servidor
