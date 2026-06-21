import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { userApi, type UpdateProfileRequest } from '@/infrastructure/api/user-api';
import { useAuthStore } from '@/store/auth-store';

export const PROFILE_QUERY_KEY = ['user', 'profile'] as const;

export function useProfile() {
  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: async () => {
      const res = await userApi.getProfile();
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  const updateUser = useAuthStore((s) => s.updateUser);

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => userApi.updateProfile(data),
    onSuccess: (res) => {
      qc.setQueryData(PROFILE_QUERY_KEY, res.data);
      // Sync name/email into auth store so header shows updated name
      if (updateUser) {
        updateUser({ name: res.data.name, email: res.data.email });
      }
    },
  });
}
