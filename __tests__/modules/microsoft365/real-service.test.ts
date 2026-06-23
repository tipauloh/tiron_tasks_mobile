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
    // signIn agora retorna os tokens completos (sem persistir).
    signIn: jest.fn(async () => ({
      accessToken: 'AT',
      refreshToken: 'RT',
      expiresAt: Date.now() + 3600_000,
    })),
    signOut: jest.fn(async (_accountId: string) => {}),
    getValidAccessToken: jest.fn(async (_accountId: string) => 'AT'),
    getTokenExpiresAt: jest.fn(async (_accountId: string) => 1_000),
    hasStoredSession: jest.fn(async (_accountId: string) => true),
    persistTokensForAccount: jest.fn(async (_accountId: string, _tokens: any) => {}),
    readStoredTokens: jest.fn(async (_accountId: string) => ({
      accessToken: 'AT',
      refreshToken: 'RT',
      expiresAt: 1_000,
    })),
    MicrosoftReauthRequiredError,
  };
});

// Sincronização das contas com o backend (multi-dispositivo) mockada.
jest.mock('../../../src/modules/microsoft365/repositories/remote-account-api', () => ({
  remoteAccountApi: {
    list: jest.fn(async () => ({ data: [] })),
    upsert: jest.fn(async () => ({ data: {} })),
    remove: jest.fn(async () => ({ message: 'ok' })),
  },
}));

// graph mockado
jest.mock('../../../src/modules/microsoft365/graph', () => ({
  fetchFlaggedEmails: jest.fn(),
  me: jest.fn(async () => ({
    id: 'ms-user-1',
    displayName: 'Pessoa',
    mail: 'pessoa@outlook.com',
    userPrincipalName: 'pessoa@outlook.com',
  })),
}));

// backend (espelhamento e-mail -> tarefa) mockado
jest.mock('@/infrastructure/api/task-api', () => ({
  taskApi: { emailSync: jest.fn(async () => ({ data: { created: 1, list_id: 1 } })) },
}));

