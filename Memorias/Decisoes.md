# Decisões Arquiteturais — Tiron Tasks Mobile

## D001 — Expo SDK 56 (versão mais recente estável)
**Data:** 2026-06-20
**Decisão:** Expo SDK 56.0.12 com React Native 0.85.3 e TypeScript 6.0.3.
**Justificativa:** SDK 56 é a versão estável mais recente confirmada no momento da criação do projeto (2026-06-20). Traz suporte à New Architecture do React Native (habilitada via `"newArchEnabled": true` no `app.json`), React 19.2.3 e o React Compiler experimental. Usar a versão mais recente garante acesso às melhorias de performance da New Architecture e suporte de longo prazo.
**Impacto:** Todos os pacotes expo-* no `package.json` são do SDK 56 (`~56.x.x`). Revisar esta decisão a cada nova major do Expo SDK.

## D002 — Expo Router v4 (file-based navigation)
**Data:** 2026-06-20
**Decisão:** `expo-router ~56.2.11` como camada de navegação.
**Justificativa:** Expo Router é a solução oficial do Expo para navegação. File-based routing elimina o boilerplate de `NavigationContainer` e stacks manuais do React Navigation. Suporte nativo a deep links, rotas tipadas (`typedRoutes: true`), tab navigators e modais declarativos via estrutura de arquivos. Integrado ao ecossistema Expo (server-side rendering para web, Expo Go).
**Por que NÃO React Navigation standalone:** Expo Router é construído sobre React Navigation mas elimina o boilerplate de configuração. Para projetos Expo, Expo Router é a escolha superior — menos código, mais convenção.

## D003 — expo-sqlite (banco local offline-first)
**Data:** 2026-06-20
**Decisão:** `expo-sqlite ^56.0.5` como banco de dados local.
**Justificativa:** Nativo (compilado em C), performático, suportado no Expo Managed Workflow sem eject. API síncrona (`runSync`, `getAllSync`) simplifica os repositórios. Persiste dados localmente no dispositivo sem necessidade de servidor. Perfeito para a fase 1 offline-first. Alternativas avaliadas e rejeitadas:
- **WatermelonDB**: poderoso mas complexo, requer configurações nativas adicionais.
- **MMKV**: key-value store, não relacional — não adequado para dados estruturados.
- **AsyncStorage**: sem suporte a queries relacionais SQL.

## D004 — Zustand (state management)
**Data:** 2026-06-20
**Decisão:** `zustand ^5.0.14` para estado global.
**Justificativa:** Minimalista (~1kb), sem boilerplate, tipagem TypeScript excelente, sem Provider obrigatório (diferente do Context API), sem actions/reducers/dispatchers verbosos. Stores são funções simples. Integração direta com React hooks (`useTaskStore()`).
**Por que NÃO Redux:** Redux Toolkit ainda exige slice/reducer/selector — verboso demais para o porte deste app. Zustand entrega o mesmo resultado com 90% menos código.
**Por que NÃO Jotai/Recoil:** Zustand tem melhor suporte a lógica assíncrona (ações que chamam repositórios) dentro da própria store, sem a necessidade de atoms separados para cada pedaço de estado.

## D005 — TanStack Query (preparado para API)
**Data:** 2026-06-20
**Decisão:** `@tanstack/react-query ^5.101.0` instalado e `QueryClientProvider` configurado desde a fase 1.
**Justificativa:** Na fase 1, o SQLite é síncrono e direto — TanStack Query não é usado ativamente. Porém, instalar e configurar desde o início garante que a migração para API (fase 2) seja uma troca de implementação de repositório, não uma refatoração de toda a camada de UI. TanStack Query cuida de cache, invalidação, loading states, retry e background refresh — tudo que será necessário com uma API REST.

## D006 — react-native-reanimated (animações nativas)
**Data:** 2026-06-20
**Decisão:** `react-native-reanimated 4.3.1` para animações.
**Justificativa:** Animações executam no thread nativo (UI thread), não no thread JS — resultado é 60fps garantido mesmo com JS ocupado. Requerido pelo Expo Router para animações de transição de tela. `react-native-worklets 0.8.3` é a dependência de runtime para worklets no thread nativo.

## D007 — Banco local isolado (Fase 1), API REST na Fase 2
**Data:** 2026-06-20
**Decisão:** Fase 1 usa exclusivamente SQLite local. Nenhuma chamada de rede é feita. Fase 2 adicionará um backend REST/GraphQL separado.
**Justificativa:** Permite entregar um app funcional offline-first sem depender da criação paralela de um backend. O padrão Repository (interface + implementação) garante que trocar `SQLiteTaskRepository` por `ApiTaskRepository` não exige mudanças nas stores ou nas telas. TanStack Query já está configurado para assumir o fetching quando a API existir.
**Impacto:** Toda a lógica de sincronização (fila offline, conflict resolution, merge strategy) pertence à fase 2 e será especificada em `openspec/specs/offline-first.md`.

## D008 — EAS Build + OTA via expo-updates
**Data:** 2026-06-20
**Decisão:** EAS Build para builds distribuíveis + `expo-updates ^56.0.19` para atualizações over-the-air.
**Justificativa:** EAS é o serviço oficial do Expo para builds em nuvem (iOS/Android) sem necessidade de Xcode/Android Studio localmente. OTA updates permitem corrigir bugs sem passar pelo ciclo de revisão das lojas. Três channels configurados: `development` (APK/IPA com dev client), `preview` (builds internos para QA), `production` (lojas).
**Conta EAS:** `phkirchesch` / projeto `tiron-tasks` (ID: `c63cddf2-8ce3-4109-99f8-c0f7782f09e7`).

## D009 — TypeScript strict mode
**Data:** 2026-06-20
**Decisão:** TypeScript 6.0.3 com configuração padrão do template Expo (inclui strict).
**Justificativa:** TypeScript strict pega erros de null/undefined em tempo de compilação — crítico para repositórios que lidam com campos opcionais do banco SQLite (colunas nullable mapeadas para `undefined` nas entidades).

## D010 — New Architecture habilitada
**Data:** 2026-06-20
**Decisão:** `"newArchEnabled": true` no `app.json`.
**Justificativa:** New Architecture (JSI, Fabric renderer, TurboModules) é o futuro do React Native e melhora significativamente a performance de interações e animações. Expo SDK 56 suporta oficialmente. `react-native-reanimated 4.x` requer New Architecture.

Ver também: `[[Arquitetura]]`, `[[Padroes]]`, `[[Integracoes]]`.
