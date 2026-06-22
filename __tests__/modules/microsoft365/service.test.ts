/**
 * Testes do serviço de orquestração MOCK (MockMicrosoft365Service).
 * Mocka os repositórios para isolar a lógica de connect/disconnect/syncNow.
 */

// Mocka utils/id (que usa expo-modules-core/uuid) sem tocar em expo-modules-core,
// evitando a cadeia winter/fetch do jest-expo.
jest.mock('../../../src/utils/id', () => ({
  generateId: jest.fn(() => 'fixed-id'),
  nowISO: jest.fn(() => '2026-01-01T00:00:00.000Z'),
  todayDate: jest.fn(() => '2026-01-01'),
}));

// Mock dos repositórios. A factory cria os objetos INTERNAMENTE (evita TDZ com
// os imports hoisted) e os expõe via o próprio módulo importado abaixo.
jest.mock('../../../src/modules/microsoft365/repositories', () => {
  const holder: { stored: any } = { stored: null };
  return {
    __holder: holder,
    microsoftAccountRepository: {
      getAccount: jest.fn(() => holder.stored),
      saveAccount: jest.fn((acc: any) => {
        holder.stored = acc;
      }),
      setLastSyncAt: jest.fn((_id: string, ts: number) => {
        if (holder.stored) holder.stored.lastSyncAt = ts;
      }),
      clearAccount: jest.fn(() => {
        holder.stored = null;
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

import { MockMicrosoft365Service } from '../../../src/modules/microsoft365/services/microsoft365.service';
import * as reposModule from '../../../src/modules/microsoft365/repositories';

const accountRepo = (reposModule as any).microsoftAccountRepository;
const itemRepo = (reposModule as any).microsoft365ItemRepository;
const deltaRepo = (reposModule as any).deltaTokenRepository;
const holder = (reposModule as any).__holder as { stored: any };

function setStoredAccount(acc: any) {
  holder.stored = acc;
}

beforeEach(() => {
  jest.clearAllMocks();
  holder.stored = null;
});

describe('MockMicrosoft365Service', () => {
  const service = new MockMicrosoft365Service();

  describe('getConnectionState', () => {
    it('reporta desconectado quando não há conta', () => {
      const state = service.getConnectionState();
      expect(state.isConnected).toBe(false);
      expect(state.account).toBeNull();
    });

    it('reporta conectado e contadores quando há conta', () => {
      setStoredAccount({ id: 'a', lastSyncAt: 42 });
      itemRepo.countItems.mockReturnValueOnce(2).mockReturnValueOnce(3);
      const state = service.getConnectionState();
      expect(state.isConnected).toBe(true);
      expect(state.emailCount).toBe(2);
      expect(state.taskCount).toBe(3);
      expect(state.lastSyncAt).toBe(42);
    });
  });

  describe('connect', () => {
    it('cria e persiste uma conta fake', async () => {
      const acc = await service.connect('user-7');
      expect(acc.userId).toBe('user-7');
      expect(acc.email).toContain('@');
      expect(accountRepo.saveAccount).toHaveBeenCalledWith(acc);
    });
  });

  describe('disconnect', () => {
    it('remove conta e dados quando removeData=true', async () => {
      await service.disconnect(true);
      expect(accountRepo.clearAccount).toHaveBeenCalled();
      expect(itemRepo.clearItems).toHaveBeenCalled();
      expect(deltaRepo.clearDeltaToken).toHaveBeenCalled();
    });

    it('mantém histórico local quando removeData=false', async () => {
      await service.disconnect(false);
      expect(accountRepo.clearAccount).toHaveBeenCalled();
      expect(itemRepo.clearItems).not.toHaveBeenCalled();
      expect(deltaRepo.clearDeltaToken).not.toHaveBeenCalled();
    });
  });

  describe('syncNow', () => {
    it('retorna erro quando não há conta conectada', async () => {
      const result = await service.syncNow();
      expect(result.status).toBe('error');
      expect(itemRepo.upsertItems).not.toHaveBeenCalled();
    });

    it('popula itens fake e atualiza lastSync quando conectado', async () => {
      setStoredAccount({ id: 'acc-1', lastSyncAt: null });
      const result = await service.syncNow();
      expect(result.status).toBe('success');
      expect(result.emailCount).toBeGreaterThan(0);
      expect(result.taskCount).toBeGreaterThan(0);
      expect(itemRepo.upsertItems).toHaveBeenCalledTimes(1);
      expect(accountRepo.setLastSyncAt).toHaveBeenCalledWith('acc-1', expect.any(Number));

      // Os itens upsertados devem ter sourceType EMAIL e TODO_TASK.
      const upserted = itemRepo.upsertItems.mock.calls[0][0] as any[];
      const types = new Set(upserted.map((i) => i.sourceType));
      expect(types.has('EMAIL')).toBe(true);
      expect(types.has('TODO_TASK')).toBe(true);
    });
  });
});
