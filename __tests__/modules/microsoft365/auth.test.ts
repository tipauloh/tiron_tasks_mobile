/**
 * Testes da camada de auth (OAuth PKCE): troca code→token e refresh.
 * Mocka fetch, expo-secure-store e expo-auth-session/web-browser/crypto.
 */

// ── Mocks de módulos nativos do Expo ────────────────────────────────────────

const secureStore: Record<string, string> = {};

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(async (k: string, v: string) => {
    secureStore[k] = v;
  }),
  getItemAsync: jest.fn(async (k: string) => secureStore[k] ?? null),
  deleteItemAsync: jest.fn(async (k: string) => {
    delete secureStore[k];
  }),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
}));

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'tirontasks://auth/microsoft'),
  ResponseType: { Code: 'code' },
  Prompt: { SelectAccount: 'select_account' },
  AuthRequest: jest.fn(),
}));

jest.mock('../../../src/lib/config', () => ({
  MICROSOFT_CLIENT_ID: 'test-client-id',
}));

import {
  exchangeCodeForTokens,
  getValidAccessToken,
  signOut,
  getRedirectUri,
  persistTokensForAccount,
  MicrosoftReauthRequiredError,
} from '../../../src/modules/microsoft365/auth';
import { SECURE_KEYS } from '../../../src/modules/microsoft365/constants';

// MULTI-CONTA: as chaves do Secure Store recebem o accountId como sufixo.
const ACC = 'acc-1';
// Separador '_' (o ':' é inválido para chaves do expo-secure-store).
const ACCESS_KEY = `${SECURE_KEYS.accessToken}_${ACC}`;
const REFRESH_KEY = `${SECURE_KEYS.refreshToken}_${ACC}`;
const EXP_KEY = `${SECURE_KEYS.accessToken}_${ACC}_exp`;

function clearStore() {
  for (const k of Object.keys(secureStore)) delete secureStore[k];
}

function mockFetchOnce(status: number, body: unknown) {
  (global.fetch as any).mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

beforeEach(() => {
  clearStore();
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

describe('auth.getRedirectUri', () => {
  it('resolve para o custom scheme tirontasks://auth/microsoft', () => {
    expect(getRedirectUri()).toBe('tirontasks://auth/microsoft');
  });
});

describe('auth.exchangeCodeForTokens', () => {
  it('troca code + verifier por tokens e NÃO persiste (accountId desconhecido)', async () => {
    mockFetchOnce(200, {
      access_token: 'AT-1',
      refresh_token: 'RT-1',
      expires_in: 3600,
    });

    const tokens = await exchangeCodeForTokens('the-code', 'the-verifier', 'tirontasks://auth/microsoft');

    expect(tokens.accessToken).toBe('AT-1');
    expect(tokens.refreshToken).toBe('RT-1');
    // NÃO persiste — quem persiste é persistTokensForAccount após o /me.
    expect(secureStore[ACCESS_KEY]).toBeUndefined();

    // Verifica que o POST usou authorization_code SEM client_secret.
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/oauth2/v2.0/token');
    expect(init.method).toBe('POST');
    expect(init.body).toContain('grant_type=authorization_code');
    expect(init.body).toContain('code_verifier=the-verifier');
    expect(init.body).not.toContain('client_secret');
  });

  it('lança erro quando o token endpoint retorna erro OAuth', async () => {
    mockFetchOnce(400, { error: 'invalid_grant', error_description: 'bad' });
    await expect(
      exchangeCodeForTokens('x', 'y', 'tirontasks://auth/microsoft'),
    ).rejects.toThrow('invalid_grant');
    expect(secureStore[ACCESS_KEY]).toBeUndefined();
  });
});

describe('auth.persistTokensForAccount', () => {
  it('persiste os tokens da conta nas chaves por accountId', async () => {
    await persistTokensForAccount(ACC, {
      accessToken: 'AT-1',
      refreshToken: 'RT-1',
      expiresAt: Date.now() + 3600_000,
    });
    expect(secureStore[ACCESS_KEY]).toBe('AT-1');
    expect(secureStore[REFRESH_KEY]).toBe('RT-1');
    expect(Number(secureStore[EXP_KEY])).toBeGreaterThan(Date.now());
  });
});

describe('auth.getValidAccessToken', () => {
  it('retorna o token atual quando ainda válido (sem refresh)', async () => {
    secureStore[ACCESS_KEY] = 'AT-valid';
    secureStore[REFRESH_KEY] = 'RT-1';
    secureStore[EXP_KEY] = String(Date.now() + 10 * 60 * 1000);

    const token = await getValidAccessToken(ACC);
    expect(token).toBe('AT-valid');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renova via refresh_token quando expirado', async () => {
    secureStore[ACCESS_KEY] = 'AT-old';
    secureStore[REFRESH_KEY] = 'RT-old';
    secureStore[EXP_KEY] = String(Date.now() - 1000); // expirado

    mockFetchOnce(200, {
      access_token: 'AT-new',
      refresh_token: 'RT-new',
      expires_in: 3600,
    });

    const token = await getValidAccessToken(ACC);
    expect(token).toBe('AT-new');
    expect(secureStore[ACCESS_KEY]).toBe('AT-new');
    expect(secureStore[REFRESH_KEY]).toBe('RT-new');

    const [, init] = (global.fetch as any).mock.calls[0];
    expect(init.body).toContain('grant_type=refresh_token');
    expect(init.body).toContain('refresh_token=RT-old');
  });

  it('preserva o refresh token anterior se o /token não rotacionar', async () => {
    secureStore[ACCESS_KEY] = 'AT-old';
    secureStore[REFRESH_KEY] = 'RT-keep';
    secureStore[EXP_KEY] = String(Date.now() - 1000);

    mockFetchOnce(200, { access_token: 'AT-new2', expires_in: 3600 });

    await getValidAccessToken(ACC);
    expect(secureStore[REFRESH_KEY]).toBe('RT-keep');
  });

  it('limpa tokens da conta e exige reconexão quando o refresh falha', async () => {
    secureStore[ACCESS_KEY] = 'AT-old';
    secureStore[REFRESH_KEY] = 'RT-bad';
    secureStore[EXP_KEY] = String(Date.now() - 1000);

    mockFetchOnce(400, { error: 'invalid_grant' });

    await expect(getValidAccessToken(ACC)).rejects.toBeInstanceOf(MicrosoftReauthRequiredError);
    expect(secureStore[ACCESS_KEY]).toBeUndefined();
    expect(secureStore[REFRESH_KEY]).toBeUndefined();
  });

  it('exige reconexão quando não há sessão', async () => {
    await expect(getValidAccessToken(ACC)).rejects.toBeInstanceOf(MicrosoftReauthRequiredError);
  });
});

describe('auth.signOut', () => {
  it('apaga os tokens da conta do secure store', async () => {
    secureStore[ACCESS_KEY] = 'AT';
    secureStore[REFRESH_KEY] = 'RT';
    secureStore[EXP_KEY] = '123';
    await signOut(ACC);
    expect(secureStore[ACCESS_KEY]).toBeUndefined();
    expect(secureStore[REFRESH_KEY]).toBeUndefined();
    expect(secureStore[EXP_KEY]).toBeUndefined();
  });
});
