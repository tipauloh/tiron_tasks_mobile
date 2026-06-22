/**
 * Testes dos repositórios SQLite do módulo Microsoft 365.
 *
 * Abstrai o SQLite com um fake que captura as chamadas (runSync/getFirstSync/
 * getAllSync/withTransactionSync) e permite stubar retornos. Não exercita um
 * motor SQL real — valida o contrato: parâmetros corretos e mapeamento row→modelo.
 */

// Fake DB controlável -------------------------------------------------------
// Prefixo "mock" é exigido pelo jest para variáveis referenciadas na factory.
const mockRunSync = jest.fn();
const mockGetAllSync = jest.fn();
const mockGetFirstSync = jest.fn();
const mockWithTransactionSync = jest.fn((cb: () => void) => cb());

jest.mock('../../../src/modules/microsoft365/storage/db', () => ({
  getMs365Database: () => ({
    runSync: mockRunSync,
    getAllSync: mockGetAllSync,
    getFirstSync: mockGetFirstSync,
    withTransactionSync: mockWithTransactionSync,
  }),
}));

const runSync = mockRunSync;
const getAllSync = mockGetAllSync;
const getFirstSync = mockGetFirstSync;
const withTransactionSync = mockWithTransactionSync;

import {
  MicrosoftAccountRepository,
} from '../../../src/modules/microsoft365/repositories/account-repository';
import {
  Microsoft365ItemRepository,
} from '../../../src/modules/microsoft365/repositories/item-repository';
import {
  DeltaTokenRepository,
} from '../../../src/modules/microsoft365/repositories/delta-token-repository';
import type {
  MicrosoftAccount,
  Microsoft365Item,
} from '../../../src/modules/microsoft365/types';

beforeEach(() => {
  jest.clearAllMocks();
});

// Account -------------------------------------------------------------------
describe('MicrosoftAccountRepository', () => {
  const repo = new MicrosoftAccountRepository();
  const account: MicrosoftAccount = {
    id: 'acc-1',
    userId: 'u-1',
    microsoftUserId: 'ms-1',
    email: 'a@b.com',
    displayName: 'Fulano',
    tokenExpiresAt: 123,
    lastSyncAt: null,
    createdAt: 1,
    updatedAt: 2,
  };

  const accountRow = {
    id: 'acc-1',
    user_id: 'u-1',
    microsoft_user_id: 'ms-1',
    email: 'a@b.com',
    display_name: 'Fulano',
    token_expires_at: 123,
    last_sync_at: null,
    created_at: 1,
    updated_at: 2,
  };

  it('getAccounts mapeia as rows para o modelo', () => {
    getAllSync.mockReturnValueOnce([accountRow]);
    const result = repo.getAccounts();
    expect(result).toEqual([account]);
  });

  it('getAccounts retorna [] quando não há rows', () => {
    getAllSync.mockReturnValueOnce([]);
    expect(repo.getAccounts()).toEqual([]);
  });

  it('getAccountById filtra por id e mapeia', () => {
    getFirstSync.mockReturnValueOnce(accountRow);
    const result = repo.getAccountById('acc-1');
    expect(result).toEqual(account);
    expect(getFirstSync.mock.calls[0][1]).toEqual(['acc-1']);
  });

  it('getAccountById retorna null quando não há row', () => {
    getFirstSync.mockReturnValueOnce(undefined);
    expect(repo.getAccountById('x')).toBeNull();
  });

  it('saveAccount faz upsert com os parâmetros na ordem correta', () => {
    repo.saveAccount(account);
    expect(runSync).toHaveBeenCalledTimes(1);
    const [, params] = runSync.mock.calls[0];
    expect(params).toEqual([
      'acc-1', 'u-1', 'ms-1', 'a@b.com', 'Fulano', 123, null, 1, 2,
    ]);
  });

  it('setLastSyncAt atualiza o timestamp', () => {
    repo.setLastSyncAt('acc-1', 999);
    const [, params] = runSync.mock.calls[0];
    expect(params[0]).toBe(999);
    expect(params[2]).toBe('acc-1');
  });

  it('clearAccount apaga apenas a conta indicada', () => {
    repo.clearAccount('acc-1');
    expect(runSync).toHaveBeenCalledTimes(1);
    expect(String(runSync.mock.calls[0][0])).toContain('DELETE FROM ms365_account_meta');
    expect(runSync.mock.calls[0][1]).toEqual(['acc-1']);
  });
});

