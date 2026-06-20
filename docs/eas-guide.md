# Guia EAS — Builds, OTA e Deploy

## Pré-requisitos

```bash
# Autenticar no EAS (use o token)
export EXPO_TOKEN=<seu_token>

# Verificar projeto
npx eas-cli project:info
```

---

## Ambientes

| Profile   | Channel     | Android      | iOS             | Uso                          |
|-----------|-------------|--------------|-----------------|------------------------------|
| development | development | APK         | Simulador       | Desenvolvimento local        |
| homolog   | homolog     | APK          | Dispositivo físico | Testes internos           |
| production | production  | AAB (bundle) | App Store ready | Produção futura             |

---

## Builds Android

### APK para desenvolvimento (instalar manualmente)

```bash
EXPO_TOKEN=<token> npx eas-cli build \
  --profile development \
  --platform android \
  --non-interactive
```

### APK para homologação

```bash
EXPO_TOKEN=<token> npx eas-cli build \
  --profile homolog \
  --platform android \
  --non-interactive
```

### AAB para produção (futuro — não publicar ainda)

```bash
EXPO_TOKEN=<token> npx eas-cli build \
  --profile production \
  --platform android \
  --non-interactive
```

**Download do APK:** Após o build concluir, o EAS exibe a URL de download.  
**Instalar no dispositivo:**
```bash
adb install tiron-tasks.apk
# ou baixar diretamente pelo link e instalar via "Fontes desconhecidas"
```

---

## Builds iOS

### Simulador (sem conta Apple)

```bash
EXPO_TOKEN=<token> npx eas-cli build \
  --profile development \
  --platform ios \
  --non-interactive
```

O arquivo `.app` gerado pode ser arrastado para o simulador iOS:
```bash
xcrun simctl install booted TironTasks.app
xcrun simctl launch booted br.com.tiron.tasks
```

### Dispositivo físico (requer Apple Developer)

Pré-requisito: conectar conta Apple no EAS:
```bash
EXPO_TOKEN=<token> npx eas-cli credentials
```

Depois:
```bash
EXPO_TOKEN=<token> npx eas-cli build \
  --profile homolog \
  --platform ios \
  --non-interactive
```

---

## OTA Updates

### Publicar atualização (qualquer ambiente)

```bash
# Desenvolvimento
EXPO_TOKEN=<token> npx eas-cli update \
  --channel development \
  --message "fix: corrige layout do dashboard"

# Homologação
EXPO_TOKEN=<token> npx eas-cli update \
  --channel homolog \
  --message "feat: adiciona subtarefas"

# Produção
EXPO_TOKEN=<token> npx eas-cli update \
  --channel production \
  --message "feat: v1.0.1 — melhorias de UX"
```

### O que pode ser entregue via OTA

✅ Telas e componentes  
✅ Lógica de negócio  
✅ Layout e estilos  
✅ Textos e traduções  
✅ Correções de bugs  

❌ Alterações nativas (Android/iOS)  
❌ Novas permissões  
❌ Inclusão de libs nativas  
❌ Mudança de runtimeVersion  
❌ Atualização do Expo SDK  

---

## Rollback OTA

### Via EAS CLI (recomendado)

```bash
# Listar updates do channel
EXPO_TOKEN=<token> npx eas-cli update:list --channel production

# Reverter para update anterior
EXPO_TOKEN=<token> npx eas-cli update:rollback --channel production
```

### Via painel web

1. Acesse: https://expo.dev/accounts/phkirchesch/projects/tiron-tasks/updates
2. Selecione o channel
3. Clique em "Rollback" no update desejado

---

## Runtime Version

A `runtimeVersion` é calculada automaticamente pela versão do `package.json` (`"policy": "appVersion"`).

| App Version | Runtime Version | Quando usar                              |
|-------------|-----------------|------------------------------------------|
| 1.0.0       | 1.0.0           | Build inicial                            |
| 1.0.1       | 1.0.0           | OTA — só muda version em package.json   |
| 1.1.0       | 1.1.0           | Nova compilação nativa                   |
| 2.0.0       | 2.0.0           | Breaking change nativo                   |

**Regra:** Só incremente versão MINOR ou MAJOR quando houver mudança nativa (exige novo build).  
Incrementos PATCH (1.0.x) podem ser entregues via OTA.

### Alterar runtimeVersion (nova compilação obrigatória)

1. Edite `version` em `package.json`
2. Gere novo build: `eas build --profile production`
3. Distribua o novo APK/AAB

---

## Novos Channels

Para criar um novo channel (ex: `beta`):

1. Adicione no `eas.json`:
```json
{
  "build": {
    "beta": {
      "distribution": "internal",
      "channel": "beta",
      "android": { "buildType": "apk" }
    }
  }
}
```

2. O channel é criado automaticamente na primeira publicação:
```bash
EXPO_TOKEN=<token> npx eas-cli update --channel beta --message "beta test"
```

---

## Executar localmente

```bash
# Instalar dependências
npm install

# Expo Go (sem expo-updates funcional)
npm run ios       # simulador iOS
npm run android   # emulador Android
npm run web       # browser

# Development Client (com expo-updates)
npm run ios -- --device
npm run android -- --device
```

---

## Deep Links

Scheme configurado: `tirontasks://`

Exemplos futuros:
```
tirontasks://task/123        # abrir tarefa
tirontasks://list/pessoal    # abrir lista
tirontasks://create          # criar tarefa
```

---

## Referências

- Projeto EAS: https://expo.dev/accounts/phkirchesch/projects/tiron-tasks
- Documentação EAS: https://docs.expo.dev/eas/
- Documentação expo-updates: https://docs.expo.dev/versions/v56.0.0/sdk/updates/
