import { create } from 'zustand';
import { authRepository } from '@/infrastructure/api/auth-repository';
import { SecureStorage } from '@/lib/secure-storage';
import { setUnauthorizedHandler } from '@/infrastructure/api/client';
import { queryClient } from '@/lib/query-client';

// Remove TODO o cache de dados (tarefas, listas, dashboard…) ao trocar de
// identidade, para que dados de um usuário nunca apareçam para outro no mesmo
// dispositivo (logout, 401 ou login de outra conta).
function clearUserCache() {
  queryClient.clear();
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  timezone: string;
  roles: string[];
  permissions: string[];
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  loginWithApple: (identityToken: string, name: string | null) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (partial: Partial<Pick<AuthUser, 'name' | 'email' | 'timezone'>>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Handler de 401: limpa estado de autenticação SEM limpar error
  // (logout() manual do usuário limpa error; 401 automático preserva mensagem)
  setUnauthorizedHandler(() => {
    clearUserCache();
    SecureStorage.clearToken().then(() => {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    });
  });

  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    restoreSession: async () => {
      set({ isLoading: true, error: null });
      try {
        const token = await SecureStorage.getToken();
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        const user = await authRepository.me();
        set({ user, token, isAuthenticated: true, isLoading: false });
      } catch {
        await SecureStorage.clearToken();
        set({ user: null, token: null, isAuthenticated: false, isLoading: false });
      }
    },

    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const tokenData = await authRepository.login(email, password);
        await SecureStorage.setToken(tokenData.token);
        clearUserCache();
        const user = await authRepository.me();
        set({ user, token: tokenData.token, isAuthenticated: true, isLoading: false });
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : 'Erro ao fazer login. Tente novamente.';
        set({ error: message, isLoading: false, isAuthenticated: false });
        throw e;
      }
    },

    register: async (name: string, email: string, password: string) => {
      set({ isLoading: true, error: null });
      try {
        const tokenData = await authRepository.register(name, email, password);
        await SecureStorage.setToken(tokenData.token);
        clearUserCache();
        const user = await authRepository.me();
        set({ user, token: tokenData.token, isAuthenticated: true, isLoading: false });
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : 'Erro ao criar conta. Tente novamente.';
        set({ error: message, isLoading: false, isAuthenticated: false });
        throw e;
      }
    },

    loginWithGoogle: async (idToken: string) => {
      set({ isLoading: true, error: null });
      try {
        const tokenData = await authRepository.loginWithGoogle(idToken);
        await SecureStorage.setToken(tokenData.token);
        clearUserCache();
        const user = await authRepository.me();
        set({ user, token: tokenData.token, isAuthenticated: true, isLoading: false });
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : 'Erro ao entrar com Google. Tente novamente.';
        set({ error: message, isLoading: false, isAuthenticated: false });
        throw e;
      }
    },

    loginWithApple: async (identityToken: string, name: string | null) => {
      set({ isLoading: true, error: null });
      try {
        const tokenData = await authRepository.loginWithApple(identityToken, name);
        await SecureStorage.setToken(tokenData.token);
        clearUserCache();
        const user = await authRepository.me();
        set({ user, token: tokenData.token, isAuthenticated: true, isLoading: false });
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : 'Erro ao entrar com Apple. Tente novamente.';
        set({ error: message, isLoading: false, isAuthenticated: false });
        throw e;
      }
    },

    logout: async () => {
      try {
        await authRepository.logout();
      } catch {
        // ignore logout errors
      }
      await SecureStorage.clearToken();
      clearUserCache();
      set({ user: null, token: null, isAuthenticated: false, error: null });
    },

    clearError: () => set({ error: null }),

    updateUser: (partial) =>
      set((state) => ({
        user: state.user ? { ...state.user, ...partial } : state.user,
      })),
  };
});
