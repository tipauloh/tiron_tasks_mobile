import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskApi, type TaskListParams } from '@/infrastructure/api/task-api';
import type { ApiTaskCreateRequest, ApiTaskUpdateRequest } from '@/infrastructure/api/types';
import { DASHBOARD_QUERY_KEY } from './use-dashboard';

export const TASKS_QUERY_KEY = (filters?: TaskListParams) =>
  filters ? ['tasks', filters] : ['tasks'];
export const TASK_QUERY_KEY = (id: string) => ['tasks', id];

export function useTasks(filters: TaskListParams = {}) {
  return useQuery({
    queryKey: TASKS_QUERY_KEY(filters),
    queryFn: () => taskApi.list(filters),
    staleTime: 30_000,
  });
}

export function useAllTasksForCalendar() {
  return useQuery({
    queryKey: ['tasks', 'calendar-all'],
    queryFn: async () => {
      const tasks: import('@/infrastructure/api/types').ApiTaskSummary[] = [];
      let cursor: string | undefined;
      do {
        const result = await taskApi.list({ limit: 100, cursor });
        tasks.push(...result.data);
        cursor = result.meta.next_cursor ?? undefined;
      } while (cursor && tasks.length < 500);
      return tasks;
    },
    staleTime: 60_000,
  });
}

export function useMyDay() {
  return useQuery({
    queryKey: ['tasks', 'my-day'],
    queryFn: async () => {
      const res = await taskApi.myDay();
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useImportantTasks() {
  return useQuery({
    queryKey: ['tasks', 'important'],
    queryFn: async () => {
      const res = await taskApi.important();
      return res.data;
    },
    staleTime: 30_000,
  });
}

export function useUpcomingTasks() {
  return useQuery({
    queryKey: ['tasks', 'upcoming'],
    queryFn: async () => {
      const res = await taskApi.upcoming();
      return res.data;
    },
    staleTime: 60_000,
  });
}

export function useTask(id: string) {
  return useQuery({
    queryKey: TASK_QUERY_KEY(id),
    queryFn: async () => {
      const res = await taskApi.getById(parseInt(id));
      return res.data;
    },
    staleTime: 2 * 60_000,
    enabled: !!id,
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApiTaskCreateRequest) => taskApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApiTaskUpdateRequest }) =>
      taskApi.update(parseInt(id), data),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: TASK_QUERY_KEY(id) });
      qc.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskApi.delete(parseInt(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

export function useToggleTaskStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      taskApi.updateStatus(parseInt(id), status),
    onSuccess: (_res, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: TASK_QUERY_KEY(id) });
      qc.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });
    },
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      taskApi.toggleFavorite(parseInt(id), isFavorite),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
