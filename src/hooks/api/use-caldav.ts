import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { caldavApi, type CaldavCreateTokenRequest } from '@/infrastructure/api/caldav-api';

export const CALDAV_TOKENS_QUERY_KEY = ['caldav', 'tokens'];

export function useCaldavTokens() {
  return useQuery({
    queryKey: CALDAV_TOKENS_QUERY_KEY,
    queryFn: async () => {
      const res = await caldavApi.listTokens();
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useCreateCaldavToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CaldavCreateTokenRequest = {}) => caldavApi.createToken(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CALDAV_TOKENS_QUERY_KEY });
    },
  });
}

export function useDeleteCaldavToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => caldavApi.deleteToken(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CALDAV_TOKENS_QUERY_KEY });
    },
  });
}
