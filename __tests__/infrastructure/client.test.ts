/**
 * Testes unitários do API client (src/infrastructure/api/client.ts).
 * Cobre: headers corretos, tratamento de 401, erros de rede, métodos HTTP.
 */

// ---------------------------------------------------------------------------
// Mocks — ANTES dos imports
// ---------------------------------------------------------------------------

const mockGetToken = jest.fn<Promise<string | null>, []>();

jest.mock('@/lib/secure-storage', () => ({
  SecureStorage: {
    getToken: (...args: unknown[]) => mockGetToken(...(args as [])),
    setToken: jest.fn(),
    clearToken: jest.fn(),
  },
}));

jest.mock('@/lib/config', () => ({
  API_URL: 'https://api.test.com',
}));

// ---------------------------------------------------------------------------
// fetch mock global
// ---------------------------------------------------------------------------

const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

// AbortSignal.timeout mock
if (!AbortSignal.timeout) {
  (AbortSignal as unknown as Record<string, unknown>).timeout = (_ms: number) => ({
    aborted: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    onabort: null,
    reason: undefined,
    throwIfAborted: jest.fn(),
  } as unknown as AbortSignal);
}

// ---------------------------------------------------------------------------
// Imports após mocks
// ---------------------------------------------------------------------------

import { apiClient, setUnauthorizedHandler, ApiError } from '../../src/infrastructure/api/client';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResponse(
  body: unknown,
  status = 200,
  ok = true,
): Partial<Response> {
  return {
    ok,
    status,
    json: jest.fn().mockResolvedValue(body),
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue(null);
});

// ---------------------------------------------------------------------------
// Headers
// ---------------------------------------------------------------------------

describe('headers da requisição', () => {
  it('inclui Content-Type e Accept como application/json', async () => {
    mockFetch.mockResolvedValue(makeResponse({ data: 'ok' }));

    await apiClient.get('/test');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['Accept']).toBe('application/json');
  });

  it('inclui Authorization quando há token armazenado', async () => {
    mockGetToken.mockResolvedValue('my-token-123');
    mockFetch.mockResolvedValue(makeResponse({ data: 'ok' }));

    await apiClient.get('/test');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer my-token-123');
  });

  it('não inclui Authorization quando não há token', async () => {
    mockGetToken.mockResolvedValue(null);
    mockFetch.mockResolvedValue(makeResponse({ data: 'ok' }));

    await apiClient.get('/test');

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('não inclui Authorization quando skipAuth=true', async () => {
    mockGetToken.mockResolvedValue('my-token');
    mockFetch.mockResolvedValue(makeResponse({ data: 'ok' }));

    await apiClient.get('/test', { skipAuth: true });

    const callArgs = mockFetch.mock.calls[0];
    const headers = callArgs[1].headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// URL e método
// ---------------------------------------------------------------------------

describe('URL e método', () => {
  it('constrói a URL completa com base na API_URL', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiClient.get('/api/v1/tasks');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/api/v1/tasks',
      expect.any(Object),
    );
  });

  it('usa GET por padrão', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiClient.get('/path');

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].method).toBe('GET');
  });

  it('usa POST para apiClient.post', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiClient.post('/path', { name: 'test' });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].method).toBe('POST');
    expect(callArgs[1].body).toBe(JSON.stringify({ name: 'test' }));
  });

  it('usa PUT para apiClient.put', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiClient.put('/path', { name: 'updated' });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].method).toBe('PUT');
  });

  it('usa PATCH para apiClient.patch', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiClient.patch('/path', { status: 'done' });

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].method).toBe('PATCH');
  });

  it('usa DELETE para apiClient.delete', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiClient.delete('/path');

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].method).toBe('DELETE');
    expect(callArgs[1].body).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Respostas HTTP
// ---------------------------------------------------------------------------

describe('respostas HTTP', () => {
  it('retorna o corpo JSON em respostas 200', async () => {
    const responseBody = { data: { id: 1, title: 'Task' } };
    mockFetch.mockResolvedValue(makeResponse(responseBody));

    const result = await apiClient.get('/tasks/1');

    expect(result).toEqual(responseBody);
  });

  it('retorna undefined para respostas 204', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 204, json: jest.fn() });

    const result = await apiClient.delete('/tasks/1');

    expect(result).toBeUndefined();
  });

  it('lança ApiError com status e detalhe para respostas de erro', async () => {
    const errorBody = { detail: 'Tarefa não encontrada' };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 404,
      json: jest.fn().mockResolvedValue(errorBody),
    });

    await expect(apiClient.get('/tasks/999')).rejects.toMatchObject({
      name: 'ApiError',
      status: 404,
      detail: 'Tarefa não encontrada',
    });
  });

  it('usa mensagem padrão quando o body de erro não tem campo detail', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(apiClient.get('/fail')).rejects.toMatchObject({
      status: 500,
      detail: 'Erro 500',
    });
  });

  it('usa mensagem padrão quando o body de erro não é JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: jest.fn().mockRejectedValue(new SyntaxError('Invalid JSON')),
    });

    await expect(apiClient.get('/fail')).rejects.toMatchObject({
      status: 503,
      detail: 'Erro 503',
    });
  });
});

// ---------------------------------------------------------------------------
// 401 — chama unauthorizedHandler
// ---------------------------------------------------------------------------

describe('status 401', () => {
  it('chama o unauthorizedHandler registrado', async () => {
    const onUnauthorized = jest.fn();
    setUnauthorizedHandler(onUnauthorized);

    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: jest.fn(),
    });

    await expect(apiClient.get('/protected')).rejects.toMatchObject({
      status: 401,
    });

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });

  it('lança ApiError mesmo com handler configurado', async () => {
    setUnauthorizedHandler(jest.fn());
    mockFetch.mockResolvedValue({ ok: false, status: 401, json: jest.fn() });

    await expect(apiClient.get('/protected')).rejects.toBeInstanceOf(ApiError);
  });
});

// ---------------------------------------------------------------------------
// Erros de rede
// ---------------------------------------------------------------------------

describe('erros de rede', () => {
  it('propaga TypeError quando fetch lança (sem conexão)', async () => {
    const networkError = new TypeError('Failed to fetch');
    mockFetch.mockRejectedValue(networkError);

    await expect(apiClient.get('/any')).rejects.toThrow('Failed to fetch');
  });

  it('propaga AbortError quando a requisição é cancelada', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    mockFetch.mockRejectedValue(abortError);

    await expect(apiClient.get('/any')).rejects.toThrow('Aborted');
  });
});

// ---------------------------------------------------------------------------
// ApiError class
// ---------------------------------------------------------------------------

describe('ApiError', () => {
  it('é uma instância de Error', () => {
    const err = new ApiError(400, 'Bad request');
    expect(err).toBeInstanceOf(Error);
  });

  it('tem name, status e detail corretos', () => {
    const err = new ApiError(422, 'Validation error');
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(422);
    expect(err.detail).toBe('Validation error');
    expect(err.message).toBe('Validation error');
  });
});
