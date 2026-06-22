# Permissões — Microsoft 365 (princípio do menor privilégio)

Todas **delegated** (o app age em nome do usuário logado), **somente leitura**. Nenhuma `.All`, `.Shared`, `.Write` ou administrativa.

| Escopo | Tipo | Justificativa | Necessita admin consent? |
|---|---|---|---|
| `openid`, `profile` | OIDC | Login e claims básicas | Não |
| `offline_access` | OIDC | Refresh token (renovação sem novo login) | Não |
| `User.Read` | Graph, read | Identificar a conta conectada (`displayName`, `mail`/`userPrincipalName`) para exibir no card | Não |
| `Mail.Read` | Graph, read | Ler **e-mails sinalizados** incluindo `bodyPreview`. `Mail.ReadBasic` foi avaliado mas **não retorna `bodyPreview`/`body`**, e o requisito pede "preview" → `Mail.Read` é o mínimo viável | Não |
| `Tasks.Read` | Graph, read | Ler listas e tarefas do **Microsoft To Do** (inclui delta) | Não |

## Alternativa avaliada e descartada
- `Mail.ReadBasic`: menor privilégio, mas **sem preview do corpo** → não atende o requisito de "preview". Documentado para auditoria.

## O que NÃO pedimos (garantia read-only)
`Mail.Send`, `Mail.ReadWrite`, `Tasks.ReadWrite`, `Calendars.*`, `Files.*`, `Group.*`, qualquer `*.All` ou permissão de aplicação. A ausência delas garante, no nível do token, que o app **não consegue** escrever nem acessar além do escopo.

## Consentimento
O usuário vê e aprova os escopos na primeira conexão (tela de consentimento da Microsoft). Sem consentimento → sem token → sem sync.
