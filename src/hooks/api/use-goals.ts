import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalApi, type GoalListParams } from '@/infrastructure/api/goal-api';
import type {
  ApiGoalCreateRequest,
  ApiGoalUpdateRequest,
  ApiKeyResultCreateRequest,
  ApiKeyResultUpdateRequest,
} from '@/infrastructure/api/goal-types';

export const GOALS_QUERY_KEY = (filters?: GoalListParams) =>
  filters ? ['goals', filters] : ['goals'];
export const GOAL_QUERY_KEY = (id: string) => ['goals', id];
export const GOALS_DASHBOARD_QUERY_KEY = ['goals', 'dashboard'];

export function useGoals(filters: GoalListParams = {}) {
  return useQuery({
    queryKey: GOALS_QUERY_KEY(filters),
    queryFn: () => goalApi.list(filters),
    staleTime: 30_000,
  });
}

export function useGoal(id: string) {
  return useQuery({
    queryKey: GOAL_QUERY_KEY(id),
    queryFn: async () => {
      const res = await goalApi.getById(parseInt(id));
      return res.data;
    },
    staleTime: 2 * 60_000,
    enabled: !!id,
  });
}

export function useGoalsDashboard() {
  return useQuery({
    queryKey: GOALS_DASHBOARD_QUERY_KEY,
    queryFn: async () => {
      const res = await goalApi.dashboard();
      return res.data;
    },
    staleTime: 30_000,
  });
}

// Invalida todas as queries de metas (lista, detalhe, dashboard) de uma vez.
// Toda mutação de meta/KPI afeta o dashboard (score/destaques) e a lista.
function invalidateGoals(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['goals'] });
}

export function useCreateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApiGoalCreateRequest) => goalApi.create(data),
    onSuccess: () => invalidateGoals(qc),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApiGoalUpdateRequest }) =>
      goalApi.update(parseInt(id), data),
    onSuccess: () => invalidateGoals(qc),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalApi.delete(parseInt(id)),
    onSuccess: () => invalidateGoals(qc),
  });
}

export function useSetPrimaryGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalApi.setPrimary(parseInt(id)),
    onSuccess: () => invalidateGoals(qc),
  });
}

// Atualização rápida do valor de um KPI — usada pelo QuickUpdateSheet (≤3 taps).
export function useUpdateKeyResultValue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      goalApi.updateKeyResultValue(parseInt(id), value),
    onSuccess: () => invalidateGoals(qc),
  });
}

export function useAddKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, data }: { goalId: string; data: ApiKeyResultCreateRequest }) =>
      goalApi.addKeyResult(parseInt(goalId), data),
    onSuccess: () => invalidateGoals(qc),
  });
}

export function useUpdateKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApiKeyResultUpdateRequest }) =>
      goalApi.updateKeyResult(parseInt(id), data),
    onSuccess: () => invalidateGoals(qc),
  });
}

export function useDeleteKeyResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => goalApi.deleteKeyResult(parseInt(id)),
    onSuccess: () => invalidateGoals(qc),
  });
}
