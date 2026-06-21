import { create } from 'zustand';
import { authRepository } from '@/infrastructure/api/auth-repository';
import { SecureStorage } from '@/lib/secure-storage';
import { setUnauthorizedHandler } from '@/infrastructure/api/client';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
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
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (partial: Partial<Pick<AuthUser, 'name' | 'email'>>) => void;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Handler de 401: limpa estado de autenticação SEM limpar error
  // (logout() manual do usuário limpa error; 401 automático preserva mensagem)
  setUnauthorizedHandler(() => {
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
        const user = await authRepository.me();
        set({ user, token: tokenData.token, isAuthenticated: true, isLoading: false });
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : 'Erro ao criar conta. Tente novamente.';
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
      set({ user: null, token: null, isAuthenticated: false, error: null });
    },

    clearError: () => set({ error: null }),

    updateUser: (partial) =>
      set((state) => ({
        user: state.user ? { ...state.user, ...partial } : state.user,
      })),
  };
});
