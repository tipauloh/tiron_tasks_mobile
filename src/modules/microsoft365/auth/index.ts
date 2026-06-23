// Microsoft 365 — barrel da camada de auth.

export {
  signIn,
  signOut,
  getValidAccessToken,
  getTokenExpiresAt,
  hasStoredSession,
  persistTokensForAccount,
  readStoredTokens,
  getRedirectUri,
  exchangeCodeForTokens,
  MicrosoftAuthError,
  MicrosoftReauthRequiredError,
  type StoredTokens,
} from './auth';
