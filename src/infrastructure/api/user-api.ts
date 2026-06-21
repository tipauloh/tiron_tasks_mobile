import { apiClient } from './client';
import type { SingleResponse } from './types';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  email_verified_at: string | null;
  created_at: string | null;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  password?: string;
  current_password?: string;
}

export const userApi = {
  getProfile(): Promise<SingleResponse<UserProfile>> {
    return apiClient.get('/api/v1/user/profile');
  },
  updateProfile(data: UpdateProfileRequest): Promise<SingleResponse<UserProfile>> {
    return apiClient.put('/api/v1/user/profile', data);
  },
};
