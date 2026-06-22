# Autenticação — Microsoft 365 (OAuth 2.0 Authorization Code + PKCE)

## Fluxo (delegated, public client)
1. App gera `code_verifier` + `code_challenge` (PKCE S256).
2. Abre o **navegador do sistema** (ASWebAuthenticationSession/Custom Tabs via `expo-web-browser`) na URL de autorização do Microsoft Identity Platform.
3. Usuário autentica na Microsoft (o app **nunca** vê a senha).
4. Microsoft redireciona para `tirontasks://...` com `code`.
5. App troca `code` + `code_verifier` por `access_token` + `refresh_token` no `/token` (sem client secret — public client).
6. Tokens guardados no **Secure Store**. `access_token` (~1h) renovado via `refresh_token` (`offline_access`).

Endpoints (tenant `common` para contas pessoais + corporativas, ou `organizations` para só corporativas — ver ADR-003):
- Authorize: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/authorize`
- Token: `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token`

Scopes solicitados: `openid profile offline_access User.Read Mail.Read Tasks.Read`.

## ⚠️ PRÉ-REQUISITO QUE DEPENDE DE VOCÊ — App Registration no Microsoft Entra ID
Sem isto o login real não acontece (exatamente como o Client ID do Google). Passo a passo no **portal Azure / Entra**:

1. Acesse **https://entra.microsoft.com** → **Identity → Applications → App registrations → New registration**.
2. **Name**: `Tiron Tasks Mobile`.
3. **Supported account types**: escolha um (ver ADR-003):
   - "Accounts in any organizational directory **and personal Microsoft accounts**" (tenant `common`) — recomendado para abranger contas pessoais + corporativas.
4. **Redirect URI**: plataforma **"Mobile and desktop applications"** → adicione o URI:
   - `tirontasks://auth/microsoft` (custom scheme do app)
   - (Opcional, para testes no dev client) adicione também o que o `expo-auth-session` gerar — eu te informo o valor exato ao implementar.
5. Após criar, copie o **Application (client) ID**.
6. Em **API permissions** → **Add a permission** → **Microsoft Graph** → **Delegated permissions** → adicione: `User.Read`, `Mail.Read`, `Tasks.Read`, `offline_access`. (Não precisa admin consent para esses; o usuário consente no login.)
7. Em **Authentication** → marque **"Allow public client flows"** = **Yes** (necessário para mobile sem secret).
8. **Me envie o `Application (client) ID`** (e o tenant escolhido). **Não há client secret** em app mobile — não crie/forneça secret.

### O que vou fazer com isso
- Guardar o **Client ID** em config pública do app (`app.json extra` — não é segredo; o segredo é o PKCE, gerado por sessão).
- O redirect `tirontasks://auth/microsoft` já casa com o `scheme` do app (`tirontasks`).

## Decisões (ADR)
- **ADR-001**: OAuth Authorization Code + PKCE (não implicit, não ROPC, não Basic/IMAP/POP/SMTP/EWS). Motivo: recomendação oficial Microsoft para mobile public clients.
- **ADR-002 (e-mails flagged sem delta)**: delta de mensagens é por pasta e não combina com `$filter=flag/flagStatus`. Para read-only de flagged, usamos `GET /me/messages?$filter=flag/flagStatus eq 'flagged'&$select=...&$top=50` com paginação `@odata.nextLink` e watermark por `receivedDateTime` para reduzir refetch. **To Do usa delta** (deltaLink persistido) por ser nativamente suportado.
- **ADR-003 (tenant)**: usar `common` (pessoais + corporativas). Se a conta for só corporativa/educacional, trocar para `organizations`. Decisão final depende do tipo de conta do usuário (a confirmar).
- **ADR-004 (sem client secret)**: app mobile é public client; segurança vem do PKCE. Nenhum secret é embarcado.
- **ADR-005 (build necessária)**: `expo-auth-session`/`expo-web-browser` + redirect scheme exigem build nativa (não OTA puro).

## Segurança do fluxo
- PKCE S256 por sessão; `state` aleatório validado.
- Tokens só no Secure Store; nunca em AsyncStorage, SQLite ou logs.
- Refresh automático com folga (renova antes de expirar); falha → pedir reconexão.
- Logout/disconnect: revoga sessão local e apaga tokens.
