import { WEB_URL } from '@/lib/config';

// Cliente dedicado para os endpoints de recuperação de senha do app_web
// (Laravel). Esses endpoints vivem em WEB_URL (NÃO na API_URL/FastAPI), por
// isso não reutilizamos o apiClient padrão.

export class PasswordRecoveryError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly errors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'PasswordRecoveryError';
  }
}

interface ForgotResponse {
  message: string;
}

interface ResetResponse {
  message: string;
}

async function postWeb<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${WEB_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });

  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    // resposta sem corpo JSON
  }

  if (!response.ok) {
    const data = parsed as
      | { message?: string; errors?: Record<string, string[]> }
      | null;
    const firstFieldError = data?.errors
      ? (Object.values(data.errors)[0]?.[0] as string | undefined)
      : undefined;
    const message =
      firstFieldError ??
      data?.message ??
      `Erro ${response.status}`;
    throw new PasswordRecoveryError(response.status, message, data?.errors);
  }

  return parsed as T;
}

export const passwordRecoveryApi = {
  // Sempre retorna 200 { message } (não revela se o e-mail existe).
  async forgot(email: string): Promise<ForgotResponse> {
    return postWeb<ForgotResponse>('/api/mobile/password/forgot', { email });
  },

  // token = código recebido por e-mail. 200 { message } ou 422 { message, errors }.
  async reset(
    email: string,
    token: string,
    password: string,
  ): Promise<ResetResponse> {
    return postWeb<ResetResponse>('/api/mobile/password/reset', {
      email,
      token,
      password,
    });
  },
};
