// Microsoft 365 — barrel da camada de auth.

export {
  signIn,
  signOut,
  getValidAccessToken,
  getTokenExpiresAt,
  hasStoredSession,
  getRedirectUri,
  exchangeCodeForTokens,
  MicrosoftAuthError,
  MicrosoftReauthRequiredError,
} from './auth';
