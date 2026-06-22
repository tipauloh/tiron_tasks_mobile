// Microsoft 365 — autenticação OAuth 2.0 Authorization Code + PKCE.
//
// Public client (app mobile): NÃO há client_secret. A segurança vem do PKCE
// (code_verifier por sessão). Tokens vivem APENAS no Secure Store; nunca em
// SQLite, AsyncStorage ou logs.
//
// ⚠️ Requer BUILD nativa (expo-auth-session + expo-web-browser + custom scheme).
// Não funciona em OTA puro nem no Expo Go web.

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';

import {
  MS_AUTHORIZE_ENDPOINT,
  MS_TOKEN_ENDPOINT,
  MS_SCOPES,
  MS_REDIRECT_PATH,
  SECURE_KEYS,
} from '../constants';
import { MICROSOFT_CLIENT_ID } from '../../../lib/config';
import { ms365Logger } from '../utils/logger';

// Garante que o navegador do sistema feche corretamente ao voltar (deep link).
WebBrowser.maybeCompleteAuthSession();

/** Folga (ms) para renovar o access token ANTES de expirar de fato. */
const TOKEN_REFRESH_SKEW_MS = 60 * 1000; // 1 min

/** Endpoints OAuth para o expo-auth-session. */
const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: MS_AUTHORIZE_ENDPOINT,
  tokenEndpoint: MS_TOKEN_ENDPOINT,
};

/** Erro que sinaliza à UI que o usuário precisa reconectar (refresh falhou). */
export class MicrosoftReauthRequiredError extends Error {
  constructor(message = 'Sessão Microsoft expirada. Reconecte sua conta.') {
    super(message);
    this.name = 'MicrosoftReauthRequiredError';
  }
}

/** Erro genérico de autenticação (cancelamento, falha de rede no /token, etc.). */
export class MicrosoftAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MicrosoftAuthError';
  }
}

/**
 * Redirect URI do app. Em build standalone resolve para o custom scheme
 * `tirontasks://auth/microsoft`. No dev client / proxy pode diferir — o valor
 * exato é logado para você cadastrar no App Registration.
 */
export function getRedirectUri(): string {
  return AuthSession.makeRedirectUri({
    scheme: 'tirontasks',
    path: MS_REDIRECT_PATH,
  });
}

// ── Persistência de tokens (Secure Store) ──────────────────────────────────

interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
}

async function persistTokens(tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(SECURE_KEYS.accessToken, tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(SECURE_KEYS.refreshToken, tokens.refreshToken);
  }
  // expiresAt não é sensível, mas mantemos junto dos tokens por coesão.
  await SecureStore.setItemAsync(
    `${SECURE_KEYS.accessToken}_exp`,
    String(tokens.expiresAt),
  );
}

async function readStoredTokens(): Promise<StoredTokens | null> {
  const accessToken = await SecureStore.getItemAsync(SECURE_KEYS.accessToken);
  if (!accessToken) return null;
  const refreshToken = await SecureStore.getItemAsync(SECURE_KEYS.refreshToken);
  const expRaw = await SecureStore.getItemAsync(`${SECURE_KEYS.accessToken}_exp`);
  const expiresAt = expRaw ? Number(expRaw) : 0;
  return { accessToken, refreshToken, expiresAt };
}

/** Apaga TODOS os tokens do Secure Store (logout / falha irreversível). */
export async function signOut(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SECURE_KEYS.accessToken),
    SecureStore.deleteItemAsync(SECURE_KEYS.refreshToken),
    SecureStore.deleteItemAsync(`${SECURE_KEYS.accessToken}_exp`),
  ]);
  ms365Logger.info('microsoft_auth', 'tokens removidos do secure store');
}

/** True se há um access token armazenado (mesmo que expirado — pode renovar). */
export async function hasStoredSession(): Promise<boolean> {
  const tokens = await readStoredTokens();
  return tokens != null;
}

// ── Token endpoint (troca de code e refresh) ───────────────────────────────

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number; // segundos
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

function tokenResponseToStored(data: TokenResponse, prevRefresh?: string | null): StoredTokens {
  const expiresInMs = (data.expires_in ?? 3600) * 1000;
  return {
    accessToken: data.access_token,
    // O Microsoft pode (ou não) rotacionar o refresh token; preserva o anterior.
    refreshToken: data.refresh_token ?? prevRefresh ?? null,
    expiresAt: Date.now() + expiresInMs,
  };
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const form = new URLSearchParams(body).toString();
  const res = await fetch(MS_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });
  const data = (await res.json()) as TokenResponse;
  if (!res.ok || data.error) {
    // NUNCA logar body/token — apenas status e código de erro do OAuth.
    ms365Logger.error('microsoft_auth', 'falha no token endpoint', {
      status: res.status,
      oauthError: data.error ?? 'unknown',
    });
    throw new MicrosoftAuthError(data.error ?? `token endpoint HTTP ${res.status}`);
  }
  return data;
}

