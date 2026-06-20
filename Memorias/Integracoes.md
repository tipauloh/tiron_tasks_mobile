# Integrações — Tiron Tasks Mobile

**Data:** 2026-06-20

## Expo Application Services (EAS)

- **Conta:** `phkirchesch`
- **Projeto:** `tiron-tasks`
- **Project ID:** `c63cddf2-8ce3-4109-99f8-c0f7782f09e7`
- **URL OTA:** `https://u.expo.dev/c63cddf2-8ce3-4109-99f8-c0f7782f09e7`
- **CLI:** `eas-cli >= 20.0.0` (configurado em `eas.json`)
- **App version source:** `remote` (versão gerenciada pelo EAS, não pelo `package.json`)
- **Runtime version policy:** `appVersion` (garante compatibilidade de OTA por versão do app)

### Perfis de Build

| Perfil | Distribution | Channel OTA | `APP_ENV` | `autoIncrement` |
|---|---|---|---|---|
| `development` | Internal (dev client) | `development` | `development` | não |
| `preview` | Internal | `preview` | `preview` | não |
| `production` | Store | `production` | `production` | sim |

### OTA Updates

- Configurado via `expo-updates ^56.0.19`.
- Função auxiliar em `src/lib/updates.ts`: `checkForUpdates()` verifica e aplica OTA ao abrir o app (exceto em `__DEV__`).
- Channels mapeados 1:1 com perfis de build.

### Comandos EAS

```bash
# Build de desenvolvimento (APK/IPA com dev client)
EXPO_TOKEN=<token> npx eas build --profile development --platform all

# Build de preview (distribuição interna)
EXPO_TOKEN=<token> npx eas build --profile preview --platform all

# OTA update para production
EXPO_TOKEN=<token> npx eas update --channel production --message "Descrição da atualização"
```

## Banco de Dados Local — expo-sqlite (Fase 1)

- **Pacote:** `expo-sqlite ^56.0.5`
- **Arquivo do banco:** `tiron_tasks.db` (criado automaticamente no diretório de dados do app)
- **Tabelas:** `task_lists`, `tasks`, `labels`, `task_labels`
- **Seed automático:** 4 listas padrão inseridas com `INSERT OR IGNORE` na inicialização

## React Native Reanimated

- **Pacote:** `react-native-reanimated 4.3.1` + `react-native-worklets 0.8.3`
- Requer New Architecture (`"newArchEnabled": true` no `app.json`)
- Usado para animações de transição de telas (Expo Router) e interações de UI (swipe, drag-to-reorder)

## Expo Notifications

- **Pacote:** `expo-notifications ^56.0.18`
- Configurado no `app.json` (ícone e cor de notificação)
- Na fase 1: não implementado ativamente. Infraestrutura pronta para fase 2 (lembretes de tarefas)

## Expo Secure Store

- **Pacote:** `expo-secure-store ^56.0.4`
- Armazenamento seguro para tokens de autenticação e preferências sensíveis
- Na fase 1: não utilizado (sem autenticação). Preparado para fase 2 (token da API)

## TanStack Query

- **Pacote:** `@tanstack/react-query ^5.101.0`
- `QueryClientProvider` configurado no root layout desde a fase 1
- Na fase 1: não utilizado ativamente (SQLite é síncrono)
- Na fase 2: assumirá fetching, cache e invalidação de dados da API

## API REST/GraphQL (Fase 2 — Futuro)

- Backend a ser definido separadamente (projeto `app_web` ou servidor dedicado)
- Repositórios já preparados para troca via interface pattern (`TaskRepository`, `TaskListRepository`)
- TanStack Query abstrairá o fetching
- `expo-secure-store` armazenará o token de autenticação
- Spec de sincronização offline: `openspec/specs/offline-first.md`

Ver também: `[[Arquitetura]]`, `[[Decisoes]]`.
