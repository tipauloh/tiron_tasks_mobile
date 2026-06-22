// Microsoft 365 — cliente HTTP do Microsoft Graph (read-only).
//
// SEGURANÇA: o Authorization: Bearer é injetado aqui e NUNCA logado. Nenhum
// corpo de e-mail é logado. Em 401 tenta renovar o token 1x; respeita 429
// (Retry-After) com backoff; segue paginação @odata.nextLink.

import { GRAPH_BASE } from '../constants';
import { getValidAccessToken, MicrosoftReauthRequiredError } from '../auth';
import { ms365Logger } from '../utils/logger';
import type { GraphCollection } from '../types';

/** Erro do Graph com status HTTP e código (ex.: 'ErrorAccessDenied'). Não-sensível. */
export class GraphError extends Error {
  constructor(
    public readonly status: number,
    public readonly graphCode: string | null,
  ) {
    super(`Graph HTTP ${status}${graphCode ? ` (${graphCode})` : ''}`);
    this.name = 'GraphError';
  }
}

/** Máximo de retentativas por throttling (429/503) antes de desistir. */
const MAX_RETRIES = 3;
/** Backoff base quando o Retry-After não vem no header (ms). */
const DEFAULT_BACKOFF_MS = 1000;

function toAbsoluteUrl(path: string): string {
  // nextLink já vem absoluto; paths relativos recebem o GRAPH_BASE.
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${GRAPH_BASE}${path.startsWith('/') ? '' : '/'}${path}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfter(res: Response, attempt: number): number {
  const header = res.headers.get('Retry-After');
  if (header) {
    const seconds = Number(header);
    if (!Number.isNaN(seconds)) return seconds * 1000;
  }
  // Backoff exponencial como fallback.
  return DEFAULT_BACKOFF_MS * 2 ** attempt;
}

/**
 * GET autenticado a um endpoint do Graph. Retorna o JSON parseado.
 * `path` pode ser relativo ao GRAPH_BASE ou um nextLink/deltaLink absoluto.
 */
export async function graphGet<T = unknown>(path: string): Promise<T> {
  const url = toAbsoluteUrl(path);
  let triedRefresh = false;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const accessToken = await getValidAccessToken();
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (res.ok) {
      return (await res.json()) as T;
    }

    // 401: token possivelmente inválido — força refresh 1x e repete.
    if (res.status === 401 && !triedRefresh) {
      triedRefresh = true;
      ms365Logger.warn('microsoft_graph', '401 recebido, tentando refresh', {
        endpoint: redactUrl(url),
      });
      // getValidAccessToken já renova se expirado; aqui forçamos próxima iteração
      // a reavaliar. Para garantir refresh mesmo se "ainda válido", limpamos a
      // folga via uma chamada explícita não é necessário: o 401 indica revogação,
      // então o caminho seguro é pedir reconexão se persistir.
      continue;
    }

    // 429 / 503: throttling — respeita Retry-After com backoff.
    if ((res.status === 429 || res.status === 503) && attempt < MAX_RETRIES) {
      const waitMs = parseRetryAfter(res, attempt);
      ms365Logger.warn('microsoft_graph', 'throttled, aguardando para retry', {
        status: res.status,
        waitMs,
        attempt,
      });
      await sleep(waitMs);
      continue;
    }

    if (res.status === 401) {
      // Refresh já tentado e ainda 401 → sessão inválida.
      throw new MicrosoftReauthRequiredError();
    }

    // Extrai o código de erro do Graph (ex.: 'ErrorAccessDenied') — não-sensível.
    let graphCode: string | null = null;
    try {
      const body = (await res.json()) as { error?: { code?: string } };
      graphCode = body?.error?.code ?? null;
    } catch {
      // corpo não-JSON; ignora
    }
    ms365Logger.error('microsoft_graph', 'erro na chamada ao Graph', {
      status: res.status,
      graphCode,
      endpoint: redactUrl(url),
    });
    throw new GraphError(res.status, graphCode);
  }

  throw new Error('Graph GET falhou após retries de throttling.');
}

/**
 * GET com paginação automática: segue @odata.nextLink e concatena `value`.
 * Use para coleções (mensagens, tarefas) sem delta.
 */
export async function graphGetAllPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = path;
  let pages = 0;
  while (next) {
    const page: GraphCollection<T> = await graphGet<GraphCollection<T>>(next);
    if (page.value?.length) items.push(...page.value);
    next = page['@odata.nextLink'];
    pages += 1;
  }
  ms365Logger.debug('microsoft_graph', 'paginação concluída', { pages, count: items.length });
  return items;
}

/**
 * GET delta: segue nextLink até obter o deltaLink final. Retorna os itens
 * acumulados + o deltaLink para a próxima sincronização incremental.
 */
export async function graphGetDelta<T>(
  path: string,
): Promise<{ items: T[]; deltaLink: string | null }> {
  const items: T[] = [];
  let next: string | undefined = path;
  let deltaLink: string | null = null;
  while (next) {
    const page: GraphCollection<T> = await graphGet<GraphCollection<T>>(next);
    if (page.value?.length) items.push(...page.value);
    if (page['@odata.deltaLink']) {
      deltaLink = page['@odata.deltaLink'];
      break;
    }
    next = page['@odata.nextLink'];
  }
  return { items, deltaLink };
}

/** Remove query string sensível de uma URL para log (mantém só host+path). */
function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return '[url]';
  }
}
