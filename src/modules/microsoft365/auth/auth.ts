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

// ── Persistência de tokens (Secure Store) — POR CONTA (accountId) ───────────
//
// MULTI-CONTA: as chaves do Secure Store recebem o accountId como sufixo, de
// modo que cada conta Microsoft conectada tem seu próprio par access/refresh.

export interface StoredTokens {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number; // epoch ms
}

// As chaves do expo-secure-store SÓ aceitam [A-Za-z0-9._-] (sem ':' ou outros).
// Por isso o separador é '_' e o id é sanitizado.
function safeAccountId(accountId: string): string {
  return accountId.replace(/[^A-Za-z0-9._-]/g, '_');
}
/** Chave do access token de uma conta. */
function accessKey(accountId: string): string {
  return `${SECURE_KEYS.accessToken}_${safeAccountId(accountId)}`;
}
/** Chave do refresh token de uma conta. */
function refreshKey(accountId: string): string {
  return `${SECURE_KEYS.refreshToken}_${safeAccountId(accountId)}`;
}
/** Chave da expiração (não sensível) do access token de uma conta. */
function expKey(accountId: string): string {
  return `${SECURE_KEYS.accessToken}_${safeAccountId(accountId)}_exp`;
}

async function persistTokens(accountId: string, tokens: StoredTokens): Promise<void> {
  await SecureStore.setItemAsync(accessKey(accountId), tokens.accessToken);
  if (tokens.refreshToken) {
    await SecureStore.setItemAsync(refreshKey(accountId), tokens.refreshToken);
  }
  // expiresAt não é sensível, mas mantemos junto dos tokens por coesão.
  await SecureStore.setItemAsync(expKey(accountId), String(tokens.expiresAt));
}

/**
 * Persiste os tokens de uma conta. Exportado porque o `connect()` só conhece o
 * accountId DEPOIS do signIn (via GET /me) — ver service.connect().
 */
export async function persistTokensForAccount(
  accountId: string,
  tokens: StoredTokens,
): Promise<void> {
  await persistTokens(accountId, tokens);
}

async function readStoredTokens(accountId: string): Promise<StoredTokens | null> {
  const accessToken = await SecureStore.getItemAsync(accessKey(accountId));
  if (!accessToken) return null;
  const refreshToken = await SecureStore.getItemAsync(refreshKey(accountId));
  const expRaw = await SecureStore.getItemAsync(expKey(accountId));
  const expiresAt = expRaw ? Number(expRaw) : 0;
  return { accessToken, refreshToken, expiresAt };
}

/** Apaga os tokens de UMA conta do Secure Store (logout / falha irreversível). */
export async function signOut(accountId: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(accessKey(accountId)),
    SecureStore.deleteItemAsync(refreshKey(accountId)),
    SecureStore.deleteItemAsync(expKey(accountId)),
  ]);
  ms365Logger.info('microsoft_auth', 'tokens removidos do secure store', { accountId });
}

/** True se há um access token armazenado para a conta (mesmo expirado — pode renovar). */
export async function hasStoredSession(accountId: string): Promise<boolean> {
  const tokens = await readStoredTokens(accountId);
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
 * NÃO persiste — o accountId só é conhecido após o GET /me. Retorna os tokens.
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
  ms365Logger.info('microsoft_auth', 'code trocado por tokens com sucesso');
  return tokens;
}

/**
 * Renova o access token de uma conta usando o refresh token. Em falha, limpa os
 * tokens DESSA conta e lança MicrosoftReauthRequiredError (UI pede reconexão).
 */
async function refreshAccessToken(
  accountId: string,
  refreshToken: string,
): Promise<StoredTokens> {
  let data: TokenResponse;
  try {
    data = await postToken({
      client_id: MICROSOFT_CLIENT_ID,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      scope: MS_SCOPES.join(' '),
    });
  } catch {
    await signOut(accountId);
    throw new MicrosoftReauthRequiredError();
  }
  const tokens = tokenResponseToStored(data, refreshToken);
  await persistTokens(accountId, tokens);
  ms365Logger.info('microsoft_auth', 'access token renovado via refresh', { accountId });
  return tokens;
}

/**
 * Retorna um access token válido PARA A CONTA. Se estiver expirado (ou perto de
 * expirar), renova automaticamente via refresh_token. Se não houver sessão ou o
 * refresh falhar, lança MicrosoftReauthRequiredError.
 */
export async function getValidAccessToken(accountId: string): Promise<string> {
  const tokens = await readStoredTokens(accountId);
  if (!tokens) {
    throw new MicrosoftReauthRequiredError('Nenhuma sessão Microsoft ativa.');
  }
  const stillValid = tokens.expiresAt - TOKEN_REFRESH_SKEW_MS > Date.now();
  if (stillValid) {
    return tokens.accessToken;
  }
  if (!tokens.refreshToken) {
    await signOut(accountId);
    throw new MicrosoftReauthRequiredError();
  }
  const refreshed = await refreshAccessToken(accountId, tokens.refreshToken);
  return refreshed.accessToken;
}

/** Timestamp (epoch ms) de expiração do access token da conta, ou null. */
export async function getTokenExpiresAt(accountId: string): Promise<number | null> {
  const tokens = await readStoredTokens(accountId);
  return tokens?.expiresAt ?? null;
}

// ── Fluxo interativo de login (PKCE) ───────────────────────────────────────

/**
 * Roda o fluxo OAuth interativo (abre navegador do sistema) e troca o code por
 * tokens. NÃO persiste — o accountId só é conhecido após o GET /me. Retorna os
 * tokens (access + refresh + expiração) para o service persistir por conta.
 *
 * Lança MicrosoftAuthError se o usuário cancelar ou houver erro.
 */
export async function signIn(): Promise<StoredTokens> {
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
  return tokens;
}