/**
 * Troca authorization code + code_verifier por tokens (sem client_secret).
 * Exportado para teste unitário (mock de fetch).
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<StoredTokens> {
  const data = await postToken({
    client_id: MICROSOFT_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    scope: MS_SCOPES.join(' '),
  });
  const tokens = tokenResponseToStored(data);
  await persistTokens(tokens);
  ms365Logger.info('microsoft_auth', 'code trocado por tokens com sucesso');
  return tokens;
}

/**
 * Renova o access token usando o refresh token. Em falha, limpa tudo e lança
 * MicrosoftReauthRequiredError (UI deve pedir reconexão).
 */
async function refreshAccessToken(refreshToken: string): Promise<StoredTokens> {
  let data: TokenResponse;
  try {
    data = await postToken({
      client_id: MICROSOFT_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: MS_SCOPES.join(' '),
    });
  } catch {
    await signOut();
    throw new MicrosoftReauthRequiredError();
  }
  const tokens = tokenResponseToStored(data, refreshToken);
  await persistTokens(tokens);
  ms365Logger.info('microsoft_auth', 'access token renovado via refresh');
  return tokens;
}

/**
 * Retorna um access token válido. Se estiver expirado (ou perto de expirar),
 * renova automaticamente via refresh_token. Se não houver sessão ou o refresh
 * falhar, lança MicrosoftReauthRequiredError.
 */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await readStoredTokens();
  if (!tokens) {
    throw new MicrosoftReauthRequiredError('Nenhuma sessão Microsoft ativa.');
  }
  const stillValid = tokens.expiresAt - TOKEN_REFRESH_SKEW_MS > Date.now();
  if (stillValid) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    await signOut();
    throw new MicrosoftReauthRequiredError();
  }
  const refreshed = await refreshAccessToken(tokens.refreshToken);
  return refreshed.accessToken;
}

/** Timestamp (epoch ms) de expiração do access token atual, ou null. */
export async function getTokenExpiresAt(): Promise<number | null> {
  const tokens = await readStoredTokens();
  return tokens?.expiresAt ?? null;
}

// ── Fluxo interativo de login (PKCE) ───────────────────────────────────────

/**
 * Roda o fluxo OAuth interativo (abre navegador do sistema), troca o code por
 * tokens e os persiste. Retorna o access token + a expiração.
 *
 * Lança MicrosoftAuthError se o usuário cancelar ou houver erro.
 */
export async function signIn(): Promise<{ accessToken: string; expiresAt: number }> {
  if (!MICROSOFT_CLIENT_ID) {
    throw new MicrosoftAuthError('microsoftClientId ausente em app.json extra.');
  }

  const redirectUri = getRedirectUri();
  ms365Logger.info('microsoft_auth', 'iniciando login OAuth', { redirectUri });

  const request = new AuthSession.AuthRequest({
    clientId: MICROSOFT_CLIENT_ID,
    scopes: [...MS_SCOPES],
    redirectUri,
    usePKCE: true,
    responseType: AuthSession.ResponseType.Code,
    // prompt 'select_account' melhora UX ao trocar de conta.
    prompt: AuthSession.Prompt.SelectAccount,
  });

  await request.makeAuthUrlAsync(DISCOVERY);
  const result = await request.promptAsync(DISCOVERY);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    throw new MicrosoftAuthError('Login cancelado pelo usuário.');
  }
  if (result.type === 'error') {
    ms365Logger.error('microsoft_auth', 'erro no authorize', {
      oauthError: result.error?.code ?? 'unknown',
    });
    throw new MicrosoftAuthError(result.error?.code ?? 'Falha na autorização.');
  }
  if (result.type !== 'success' || !result.params.code) {
    throw new MicrosoftAuthError('Resposta de autorização inválida.');
  }

  const codeVerifier = request.codeVerifier;
  if (!codeVerifier) {
    throw new MicrosoftAuthError('code_verifier ausente (PKCE).');
  }

  const tokens = await exchangeCodeForTokens(result.params.code, codeVerifier, redirectUri);
  return { accessToken: tokens.accessToken, expiresAt: tokens.expiresAt };
}
