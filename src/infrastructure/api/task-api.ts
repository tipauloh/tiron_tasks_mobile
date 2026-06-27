import { apiClient } from './client';
import type {
  ApiDashboard,
  ApiEmailSyncItem,
  ApiEmailSyncRequest,
  ApiEmailSyncResult,
  ApiProductivity,
  ApiReminder,
  ApiTaskCreateRequest,
  ApiTaskDetail,
  ApiTaskReorderItem,
  ApiTaskSummary,
  ApiTaskUpdateRequest,
  MessageResponse,
  PaginatedResponse,
  SingleResponse,
} from './types';

const BASE = '/api/v1/tasks';

export type TaskListParams = {
  cursor?: string;
  status?: string;
  priority?: string;
  task_list_id?: number;
  search?: string;
  is_favorite?: boolean;
  limit?: number;
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export const taskApi = {
  list(params: TaskListParams = {}): Promise<PaginatedResponse<ApiTaskSummary>> {
    const q = buildQuery(params as Record<string, string | number | undefined>);
    return apiClient.get(`${BASE}${q}`);
  },

  myDay(): Promise<SingleResponse<ApiTaskSummary[]>> {
    return apiClient.get(`${BASE}/my-day`);
  },

  important(): Promise<SingleResponse<ApiTaskSummary[]>> {
    return apiClient.get(`${BASE}/important`);
  },

  upcoming(): Promise<SingleResponse<ApiTaskSummary[]>> {
    return apiClient.get(`${BASE}/upcoming`);
  },

  search(query: string): Promise<SingleResponse<ApiTaskSummary[]>> {
    return apiClient.get(`${BASE}/search?q=${encodeURIComponent(query)}`);
  },

  getById(id: number): Promise<SingleResponse<ApiTaskDetail>> {
    return apiClient.get(`${BASE}/${id}`);
  },

  create(data: ApiTaskCreateRequest): Promise<SingleResponse<ApiTaskSummary>> {
    return apiClient.post(`${BASE}`, data);
  },

  update(id: number, data: ApiTaskUpdateRequest): Promise<SingleResponse<ApiTaskSummary>> {
    return apiClient.put(`${BASE}/${id}`, data);
  },

  delete(id: number): Promise<MessageResponse> {
    return apiClient.delete(`${BASE}/${id}`);
  },

  updateStatus(
    id: number,
    status: string,
    recurAction?: 'next' | 'end',
  ): Promise<SingleResponse<ApiTaskSummary>> {
    return apiClient.patch(`${BASE}/${id}/status`, { status, recur_action: recurAction });
  },

  toggleFavorite(id: number, isFavorite: boolean): Promise<SingleResponse<ApiTaskSummary>> {
    return apiClient.patch(`${BASE}/${id}/favorite`, { is_favorite: isFavorite });
  },

  reorder(items: ApiTaskReorderItem[]): Promise<MessageResponse> {
    return apiClient.patch(`${BASE}/reorder`, { items });
  },

  // Espelha e-mails sinalizados do Microsoft 365 como tarefas (idempotente).
  // MULTI-CONTA: opts.accountId escopa a reconciliação a uma conta; opts.reconcile
  // pede ao backend para concluir tarefas de e-mails não mais sinalizados.
  emailSync(
    items: ApiEmailSyncItem[],
    opts?: { accountId?: string; reconcile?: boolean },
  ): Promise<SingleResponse<ApiEmailSyncResult>> {
    const body: ApiEmailSyncRequest = { items };
    if (opts?.accountId != null) body.account_id = opts.accountId;
    if (opts?.reconcile != null) body.reconcile = opts.reconcile;
    return apiClient.post(`${BASE}/email-sync`, body);
  },

  dashboard(): Promise<SingleResponse<ApiDashboard>> {
    return apiClient.get('/api/v1/dashboard');
  },

  // Produção de tarefas concluídas (today/week/month/year/total/streak/monthly).
  productivity(): Promise<SingleResponse<ApiProductivity>> {
    return apiClient.get(`${BASE}/productivity`);
  },

  // Lembretes
  // remindAt: 'YYYY-MM-DDTHH:MM:SS'
  addReminder(taskId: number, remindAt: string): Promise<SingleResponse<ApiReminder>> {
    return apiClient.post(`${BASE}/${taskId}/reminders`, { remind_at: remindAt });
  },

  deleteReminder(reminderId: number): Promise<MessageResponse> {
    return apiClient.delete(`${BASE}/reminders/${reminderId}`);
  },
};
