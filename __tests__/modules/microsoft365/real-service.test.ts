/**
 * Testes do RealMicrosoft365Service: connect/disconnect/syncNow com Graph e
 * auth mockados. Verifica o fluxo de sync (mapeamento + upsert + lastSync) e o
 * tratamento de erros sem vazar conteúdo.
 */

jest.mock('../../../src/utils/id', () => {
  let n = 0;
  return { generateId: jest.fn(() => `id-${++n}`) };
});

// auth mockado
jest.mock('../../../src/modules/microsoft365/auth', () => {
  class MicrosoftReauthRequiredError extends Error {
    constructor(m = 'reauth') {
      super(m);
      this.name = 'MicrosoftReauthRequiredError';
    }
  }
  return {
    signIn: jest.fn(async () => ({ accessToken: 'AT', expiresAt: Date.now() + 3600_000 })),
    signOut: jest.fn(async () => {}),
    getValidAccessToken: jest.fn(async () => 'AT'),
    getTokenExpiresAt: jest.fn(async () => Date.now() + 3600_000),
    hasStoredSession: jest.fn(async () => true),
    MicrosoftReauthRequiredError,
  };
});

// graph mockado
jest.mock('../../../src/modules/microsoft365/graph', () => ({
  fetchFlaggedEmails: jest.fn(),
  fetchTodoListsAndTasks: jest.fn(),
  me: jest.fn(async () => ({
    id: 'ms-user-1',
    displayName: 'Pessoa',
    mail: 'pessoa@outlook.com',
    userPrincipalName: 'pessoa@outlook.com',
  })),
}));

// repositórios em memória
jest.mock('../../../src/modules/microsoft365/repositories', () => {
  const holder: { account: any } = { account: null };
  return {
    __holder: holder,
    microsoftAccountRepository: {
      getAccount: jest.fn(() => holder.account),
      saveAccount: jest.fn((a: any) => {
        holder.account = a;
      }),
      setLastSyncAt: jest.fn((_id: string, ts: number) => {
        if (holder.account) holder.account.lastSyncAt = ts;
      }),
      clearAccount: jest.fn(() => {
        holder.account = null;
      }),
    },
    microsoft365ItemRepository: {
      countItems: jest.fn(() => 0),
      upsertItems: jest.fn(),
      clearItems: jest.fn(),
      listItems: jest.fn(() => []),
    },
    deltaTokenRepository: {
      clearDeltaToken: jest.fn(),
    },
  };
});

import { RealMicrosoft365Service } from '../../../src/modules/microsoft365/services/real-microsoft365.service';
import * as graph from '../../../src/modules/microsoft365/graph';
import * as auth from '../../../src/modules/microsoft365/auth';
import * as repos from '../../../src/modules/microsoft365/repositories';

const accountRepo = (repos as any).microsoftAccountRepository;
const itemRepo = (repos as any).microsoft365ItemRepository;
const deltaRepo = (repos as any).deltaTokenRepository;
const holder = (repos as any).__holder as { account: any };

const GRAPH_MESSAGES = [
  {
    id: 'm1',
    subject: 'Assunto X',
    bodyPreview: 'preview',
    webLink: 'https://outlook/m1',
    isRead: false,
    receivedDateTime: '2026-06-20T10:00:00Z',
    from: { emailAddress: { name: 'A', address: 'a@x.com' } },
    flag: { flagStatus: 'flagged' },
  },
];
const GRAPH_TASKS = [
  { id: 't1', title: 'Tarefa 1', status: 'notStarted', importance: 'high' },
  { id: 't2', title: 'Tarefa 2', status: 'completed', importance: 'normal' },
];

beforeEach(() => {
  jest.clearAllMocks();
  holder.account = null;
  (graph.fetchFlaggedEmails as any).mockResolvedValue(GRAPH_MESSAGES);
  (graph.fetchTodoListsAndTasks as any).mockResolvedValue(GRAPH_TASKS);
});

