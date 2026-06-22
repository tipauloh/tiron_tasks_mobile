/**
 * Testes do cliente Graph (paginação, delta, 401, 429) e do fluxo de delta
 * do To Do (persistência de deltaLink + reuso). fetch e auth mockados.
 */

// auth: getValidAccessToken sempre retorna um token fake; sem rede de auth.
jest.mock('../../../src/modules/microsoft365/auth', () => {
  class MicrosoftReauthRequiredError extends Error {
    constructor(m = 'reauth') {
      super(m);
      this.name = 'MicrosoftReauthRequiredError';
    }
  }
  return {
    getValidAccessToken: jest.fn(async () => 'fake-access-token'),
    MicrosoftReauthRequiredError,
  };
});

// delta-token-repository em memória (evita SQLite). MULTI-CONTA: chave por (accountId, scope).
const deltaStore: Record<string, string> = {};
const deltaKey = (accountId: string, scope: string) => `${accountId}::${scope}`;
jest.mock('../../../src/modules/microsoft365/repositories', () => ({
  deltaTokenRepository: {
    getDeltaToken: jest.fn(
      (accountId: string, scope: string) => deltaStore[`${accountId}::${scope}`] ?? null,
    ),
    setDeltaToken: jest.fn((accountId: string, scope: string, link: string) => {
      deltaStore[`${accountId}::${scope}`] = link;
    }),
    clearDeltaToken: jest.fn(),
  },
}));

import {
  graphGet,
  graphGetAllPages,
  graphGetDelta,
} from '../../../src/modules/microsoft365/graph/client';
import { fetchTodoListsAndTasks, me } from '../../../src/modules/microsoft365/graph/todo';
import { fetchFlaggedEmails } from '../../../src/modules/microsoft365/graph/mail';
import { MicrosoftReauthRequiredError } from '../../../src/modules/microsoft365/auth';
import { getValidAccessToken } from '../../../src/modules/microsoft365/auth';

function res(status: number, body: unknown, headers: Record<string, string> = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    headers: { get: (k: string) => headers[k] ?? null },
  };
}

beforeEach(() => {
  for (const k of Object.keys(deltaStore)) delete deltaStore[k];
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

describe('graphGet', () => {
  it('injeta Authorization Bearer e retorna o JSON', async () => {
    (global.fetch as any).mockResolvedValueOnce(res(200, { ok: 1 }));
    const data = await graphGet<{ ok: number }>('/me', 'acc-1');
    expect(data.ok).toBe(1);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('https://graph.microsoft.com/v1.0/me');
    expect(init.headers.Authorization).toBe('Bearer fake-access-token');
  });

  it('em 401 persistente pede reconexão', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(res(401, {}))
      .mockResolvedValueOnce(res(401, {}));
    await expect(graphGet('/me', 'acc-1')).rejects.toBeInstanceOf(MicrosoftReauthRequiredError);
  });

  it('respeita 429 Retry-After e depois sucede', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(res(429, {}, { 'Retry-After': '0' }))
      .mockResolvedValueOnce(res(200, { ok: 2 }));
    const data = await graphGet<{ ok: number }>('/me', 'acc-1');
    expect(data.ok).toBe(2);
    expect((global.fetch as any).mock.calls.length).toBe(2);
  });
});

