# Tiron Tasks Mobile

Aplicativo mobile de produtividade pessoal para gerenciamento de tarefas.

## Stack

- React Native 0.85.3
- Expo SDK 56
- Expo Router v4 (file-based navigation)
- TypeScript 6
- Zustand (state management)
- expo-sqlite (local database — offline first)
- TanStack Query (data fetching, ready for API)
- react-native-reanimated (animations)

## Arquitetura

Clean Architecture com 4 camadas:
- **Domain**: entidades e interfaces de repositório
- **Infrastructure**: implementações SQLite
- **Application**: stores Zustand
- **Presentation**: screens e componentes Expo Router

## Desenvolvimento

```bash
# Instalar dependências
npm install

# Rodar no iOS simulator
npm run ios

# Rodar no Android
npm run android

# Rodar no browser (web preview)
npm run web
```

## Build (EAS)

```bash
# Build de desenvolvimento
EXPO_TOKEN=<seu_token> npx eas build --profile development

# OTA Update
EXPO_TOKEN=<seu_token> npx eas update --channel production
```

## Estrutura

```
src/
├── app/            # Expo Router screens
│   ├── (tabs)/     # Tab navigator
│   └── task/       # Task detail modal
├── domain/         # Entities, Repository interfaces
├── infrastructure/ # SQLite repositories
├── store/          # Zustand stores
├── components/     # UI components
├── constants/      # Design tokens
└── hooks/          # Custom hooks
```