describe('RealMicrosoft365Service.connect', () => {
  it('roda OAuth, busca /me, persiste conta e dispara sync inicial', async () => {
    const service = new RealMicrosoft365Service();
    const account = await service.connect('user-9');

    expect(auth.signIn).toHaveBeenCalled();
    expect(graph.me).toHaveBeenCalled();
    expect(account.userId).toBe('user-9');
    expect(account.microsoftUserId).toBe('ms-user-1');
    expect(account.email).toBe('pessoa@outlook.com');
    expect(accountRepo.saveAccount).toHaveBeenCalled();
    // Sync inicial fez upsert.
    expect(itemRepo.upsertItems).toHaveBeenCalled();
  });
});

describe('RealMicrosoft365Service.syncNow', () => {
  it('mapeia emails+tasks, faz upsert e atualiza lastSync', async () => {
    holder.account = { id: 'acc-1', lastSyncAt: null };
    const service = new RealMicrosoft365Service();

    const result = await service.syncNow();

    expect(result.status).toBe('success');
    expect(result.emailCount).toBe(1);
    expect(result.taskCount).toBe(2);
    expect(itemRepo.upsertItems).toHaveBeenCalledTimes(1);

    const upserted = itemRepo.upsertItems.mock.calls[0][0] as any[];
    const types = new Set(upserted.map((i) => i.sourceType));
    expect(types.has('EMAIL')).toBe(true);
    expect(types.has('TODO_TASK')).toBe(true);
    expect(accountRepo.setLastSyncAt).toHaveBeenCalledWith('acc-1', expect.any(Number));
  });

  it('retorna erro quando não há conta', async () => {
    const service = new RealMicrosoft365Service();
    const result = await service.syncNow();
    expect(result.status).toBe('error');
    expect(itemRepo.upsertItems).not.toHaveBeenCalled();
  });

  it('trata erro de reconexão sem vazar conteúdo', async () => {
    holder.account = { id: 'acc-1', lastSyncAt: null };
    (graph.fetchFlaggedEmails as any).mockRejectedValueOnce(
      new auth.MicrosoftReauthRequiredError(),
    );
    const service = new RealMicrosoft365Service();
    const result = await service.syncNow();
    expect(result.status).toBe('error');
    expect(result.error).toMatch(/reconecte/i);
  });

  it('trata erro genérico do Graph com mensagem neutra', async () => {
    holder.account = { id: 'acc-1', lastSyncAt: null };
    (graph.fetchTodoListsAndTasks as any).mockRejectedValueOnce(new Error('boom'));
    const service = new RealMicrosoft365Service();
    const result = await service.syncNow();
    expect(result.status).toBe('error');
    expect(result.error).toBe('Falha ao sincronizar.');
  });
});

describe('RealMicrosoft365Service.disconnect', () => {
  it('limpa tokens e dados quando removeData=true', async () => {
    const service = new RealMicrosoft365Service();
    await service.disconnect(true);
    expect(auth.signOut).toHaveBeenCalled();
    expect(accountRepo.clearAccount).toHaveBeenCalled();
    expect(itemRepo.clearItems).toHaveBeenCalled();
    expect(deltaRepo.clearDeltaToken).toHaveBeenCalled();
  });

  it('mantém histórico quando removeData=false', async () => {
    const service = new RealMicrosoft365Service();
    await service.disconnect(false);
    expect(auth.signOut).toHaveBeenCalled();
    expect(accountRepo.clearAccount).toHaveBeenCalled();
    expect(itemRepo.clearItems).not.toHaveBeenCalled();
  });
});

describe('RealMicrosoft365Service.getConnectionState', () => {
  it('reporta conectado quando há conta', () => {
    holder.account = { id: 'a', lastSyncAt: 99 };
    itemRepo.countItems.mockReturnValueOnce(1).mockReturnValueOnce(2);
    const service = new RealMicrosoft365Service();
    const state = service.getConnectionState();
    expect(state.isConnected).toBe(true);
    expect(state.emailCount).toBe(1);
    expect(state.taskCount).toBe(2);
    expect(state.lastSyncAt).toBe(99);
  });
});