// repositórios em memória (MULTI-CONTA: holder.accounts[])
jest.mock('../../../src/modules/microsoft365/repositories', () => {
  const holder: { accounts: any[] } = { accounts: [] };
  return {
    __holder: holder,
    microsoftAccountRepository: {
      getAccounts: jest.fn(() => holder.accounts),
      getAccountById: jest.fn((id: string) => holder.accounts.find((a) => a.id === id) ?? null),
      saveAccount: jest.fn((a: any) => {
        const idx = holder.accounts.findIndex((x) => x.id === a.id);
        if (idx >= 0) holder.accounts[idx] = a;
        else holder.accounts.push(a);
      }),
      setLastSyncAt: jest.fn((id: string, ts: number) => {
        const acc = holder.accounts.find((a) => a.id === id);
        if (acc) acc.lastSyncAt = ts;
      }),
      clearAccount: jest.fn((id: string) => {
        holder.accounts = holder.accounts.filter((a) => a.id !== id);
      }),
    },
    microsoft365ItemRepository: {
      countItems: jest.fn(() => 0),
      upsertItems: jest.fn(),
      keepOnlyEmails: jest.fn(),
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
const holder = (repos as any).__holder as { accounts: any[] };

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
beforeEach(() => {
  jest.clearAllMocks();
  holder.accounts = [];
  (graph.fetchFlaggedEmails as any).mockResolvedValue(GRAPH_MESSAGES);
});

describe('RealMicrosoft365Service.connect', () => {
  it('roda OAuth, busca /me (com token), usa profile.id como accountId, persiste tokens e dispara sync', async () => {
    const service = new RealMicrosoft365Service();
    const account = await service.connect('user-9');

    expect(auth.signIn).toHaveBeenCalled();
    // me recebe o access token diretamente (antes de conhecer o accountId).
    expect(graph.me).toHaveBeenCalledWith('AT');
    // accountId = profile.id.
    expect(account.id).toBe('ms-user-1');
    expect(account.userId).toBe('user-9');
    expect(account.microsoftUserId).toBe('ms-user-1');
    expect(account.email).toBe('pessoa@outlook.com');
    // tokens persistidos POR conta (após o /me).
    expect(auth.persistTokensForAccount).toHaveBeenCalledWith(
      'ms-user-1',
      expect.objectContaining({ accessToken: 'AT' }),
    );
    expect(accountRepo.saveAccount).toHaveBeenCalled();
    // Sync inicial só dessa conta fez upsert.
    expect(itemRepo.upsertItems).toHaveBeenCalled();
  });

  it('não remove outras contas ao conectar uma nova', async () => {
    holder.accounts = [{ id: 'outra', userId: 'user-9', lastSyncAt: null, createdAt: 1 }];
    const service = new RealMicrosoft365Service();
    await service.connect('user-9');
    expect(accountRepo.clearAccount).not.toHaveBeenCalled();
    expect(holder.accounts.map((a) => a.id).sort()).toEqual(['ms-user-1', 'outra']);
  });
});

describe('RealMicrosoft365Service.syncNow', () => {
  it('mapeia emails (só EMAIL) com accountId, faz upsert e atualiza lastSync', async () => {
    holder.accounts = [{ id: 'acc-1', lastSyncAt: null }];
    const service = new RealMicrosoft365Service();

    const result = await service.syncNow();

    expect(result.status).toBe('success');
    expect(result.emailCount).toBe(1);
    expect(result.taskCount).toBe(0);
    expect(itemRepo.upsertItems).toHaveBeenCalledTimes(1);

    const upserted = itemRepo.upsertItems.mock.calls[0][0] as any[];
    expect(upserted.every((i) => i.sourceType === 'EMAIL')).toBe(true);
    expect(upserted.every((i) => i.accountId === 'acc-1')).toBe(true);
    expect(accountRepo.setLastSyncAt).toHaveBeenCalledWith('acc-1', expect.any(Number));
    // fetchFlaggedEmails recebe o accountId.
    expect((graph.fetchFlaggedEmails as any)).toHaveBeenCalledWith('acc-1');
  });

  it('faz loop em TODAS as contas quando nenhum accountId é passado', async () => {
    holder.accounts = [
      { id: 'acc-1', lastSyncAt: null },
      { id: 'acc-2', lastSyncAt: null },
    ];
    const service = new RealMicrosoft365Service();
    const result = await service.syncNow();
    expect(result.emailCount).toBe(2); // 1 e-mail por conta
    expect(itemRepo.upsertItems).toHaveBeenCalledTimes(2);
    expect(accountRepo.setLastSyncAt).toHaveBeenCalledWith('acc-1', expect.any(Number));
    expect(accountRepo.setLastSyncAt).toHaveBeenCalledWith('acc-2', expect.any(Number));
  });

  it('sincroniza apenas a conta indicada quando accountId é passado', async () => {
    holder.accounts = [
      { id: 'acc-1', lastSyncAt: null },
      { id: 'acc-2', lastSyncAt: null },
    ];
    const service = new RealMicrosoft365Service();
    await service.syncNow('acc-2');
    expect(itemRepo.upsertItems).toHaveBeenCalledTimes(1);
    expect((graph.fetchFlaggedEmails as any)).toHaveBeenCalledWith('acc-2');
    expect(accountRepo.setLastSyncAt).toHaveBeenCalledWith('acc-2', expect.any(Number));
  });

  it('espelha os emails como tarefas no backend (email-sync) com account_id e reconcile', async () => {
    holder.accounts = [{ id: 'acc-1', lastSyncAt: null }];
    const { taskApi } = require('@/infrastructure/api/task-api');
    const service = new RealMicrosoft365Service();

    await service.syncNow();

    expect(taskApi.emailSync).toHaveBeenCalledTimes(1);
    const [sent, opts] = taskApi.emailSync.mock.calls[0];
    expect(sent[0].external_id).toBe('m1');
    expect(opts).toEqual({ accountId: 'acc-1', reconcile: true });
  });

  it('retorna erro quando não há conta', async () => {
    const service = new RealMicrosoft365Service();
    const result = await service.syncNow();
    expect(result.status).toBe('error');
    expect(itemRepo.upsertItems).not.toHaveBeenCalled();
  });

  it('trata erro de reconexão sem vazar conteúdo', async () => {
    holder.accounts = [{ id: 'acc-1', lastSyncAt: null }];
    (graph.fetchFlaggedEmails as any).mockRejectedValueOnce(
      new auth.MicrosoftReauthRequiredError(),
    );
    const service = new RealMicrosoft365Service();
    const result = await service.syncNow();
    expect(result.status).toBe('error');
    expect(result.error).toMatch(/reconecte/i);
  });

  it('trata erro genérico do Graph com mensagem neutra (sem vazar conteúdo)', async () => {
    holder.accounts = [{ id: 'acc-1', lastSyncAt: null }];
    (graph.fetchFlaggedEmails as any).mockRejectedValueOnce(new Error('boom'));
    const service = new RealMicrosoft365Service();
    const result = await service.syncNow();
    expect(result.status).toBe('error');
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain('boom');
  });
});

describe('RealMicrosoft365Service.disconnect', () => {
  it('limpa tokens e dados DA CONTA quando removeData=true', async () => {
    const service = new RealMicrosoft365Service();
    await service.disconnect('acc-1', true);
    expect(auth.signOut).toHaveBeenCalledWith('acc-1');
    expect(accountRepo.clearAccount).toHaveBeenCalledWith('acc-1');
    expect(itemRepo.clearItems).toHaveBeenCalledWith({ accountId: 'acc-1' });
    expect(deltaRepo.clearDeltaToken).toHaveBeenCalledWith('acc-1');
  });

  it('mantém histórico quando removeData=false', async () => {
    const service = new RealMicrosoft365Service();
    await service.disconnect('acc-1', false);
    expect(auth.signOut).toHaveBeenCalledWith('acc-1');
    expect(accountRepo.clearAccount).toHaveBeenCalledWith('acc-1');
    expect(itemRepo.clearItems).not.toHaveBeenCalled();
  });
});

describe('RealMicrosoft365Service — sincronização entre dispositivos', () => {
  const { remoteAccountApi } = require('../../../src/modules/microsoft365/repositories/remote-account-api');

  it('connect envia a conta + tokens ao backend (upsert)', async () => {
    const service = new RealMicrosoft365Service();
    await service.connect('user-9');
    expect(remoteAccountApi.upsert).toHaveBeenCalledWith(
      'ms-user-1',
      expect.objectContaining({ account_id: 'ms-user-1', access_token: 'AT', refresh_token: 'RT' }),
    );
  });

  it('disconnect remove a conta do backend', async () => {
    const service = new RealMicrosoft365Service();
    await service.disconnect('acc-1', false);
    expect(remoteAccountApi.remove).toHaveBeenCalledWith('acc-1');
  });

  it('restoreFromRemote grava localmente contas conectadas em outro dispositivo', async () => {
    remoteAccountApi.list.mockResolvedValueOnce({
      data: [
        {
          account_id: 'remota-1',
          email: 'r@x.com',
          display_name: 'Remota',
          access_token: 'AT2',
          refresh_token: 'RT2',
          token_expires_at: 1_000,
        },
      ],
    });
    const service = new RealMicrosoft365Service();
    const restored = await service.restoreFromRemote('user-9');

    expect(restored).toBe(1);
    expect(auth.persistTokensForAccount).toHaveBeenCalledWith(
      'remota-1',
      expect.objectContaining({ accessToken: 'AT2', refreshToken: 'RT2' }),
    );
    expect(holder.accounts.map((a) => a.id)).toContain('remota-1');
  });

  it('restoreFromRemote NÃO sobrescreve tokens de conta já existente localmente', async () => {
    holder.accounts = [{ id: 'remota-1', userId: 'user-9', lastSyncAt: 5, createdAt: 1 }];
    remoteAccountApi.list.mockResolvedValueOnce({
      data: [
        { account_id: 'remota-1', email: 'r@x.com', display_name: 'Remota', access_token: 'AT_OLD', refresh_token: 'RT_OLD', token_expires_at: 1 },
      ],
    });
    const service = new RealMicrosoft365Service();
    await service.restoreFromRemote('user-9');
    // já existia → não regrava tokens locais (podem estar mais frescos)
    expect(auth.persistTokensForAccount).not.toHaveBeenCalled();
  });
});

describe('RealMicrosoft365Service.getConnectionState', () => {
  it('reporta conectado quando há contas e agrega lastSyncAt', () => {
    holder.accounts = [
      { id: 'a', lastSyncAt: 50 },
      { id: 'b', lastSyncAt: 99 },
    ];
    itemRepo.countItems.mockReturnValueOnce(3);
    const service = new RealMicrosoft365Service();
    const state = service.getConnectionState();
    expect(state.isConnected).toBe(true);
    expect(state.accounts).toHaveLength(2);
    expect(state.emailCount).toBe(3);
    expect(state.taskCount).toBe(0);
    expect(state.lastSyncAt).toBe(99); // máximo entre as contas
  });
});

describe('RealMicrosoft365Service.hasViableSession', () => {
  it('true se ALGUMA conta tem sessão armazenada', async () => {
    holder.accounts = [{ id: 'a', lastSyncAt: null }];
    const service = new RealMicrosoft365Service();
    expect(await service.hasViableSession()).toBe(true);
    expect(auth.hasStoredSession).toHaveBeenCalledWith('a');
  });

  it('false quando não há contas', async () => {
    const service = new RealMicrosoft365Service();
    expect(await service.hasViableSession()).toBe(false);
  });
});
