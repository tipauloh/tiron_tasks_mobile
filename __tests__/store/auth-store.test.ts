/**
 * Testes unitários do auth-store (Zustand).
 * Cobre: restoreSession, login, logout, clearError.
 */

// ---------------------------------------------------------------------------
// Mocks — devem ser declarados ANTES dos imports do módulo alvo
// ---------------------------------------------------------------------------

const mockGetToken = jest.fn<Promise<string | null>, []>();
const mockSetToken = jest.fn<Promise<void>, [string]>();
const mockClearToken = jest.fn<Promise<void>, []>();

jest.mock('@/lib/secure-storage', () => ({
  SecureStorage: {
    getToken: (...args: unknown[]) => mockGetToken(...(args as [])),
    setToken: (...args: unknown[]) => mockSetToken(...(args as [string])),
    clearToken: (...args: unknown[]) => mockClearToken(...(args as [])),
  },
}));

const mockLogin = jest.fn();
const mockLogout = jest.fn();
const mockMe = jest.fn();

jest.mock('@/infrastructure/api/auth-repository', () => ({
  authRepository: {
    login: (...args: unknown[]) => mockLogin(...args),
    logout: (...args: unknown[]) => mockLogout(...args),
    me: (...args: unknown[]) => mockMe(...args),
  },
}));

// client.ts chama setUnauthorizedHandler no momento da criação da store;
// mock simples sem lógica
jest.mock('@/infrastructure/api/client', () => ({
  setUnauthorizedHandler: jest.fn(),
  apiClient: {},
  ApiError: class ApiError extends Error {
    status: number;
    detail: string;
    constructor(status: number, detail: string) {
      super(detail);
      this.name = 'ApiError';
      this.status = status;
      this.detail = detail;
    }
  },
}));

// ---------------------------------------------------------------------------
// Imports após mocks
// ---------------------------------------------------------------------------

import { useAuthStore } from '../../src/store/auth-store';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function getStore() {
  return useAuthStore.getState();
}

const MOCK_USER = {
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  roles: ['user'],
  permissions: ['read'],
};

const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiJ9.test.token';

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  useAuthStore.setState({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  });
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// restoreSession
// ---------------------------------------------------------------------------

describe('restoreSession', () => {
  it('autentica o usuário quando token válido existe', async () => {
    mockGetToken.mockResolvedValue(MOCK_TOKEN);
    mockMe.mockResolvedValue(MOCK_USER);

    await getStore().restoreSession();

    const { user, token, isAuthenticated, isLoading, error } = getStore();
    expect(user).toEqual(MOCK_USER);
    expect(token).toBe(MOCK_TOKEN);
    expect(isAuthenticated).toBe(true);
    expect(isLoading).toBe(false);
    expect(error).toBeNull();
  });

  it('não autentica quando não há token armazenado', async () => {
    mockGetToken.mockResolvedValue(null);

    await getStore().restoreSession();

    const { user, token, isAuthenticated, isLoading } = getStore();
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isLoading).toBe(false);
    expect(mockMe).not.toHaveBeenCalled();
  });

  it('limpa o token e reseta o estado quando a API retorna erro', async () => {
    mockGetToken.mockResolvedValue(MOCK_TOKEN);
    mockMe.mockRejectedValue(new Error('Token inválido'));

    await getStore().restoreSession();

    const { user, token, isAuthenticated, isLoading } = getStore();
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isLoading).toBe(false);
    expect(mockClearToken).toHaveBeenCalledTimes(1);
  });

  it('define isLoading=true durante a execução', async () => {
    let capturedLoading = false;
    mockGetToken.mockImplementation(async () => {
      capturedLoading = useAuthStore.getState().isLoading;
      return MOCK_TOKEN;
    });
    mockMe.mockResolvedValue(MOCK_USER);

    await getStore().restoreSession();

    expect(capturedLoading).toBe(true);
    expect(getStore().isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// login
// ---------------------------------------------------------------------------

describe('login', () => {
  it('autentica o usuário com credenciais válidas', async () => {
    mockLogin.mockResolvedValue({ token: MOCK_TOKEN, token_type: 'bearer' });
    mockMe.mockResolvedValue(MOCK_USER);
    mockSetToken.mockResolvedValue(undefined);

    await getStore().login('test@example.com', 'password123');

    const { user, token, isAuthenticated, isLoading, error } = getStore();
    expect(user).toEqual(MOCK_USER);
    expect(token).toBe(MOCK_TOKEN);
    expect(isAuthenticated).toBe(true);
    expect(isLoading).toBe(false);
    expect(error).toBeNull();
    expect(mockSetToken).toHaveBeenCalledWith(MOCK_TOKEN);
  });

  it('define error e rejeita quando as credenciais são inválidas', async () => {
    const authError = new Error('Credenciais inválidas');
    mockLogin.mockRejectedValue(authError);

    await expect(getStore().login('wrong@email.com', 'wrongpass')).rejects.toThrow(
      'Credenciais inválidas',
    );

    const { user, isAuthenticated, isLoading, error } = getStore();
    expect(user).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(isLoading).toBe(false);
    expect(error).toBe('Credenciais inválidas');
  });

  it('usa mensagem padrão quando o erro não é uma instância de Error', async () => {
    mockLogin.mockRejectedValue('string error');

    await expect(getStore().login('a@b.com', 'pw')).rejects.toBe('string error');

    const { error } = getStore();
    expect(error).toBe('Erro ao fazer login. Tente novamente.');
  });

  it('define isLoading=true durante a execução e false no final', async () => {
    let capturedLoading = false;
    mockLogin.mockImplementation(async () => {
      capturedLoading = useAuthStore.getState().isLoading;
      return { token: MOCK_TOKEN, token_type: 'bearer' };
    });
    mockMe.mockResolvedValue(MOCK_USER);
    mockSetToken.mockResolvedValue(undefined);

    await getStore().login('test@example.com', 'password123');

    expect(capturedLoading).toBe(true);
    expect(getStore().isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// logout
// ---------------------------------------------------------------------------

describe('logout', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: MOCK_USER,
      token: MOCK_TOKEN,
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });
  });

  it('limpa o estado após logout com sucesso', async () => {
    mockLogout.mockResolvedValue(undefined);
    mockClearToken.mockResolvedValue(undefined);

    await getStore().logout();

    const { user, token, isAuthenticated, error } = getStore();
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(error).toBeNull();
    expect(mockClearToken).toHaveBeenCalledTimes(1);
  });

  it('limpa o estado mesmo quando o logout da API falha', async () => {
    mockLogout.mockRejectedValue(new Error('Network error'));
    mockClearToken.mockResolvedValue(undefined);

    // Não deve lançar exceção
    await expect(getStore().logout()).resolves.not.toThrow();

    const { user, token, isAuthenticated } = getStore();
    expect(user).toBeNull();
    expect(token).toBeNull();
    expect(isAuthenticated).toBe(false);
    expect(mockClearToken).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// clearError
// ---------------------------------------------------------------------------

describe('clearError', () => {
  it('reseta o campo error para null', () => {
    useAuthStore.setState({ error: 'Algum erro anterior' });

    getStore().clearError();

    expect(getStore().error).toBeNull();
  });

  it('não altera outros campos do estado', () => {
    useAuthStore.setState({
      user: MOCK_USER,
      token: MOCK_TOKEN,
      isAuthenticated: true,
      error: 'erro',
    });

    getStore().clearError();

    const { user, token, isAuthenticated } = getStore();
    expect(user).toEqual(MOCK_USER);
    expect(token).toBe(MOCK_TOKEN);
    expect(isAuthenticated).toBe(true);
  });
});
