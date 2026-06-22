# Troubleshooting — Microsoft 365

| Sintoma | Causa provável | Solução |
|---|---|---|
| `AADSTS50011` redirect mismatch | Redirect URI do app ≠ App Registration | Garantir `tirontasks://auth/microsoft` em **Autenticação → Aplicativos móveis e de área de trabalho** |
| Login abre e volta sem conectar | "Permitir fluxos de clientes públicos" = Não | App Registration → **Autenticação** → marcar **Sim** |
| Erro de permissão ao sincronizar | Escopo faltando | Conferir delegated `User.Read, Mail.Read, Tasks.Read, offline_access` |
| Não conecta no Expo Go | Módulos nativos (auth-session/crypto) não rodam no Expo Go | Usar build (TestFlight/dev client) |
| Reconectar pedido sempre | Refresh token inválido/revogado | Desconectar e conectar de novo |
| 429 / lentidão | Rate limit do Graph | O cliente respeita `Retry-After`; aguardar |
| Conta só corporativa não loga | tenant `common` vs `organizations` | Ajustar `MS_TENANT` (ADR-003) |
| To Do não atualiza item removido | Delta filtra `@removed` | Comportamento esperado (read-only de ativos) |

## Logs úteis
Canais `microsoft_auth|sync|graph|cache` (sem dados sensíveis). Procurar por falhas de token/refresh e códigos HTTP.
