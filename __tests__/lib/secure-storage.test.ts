/**
 * Testes unitários de src/lib/secure-storage.ts
 * Cobre: getToken, setToken, clearToken.
 */

// ---------------------------------------------------------------------------
// Mocks — ANTES dos imports
// ---------------------------------------------------------------------------

const mockGetItemAsync = jest.fn<Promise<string | null>, [string]>();
const mockSetItemAsync = jest.fn<Promise<void>, [string, string]>();
const mockDeleteItemAsync = jest.fn<Promise<void>, [string]>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: (...args: unknown[]) => mockGetItemAsync(...(args as [string])),
  setItemAsync: (...args: unknown[]) => mockSetItemAsync(...(args as [string, string])),
  deleteItemAsync: (...args: unknown[]) => mockDeleteItemAsync(...(args as [string])),
}));

// ---------------------------------------------------------------------------
// Imports após mocks
// ---------------------------------------------------------------------------

import { SecureStorage } from '../../src/lib/secure-storage';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getToken
// ---------------------------------------------------------------------------

describe('getToken', () => {
  it('retorna o token armazenado', async () => {
    mockGetItemAsync.mockResolvedValue('my-token-123');

    const token = await SecureStorage.getToken();

    expect(token).toBe('my-token-123');
    expect(mockGetItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('retorna null quando não há token armazenado', async () => {
    mockGetItemAsync.mockResolvedValue(null);

    const token = await SecureStorage.getToken();

    expect(token).toBeNull();
  });

  it('retorna null quando getItemAsync lança exceção (silencia o erro)', async () => {
    mockGetItemAsync.mockRejectedValue(new Error('SecureStore não disponível'));

    const token = await SecureStorage.getToken();

    expect(token).toBeNull();
  });

  it('usa a chave correta "auth_token"', async () => {
    mockGetItemAsync.mockResolvedValue('token');

    await SecureStorage.getToken();

    expect(mockGetItemAsync).toHaveBeenCalledWith('auth_token');
    expect(mockGetItemAsync).not.toHaveBeenCalledWith('token');
    expect(mockGetItemAsync).not.toHaveBeenCalledWith('auth');
  });
});

// ---------------------------------------------------------------------------
// setToken
// ---------------------------------------------------------------------------

describe('setToken', () => {
  it('armazena o token com a chave correta', async () => {
    mockSetItemAsync.mockResolvedValue(undefined);

    await SecureStorage.setToken('new-token-456');

    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_token', 'new-token-456');
  });

  it('propaga exceção quando setItemAsync falha', async () => {
    mockSetItemAsync.mockRejectedValue(new Error('Falha ao salvar'));

    await expect(SecureStorage.setToken('token')).rejects.toThrow('Falha ao salvar');
  });

  it('aceita tokens com formato JWT', async () => {
    mockSetItemAsync.mockResolvedValue(undefined);
    const jwtToken = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature';

    await SecureStorage.setToken(jwtToken);

    expect(mockSetItemAsync).toHaveBeenCalledWith('auth_token', jwtToken);
  });
});

// ---------------------------------------------------------------------------
// clearToken
// ---------------------------------------------------------------------------

describe('clearToken', () => {
  it('remove o token com a chave correta', async () => {
    mockDeleteItemAsync.mockResolvedValue(undefined);

    await SecureStorage.clearToken();

    expect(mockDeleteItemAsync).toHaveBeenCalledWith('auth_token');
  });

  it('propaga exceção quando deleteItemAsync falha', async () => {
    mockDeleteItemAsync.mockRejectedValue(new Error('Falha ao remover'));

    await expect(SecureStorage.clearToken()).rejects.toThrow('Falha ao remover');
  });

  it('chama deleteItemAsync exatamente uma vez', async () => {
    mockDeleteItemAsync.mockResolvedValue(undefined);

    await SecureStorage.clearToken();

    expect(mockDeleteItemAsync).toHaveBeenCalledTimes(1);
  });
});
