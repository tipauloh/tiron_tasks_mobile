// Microsoft 365 — logger estruturado e SEGURO.
//
// REGRA DE OURO (segurança): NUNCA registrar tokens (access/refresh/id),
// nem conteúdo de e-mail (subject, body, bodyPreview, from). Apenas metadados
// não sensíveis (contagens, ids opacos, status, timestamps).
//
// Os logs são prefixados por um "channel" para facilitar filtragem:
//   microsoft_auth | microsoft_sync | microsoft_graph | microsoft_cache

export type Ms365LogChannel =
  | 'microsoft_auth'
  | 'microsoft_sync'
  | 'microsoft_graph'
  | 'microsoft_cache';

/** Chaves consideradas sensíveis — redigidas automaticamente se aparecerem. */
const SENSITIVE_KEYS = [
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'idtoken',
  'id_token',
  'authorization',
  'password',
  'secret',
  'code',
  'code_verifier',
  'codeverifier',
  // conteúdo de e-mail
  'subject',
  'body',
  'bodypreview',
  'preview',
  'from',
  'emailfrom',
  'emailpreview',
  'title',
] as const;

function isSensitiveKey(key: string): boolean {
  const k = key.toLowerCase();
  return SENSITIVE_KEYS.some((s) => k === s || k.includes(s));
}

/**
 * Remove (redige) campos sensíveis de um objeto de contexto antes de logar.
 * Não faz deep-merge recursivo agressivo: redige no primeiro nível e em objetos
 * aninhados simples. Valores sensíveis viram '[REDACTED]'.
 */
export function redact(context: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!context) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(context)) {
    if (isSensitiveKey(key)) {
      out[key] = '[REDACTED]';
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = redact(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}

function emit(
  level: 'debug' | 'info' | 'warn' | 'error',
  channel: Ms365LogChannel,
  message: string,
  context?: Record<string, unknown>,
) {
  const payload = {
    channel,
    message,
    ...redact(context),
  };
  const line = `[${channel}] ${message}`;
  // Em produção, isto pode ser plugado a um serviço de telemetria.
  switch (level) {
    case 'error':
      console.error(line, payload);
      break;
    case 'warn':
      console.warn(line, payload);
      break;
    default:
      // info/debug
      if (typeof __DEV__ === 'undefined' || __DEV__) {
        console.log(line, payload);
      }
      break;
  }
}

export const ms365Logger = {
  debug: (channel: Ms365LogChannel, message: string, context?: Record<string, unknown>) =>
    emit('debug', channel, message, context),
  info: (channel: Ms365LogChannel, message: string, context?: Record<string, unknown>) =>
    emit('info', channel, message, context),
  warn: (channel: Ms365LogChannel, message: string, context?: Record<string, unknown>) =>
    emit('warn', channel, message, context),
  error: (channel: Ms365LogChannel, message: string, context?: Record<string, unknown>) =>
    emit('error', channel, message, context),
};
