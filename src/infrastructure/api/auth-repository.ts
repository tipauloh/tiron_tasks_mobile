import { apiClient } from './client';
import type {
  SingleResponse,
  TokenResponse,
  UserMeResponse,
} from './types';

export const authRepository = {
  async login(email: string, password: string): Promise<TokenResponse> {
    const res = await apiClient.post<SingleResponse<TokenResponse>>(
      '/api/v1/auth/login',
      { email, password },
      { skipAuth: true },
    );
    return res.data;
  },

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<TokenResponse> {
    const res = await apiClient.post<SingleResponse<TokenResponse>>(
      '/api/v1/auth/register',
      { name, email, password },
      { skipAuth: true },
    );
    return res.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/api/v1/auth/logout');
  },

  async refresh(): Promise<TokenResponse> {
    const res = await apiClient.post<SingleResponse<TokenResponse>>(
      '/api/v1/auth/refresh',
    );
    return res.data;
  },

  async me(): Promise<UserMeResponse> {
    const res = await apiClient.get<SingleResponse<UserMeResponse>>(
      '/api/v1/auth/me',
    );
    return res.data;
  },

  async loginWithGoogle(idToken: string): Promise<TokenResponse> {
    const res = await apiClient.post<SingleResponse<TokenResponse>>(
      '/api/v1/auth/google',
      { idToken },
      { skipAuth: true },
    );
    return res.data;
  },

  async loginWithApple(
    identityToken: string,
    name: string | null,
  ): Promise<TokenResponse> {
    const res = await apiClient.post<SingleResponse<TokenResponse>>(
      '/api/v1/auth/apple',
      { identityToken, name },
      { skipAuth: true },
    );
    return res.data;
  },
};
