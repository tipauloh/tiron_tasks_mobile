/**
 * Testes unitários de src/lib/updates.ts
 * Cobre: checkAndApplyUpdate, reloadApp, getUpdateInfo
 */

// ---------------------------------------------------------------------------
// Mocks — ANTES dos imports
// ---------------------------------------------------------------------------

const mockCheckForUpdate = jest.fn();
const mockFetchUpdate = jest.fn();
const mockReload = jest.fn();

jest.mock('expo-updates', () => ({
  channel: 'production',
  runtimeVersion: '2.0.0',
  updateId: 'update-abc-123',
  isEmbeddedLaunch: false,
  createdAt: new Date('2026-06-20T00:00:00.000Z'),
  checkForUpdateAsync: (...args: unknown[]) => mockCheckForUpdate(...args),
  fetchUpdateAsync: (...args: unknown[]) => mockFetchUpdate(...args),
  reloadAsync: (...args: unknown[]) => mockReload(...args),
}));

// ---------------------------------------------------------------------------
// Imports após mocks
// ---------------------------------------------------------------------------

import {
  checkAndApplyUpdate,
  reloadApp,
  getUpdateInfo,
} from '../../src/lib/updates';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// checkAndApplyUpdate — __DEV__ = true (jest.config define __DEV__: true)
// ---------------------------------------------------------------------------

describe('checkAndApplyUpdate em __DEV__', () => {
  it('retorna status "skipped" sem chamar a API de updates', async () => {
    // __DEV__ = true está configurado no jest.config.js
    const result = await checkAndApplyUpdate();
    expect(result).toEqual({ status: 'skipped' });
    expect(mockCheckForUpdate).not.toHaveBeenCalled();
    expect(mockFetchUpdate).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// checkAndApplyUpdate — fora de __DEV__
// ---------------------------------------------------------------------------

describe('checkAndApplyUpdate fora de __DEV__', () => {
  const originalDev = (global as Record<string, unknown>).__DEV__;

  beforeEach(() => {
    (global as Record<string, unknown>).__DEV__ = false;
  });

  afterEach(() => {
    (global as Record<string, unknown>).__DEV__ = originalDev;
  });

  it('retorna "up-to-date" quando não há update disponível', async () => {
    mockCheckForUpdate.mockResolvedValue({ isAvailable: false });

    const result = await checkAndApplyUpdate();

    expect(result).toEqual({ status: 'up-to-date' });
    expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
    expect(mockFetchUpdate).not.toHaveBeenCalled();
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('baixa e aplica o update quando disponível', async () => {
    const manifest = { id: 'manifest-123', createdAt: '2026-06-20T10:00:00.000Z' };
    mockCheckForUpdate.mockResolvedValue({ isAvailable: true });
    mockFetchUpdate.mockResolvedValue({ manifest });
    mockReload.mockResolvedValue(undefined);

    const result = await checkAndApplyUpdate();

    expect(result).toEqual({ status: 'updated', manifest });
    expect(mockCheckForUpdate).toHaveBeenCalledTimes(1);
    expect(mockFetchUpdate).toHaveBeenCalledTimes(1);
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('retorna "error" quando checkForUpdateAsync lança exceção', async () => {
    const error = new Error('Network error');
    mockCheckForUpdate.mockRejectedValue(error);

    const result = await checkAndApplyUpdate();

    expect(result).toEqual({ status: 'error', error });
    expect(mockFetchUpdate).not.toHaveBeenCalled();
  });

  it('retorna "error" quando fetchUpdateAsync lança exceção', async () => {
    const error = new Error('Download failed');
    mockCheckForUpdate.mockResolvedValue({ isAvailable: true });
    mockFetchUpdate.mockRejectedValue(error);

    const result = await checkAndApplyUpdate();

    expect(result).toEqual({ status: 'error', error });
    expect(mockReload).not.toHaveBeenCalled();
  });

  it('retorna "error" quando reloadAsync lança exceção', async () => {
    const error = new Error('Reload failed');
    const manifest = { id: 'manifest-456' };
    mockCheckForUpdate.mockResolvedValue({ isAvailable: true });
    mockFetchUpdate.mockResolvedValue({ manifest });
    mockReload.mockRejectedValue(error);

    const result = await checkAndApplyUpdate();

    expect(result).toEqual({ status: 'error', error });
  });
});

// ---------------------------------------------------------------------------
// reloadApp
// ---------------------------------------------------------------------------

describe('reloadApp', () => {
  it('não faz nada em __DEV__', async () => {
    // __DEV__ = true por padrão nos testes
    await reloadApp();
    expect(mockReload).not.toHaveBeenCalled();
  });

  describe('fora de __DEV__', () => {
    const originalDev = (global as Record<string, unknown>).__DEV__;

    beforeEach(() => {
      (global as Record<string, unknown>).__DEV__ = false;
    });

    afterEach(() => {
      (global as Record<string, unknown>).__DEV__ = originalDev;
    });

    it('chama reloadAsync quando não é DEV', async () => {
      mockReload.mockResolvedValue(undefined);
      await reloadApp();
      expect(mockReload).toHaveBeenCalledTimes(1);
    });

    it('propaga erro quando reloadAsync falha', async () => {
      mockReload.mockRejectedValue(new Error('Falha no reload'));
      await expect(reloadApp()).rejects.toThrow('Falha no reload');
    });
  });
});

// ---------------------------------------------------------------------------
// getUpdateInfo
// ---------------------------------------------------------------------------

describe('getUpdateInfo', () => {
  it('retorna objeto com channel, runtimeVersion, updateId, isEmbedded, createdAt, env', () => {
    const info = getUpdateInfo();
    expect(info).toHaveProperty('channel');
    expect(info).toHaveProperty('runtimeVersion');
    expect(info).toHaveProperty('updateId');
    expect(info).toHaveProperty('isEmbedded');
    expect(info).toHaveProperty('createdAt');
    expect(info).toHaveProperty('env');
  });

  it('retorna os valores do mock de expo-updates', () => {
    const info = getUpdateInfo();
    expect(info.channel).toBe('production');
    expect(info.runtimeVersion).toBe('2.0.0');
    expect(info.updateId).toBe('update-abc-123');
    expect(info.isEmbedded).toBe(false);
  });
});
