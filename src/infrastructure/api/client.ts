import { API_URL } from '@/lib/config';
import { SecureStorage } from '@/lib/secure-storage';

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = 'ApiError';
  }
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  skipAuth?: boolean;
};

// Module-level logout callback — set by auth store to break circular dependency
let _onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  _onUnauthorized = handler;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, skipAuth = false } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (!skipAuth) {
    const token = await SecureStorage.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    let detail = `Erro ${response.status}`;
    try {
      const errorBody = await response.json();
      // Laravel/FastAPI usam shapes diferentes: `detail` (FastAPI) ou
      // `message` + `errors` (validação 422). Tentamos o mais específico.
      const firstFieldError =
        errorBody?.errors && typeof errorBody.errors === 'object'
          ? (Object.values(errorBody.errors)[0] as unknown)
          : undefined;
      const firstFieldMessage = Array.isArray(firstFieldError)
        ? firstFieldError[0]
        : firstFieldError;
      detail =
        errorBody?.detail ??
        firstFieldMessage ??
        errorBody?.message ??
        detail;
    } catch {
      // ignore parse error
    }
    // Só dispara logout em 401 de chamadas autenticadas (não durante login)
    if (response.status === 401 && !skipAuth) {
      _onUnauthorized?.();
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

export const apiClient = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'GET' }),

  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'POST', body }),

  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PUT', body }),

  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method'>) =>
    request<T>(path, { ...opts, method: 'PATCH', body }),

  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    request<T>(path, { ...opts, method: 'DELETE' }),
};
