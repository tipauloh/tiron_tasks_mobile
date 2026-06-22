import { Alert } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskApi, type TaskListParams } from '@/infrastructure/api/task-api';
import type { ApiTaskCreateRequest, ApiTaskReorderItem, ApiTaskUpdateRequest } from '@/infrastructure/api/types';
import { mirrorTaskCompletionToEmail } from '@/modules/microsoft365/services/email-mirror';
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
    onSuccess: (res, { id }) => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: TASK_QUERY_KEY(id) });
      qc.invalidateQueries({ queryKey: DASHBOARD_QUERY_KEY });

      // Tarefa vinculada a um e-mail do Microsoft 365: espelha a conclusão no
      // flag do e-mail (best-effort, não bloqueia a UI). Se a sessão não tiver
      // a permissão de escrita ainda, orienta o usuário a reconectar.
      const t = res?.data;
      if (t?.external_email_id && t.external_provider === 'microsoft') {
        void mirrorTaskCompletionToEmail(
          t.external_email_id,
          t.status === 'completed',
          // MULTI-CONTA: espelha na conta correta. Se ausente (tarefa antiga),
          // o mirror usa qualquer sessão armazenada (compat. retro).
          t.external_account_id ?? undefined,
        ).then((r) => {
          if (r.needsReconnect) {
            Alert.alert(
              'Microsoft 365',
              'Para marcar o e-mail como concluído, reconecte sua conta: Perfil → Integrações → Microsoft 365 → Desconectar e Conectar.',
            );
          }
        });
      }
    },
  });
}

export function useReorderTasks() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: ApiTaskReorderItem[]) => taskApi.reorder(items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
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

export function useAddReminder() {
  const qc = useQueryClient();
  return useMutation({
    // taskId aqui é o id da tarefa; remindAt = 'YYYY-MM-DDTHH:MM:SS'
    mutationFn: ({ taskId, remindAt }: { taskId: number; remindAt: string }) =>
      taskApi.addReminder(taskId, remindAt),
    onSuccess: (_res, { taskId }) => {
      qc.invalidateQueries({ queryKey: TASK_QUERY_KEY(String(taskId)) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    // taskId é opcional, usado só para invalidar o detail correto
    mutationFn: ({ reminderId }: { reminderId: number; taskId?: number }) =>
      taskApi.deleteReminder(reminderId),
    onSuccess: (_res, { taskId }) => {
      if (taskId != null) qc.invalidateQueries({ queryKey: TASK_QUERY_KEY(String(taskId)) });
      qc.invalidateQueries({ queryKey: ['tasks'] });
    },
  });
}
