# Segurança — Microsoft 365

Referências: OWASP Mobile Top 10, OWASP API Security Top 10, Microsoft Secure Development.

## Tokens
- `access_token`/`refresh_token` **somente** no Expo Secure Store (Keychain/Keystore do OS). Nunca em SQLite, AsyncStorage ou logs.
- Sem **client secret** no app (public client; segurança via PKCE S256 por sessão + `state`).
- Refresh automático com folga (skew ~1min). Falha de refresh → tokens apagados + `MicrosoftReauthRequiredError` (pede reconectar).

## Logs
- Logger com **redação automática**: canais `microsoft_auth|sync|graph|cache`. URLs do Graph reduzidas a origin+path; **nunca** logam token, assunto, corpo ou preview de e-mail.

## Privacidade (LGPD/GDPR)
- Read-only: o app não altera dados na Microsoft.
- Resumo de e-mail gerado **localmente** (heurístico), sem enviar conteúdo a terceiros sem consentimento explícito.
- Dados sincronizados ficam no dispositivo (SQLite). **Desconectar com "remover dados"** apaga tokens + itens + delta tokens.
- Consentimento explícito do usuário na tela da Microsoft (escopos mínimos).

## Superfície de ataque
- Escopos só de leitura → mesmo com vazamento de token, não há escrita.
- Deep link de redirect validado (`state`); fluxo via navegador do sistema (ASWebAuthenticationSession/Custom Tabs), não WebView embutida.
