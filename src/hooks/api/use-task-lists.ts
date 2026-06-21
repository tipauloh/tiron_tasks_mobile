import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskListApi } from '@/infrastructure/api/task-list-api';
import type { ApiTaskListCreateRequest, ApiTaskListUpdateRequest } from '@/infrastructure/api/types';

export const TASK_LISTS_QUERY_KEY = ['task-lists'] as const;

export function useTaskLists() {
  return useQuery({
    queryKey: TASK_LISTS_QUERY_KEY,
    queryFn: async () => {
      const res = await taskListApi.list();
      return res.data;
    },
    staleTime: 5 * 60_000,
  });
}

export function useCreateTaskList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApiTaskListCreateRequest) => taskListApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_LISTS_QUERY_KEY });
    },
  });
}

export function useUpdateTaskList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ApiTaskListUpdateRequest }) =>
      taskListApi.update(parseInt(id), data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_LISTS_QUERY_KEY });
    },
  });
}

export function useArchiveTaskList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => taskListApi.delete(parseInt(id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TASK_LISTS_QUERY_KEY });
    },
  });
}
