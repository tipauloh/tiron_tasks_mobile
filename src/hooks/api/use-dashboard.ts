import { useQuery } from '@tanstack/react-query';
import { taskApi } from '@/infrastructure/api/task-api';

export const DASHBOARD_QUERY_KEY = ['dashboard'] as const;

export function useDashboard() {
  return useQuery({
    queryKey: DASHBOARD_QUERY_KEY,
    queryFn: async () => {
      const res = await taskApi.dashboard();
      return res.data;
    },
    staleTime: 60_000,
  });
}