describe('graphGetAllPages', () => {
  it('segue @odata.nextLink e concatena value', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(
        res(200, {
          value: [{ id: 'a' }, { id: 'b' }],
          '@odata.nextLink': 'https://graph.microsoft.com/v1.0/next-page',
        }),
      )
      .mockResolvedValueOnce(res(200, { value: [{ id: 'c' }] }));

    const items = await graphGetAllPages<{ id: string }>('/me/messages', 'acc-1');
    expect(items.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('graphGetDelta', () => {
  it('segue nextLink até o deltaLink e o retorna', async () => {
    (global.fetch as any)
      .mockResolvedValueOnce(
        res(200, {
          value: [{ id: 't1' }],
          '@odata.nextLink': 'https://graph.microsoft.com/v1.0/delta-next',
        }),
      )
      .mockResolvedValueOnce(
        res(200, {
          value: [{ id: 't2' }],
          '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/the-delta-link',
        }),
      );

    const { items, deltaLink } = await graphGetDelta<{ id: string }>('/start', 'acc-1');
    expect(items.map((i) => i.id)).toEqual(['t1', 't2']);
    expect(deltaLink).toBe('https://graph.microsoft.com/v1.0/the-delta-link');
  });
});

describe('fetchFlaggedEmails', () => {
  it('retorna as mensagens sinalizadas da conta', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      res(200, { value: [{ id: 'm1', subject: 's' }] }),
    );
    const msgs = await fetchFlaggedEmails('acc-1');
    expect(msgs).toHaveLength(1);
    expect(msgs[0].id).toBe('m1');
  });
});

describe('me', () => {
  it('mapeia id/displayName/mail usando o token direto (raw fetch)', async () => {
    (global.fetch as any).mockResolvedValueOnce(
      res(200, { id: 'u1', displayName: 'Fulano', mail: 'f@x.com' }),
    );
    const profile = await me('direct-token');
    expect(profile).toEqual({
      id: 'u1',
      displayName: 'Fulano',
      mail: 'f@x.com',
      userPrincipalName: null,
    });
    // Usa o token passado diretamente, sem getValidAccessToken.
    const [, init] = (global.fetch as any).mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer direct-token');
    expect(getValidAccessToken).not.toHaveBeenCalled();
  });
});

describe('fetchTodoListsAndTasks (delta)', () => {
  it('faz carga inicial e persiste o deltaLink por (conta, lista)', async () => {
    // 1) lista de listas
    (global.fetch as any)
      .mockResolvedValueOnce(res(200, { value: [{ id: 'list-1', displayName: 'L1' }] }))
      // 2) delta da lista-1 (carga inicial) → deltaLink
      .mockResolvedValueOnce(
        res(200, {
          value: [{ id: 'task-1', title: 'T1', status: 'notStarted' }],
          '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/todo-delta-1',
        }),
      );

    const tasks = await fetchTodoListsAndTasks('acc-1');
    expect(tasks.map((t) => t.id)).toEqual(['task-1']);
    expect(deltaStore[deltaKey('acc-1', 'todo:list-1')]).toBe(
      'https://graph.microsoft.com/v1.0/todo-delta-1',
    );
  });

  it('reusa o deltaLink salvo na próxima sync e filtra @removed', async () => {
    deltaStore[deltaKey('acc-1', 'todo:list-1')] = 'https://graph.microsoft.com/v1.0/saved-delta';

    (global.fetch as any)
      .mockResolvedValueOnce(res(200, { value: [{ id: 'list-1', displayName: 'L1' }] }))
      .mockResolvedValueOnce(
        res(200, {
          value: [
            { id: 'task-2', title: 'T2', status: 'completed' },
            { id: 'task-old', '@removed': { reason: 'deleted' } },
          ],
          '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/saved-delta-2',
        }),
      );

    const tasks = await fetchTodoListsAndTasks('acc-1');
    // task-old (removida) foi filtrada.
    expect(tasks.map((t) => t.id)).toEqual(['task-2']);

    // Confirma que a 2ª chamada usou o deltaLink salvo.
    const taskCallUrl = (global.fetch as any).mock.calls[1][0];
    expect(taskCallUrl).toBe('https://graph.microsoft.com/v1.0/saved-delta');
    expect(deltaStore[deltaKey('acc-1', 'todo:list-1')]).toBe(
      'https://graph.microsoft.com/v1.0/saved-delta-2',
    );
  });
});

describe('auth wiring', () => {
  it('getValidAccessToken é chamado por requisição com o accountId', async () => {
    (global.fetch as any).mockResolvedValueOnce(res(200, { ok: 1 }));
    await graphGet('/me', 'acc-1');
    expect(getValidAccessToken).toHaveBeenCalledWith('acc-1');
  });
});