// Items ---------------------------------------------------------------------
describe('Microsoft365ItemRepository', () => {
  const repo = new Microsoft365ItemRepository();
  const item: Microsoft365Item = {
    id: 'it-1',
    accountId: 'acc-1',
    externalId: 'ext-1',
    sourceType: 'EMAIL',
    title: 'Assunto',
    summary: 'resumo',
    status: 'unread',
    priority: null,
    dueDate: null,
    webLink: 'https://x',
    lastSync: 10,
    createdAt: 11,
    updatedAt: 12,
    emailFrom: 'a@b.com',
    emailReceivedAt: '2026-06-20T14:30:00Z',
    emailIsRead: false,
    emailFlagStatus: 'flagged',
    emailPreview: 'preview',
  };

  it('listItems sem filtro mapeia rows (com account_id)', () => {
    getAllSync.mockReturnValueOnce([
      {
        id: 'it-1', account_id: 'acc-1', external_id: 'ext-1', source_type: 'EMAIL',
        title: 'Assunto', summary: 'resumo', status: 'unread', priority: null,
        due_date: null, web_link: 'https://x', last_sync: 10, created_at: 11, updated_at: 12,
        email_from: 'a@b.com', email_received_at: '2026-06-20T14:30:00Z',
        email_is_read: 0, email_flag_status: 'flagged', email_preview: 'preview',
      },
    ]);
    const out = repo.listItems();
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual(item);
    // sem cláusula WHERE
    expect(String(getAllSync.mock.calls[0][0])).not.toContain('WHERE');
  });

  it('listItems com filtro de tipo aplica WHERE source_type', () => {
    getAllSync.mockReturnValueOnce([]);
    repo.listItems({ sourceType: 'TODO_TASK' });
    const [sql, params] = getAllSync.mock.calls[0];
    expect(String(sql)).toContain('WHERE source_type = ?');
    expect(params).toEqual(['TODO_TASK']);
  });

  it('listItems com filtro de conta aplica WHERE account_id', () => {
    getAllSync.mockReturnValueOnce([]);
    repo.listItems({ accountId: 'acc-1' });
    const [sql, params] = getAllSync.mock.calls[0];
    expect(String(sql)).toContain('WHERE account_id = ?');
    expect(params).toEqual(['acc-1']);
  });

  it('countItems retorna a contagem', () => {
    getFirstSync.mockReturnValueOnce({ c: 5 });
    expect(repo.countItems({ sourceType: 'EMAIL' })).toBe(5);
  });

  it('countItems retorna 0 quando não há row', () => {
    getFirstSync.mockReturnValueOnce(undefined);
    expect(repo.countItems()).toBe(0);
  });

  it('upsertItems roda dentro de transação, grava account_id e converte boolean is_read', () => {
    repo.upsertItems([item]);
    expect(withTransactionSync).toHaveBeenCalledTimes(1);
    expect(runSync).toHaveBeenCalledTimes(1);
    const [, params] = runSync.mock.calls[0];
    // params: id, account_id, external_id, ...
    expect(params[1]).toBe('acc-1');
    // email_is_read deve virar 0 (false) — índice deslocado em +1 por causa do account_id.
    expect(params[15]).toBe(0);
  });

  it('upsertItems não faz nada para lista vazia', () => {
    repo.upsertItems([]);
    expect(withTransactionSync).not.toHaveBeenCalled();
    expect(runSync).not.toHaveBeenCalled();
  });

  it('clearItems com tipo aplica filtro', () => {
    repo.clearItems({ sourceType: 'EMAIL' });
    const [sql, params] = runSync.mock.calls[0];
    expect(String(sql)).toContain('WHERE source_type = ?');
    expect(params).toEqual(['EMAIL']);
  });

  it('clearItems por conta aplica filtro account_id', () => {
    repo.clearItems({ accountId: 'acc-1' });
    const [sql, params] = runSync.mock.calls[0];
    expect(String(sql)).toContain('WHERE account_id = ?');
    expect(params).toEqual(['acc-1']);
  });

  it('clearItems sem filtro apaga tudo', () => {
    repo.clearItems();
    expect(String(runSync.mock.calls[0][0])).toContain('DELETE FROM ms365_items');
    expect(runSync.mock.calls[0][1]).toBeUndefined();
  });
});

// Delta ---------------------------------------------------------------------
describe('DeltaTokenRepository', () => {
  const repo = new DeltaTokenRepository();

  it('getDeltaToken filtra por (account_id, scope) e retorna o delta_link', () => {
    getFirstSync.mockReturnValueOnce({
      account_id: 'acc-1', scope: 'todo:1', delta_link: 'LINK', updated_at: 1,
    });
    expect(repo.getDeltaToken('acc-1', 'todo:1')).toBe('LINK');
    expect(getFirstSync.mock.calls[0][1]).toEqual(['acc-1', 'todo:1']);
  });

  it('getDeltaToken retorna null quando ausente', () => {
    getFirstSync.mockReturnValueOnce(undefined);
    expect(repo.getDeltaToken('acc-1', 'todo:x')).toBeNull();
  });

  it('setDeltaToken faz upsert com account_id, scope e link', () => {
    repo.setDeltaToken('acc-1', 'todo:1', 'LINK');
    const [, params] = runSync.mock.calls[0];
    expect(params[0]).toBe('acc-1');
    expect(params[1]).toBe('todo:1');
    expect(params[2]).toBe('LINK');
  });

  it('clearDeltaToken por conta filtra account_id', () => {
    repo.clearDeltaToken('acc-1');
    const [sql, params] = runSync.mock.calls[0];
    expect(String(sql)).toContain('WHERE account_id = ?');
    expect(params).toEqual(['acc-1']);
  });

  it('clearDeltaToken por (conta, scope) filtra ambos', () => {
    repo.clearDeltaToken('acc-1', 'todo:1');
    const [sql, params] = runSync.mock.calls[0];
    expect(String(sql)).toContain('WHERE account_id = ? AND scope = ?');
    expect(params).toEqual(['acc-1', 'todo:1']);
  });
});
