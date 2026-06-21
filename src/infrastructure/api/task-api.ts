import { apiClient } from './client';
import type {
  ApiDashboard,
  ApiTaskCreateRequest,
  ApiTaskDetail,
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

  updateStatus(id: number, status: string): Promise<SingleResponse<ApiTaskSummary>> {
    return apiClient.patch(`${BASE}/${id}/status`, { status });
  },

  toggleFavorite(id: number, isFavorite: boolean): Promise<SingleResponse<ApiTaskSummary>> {
    return apiClient.patch(`${BASE}/${id}/favorite`, { is_favorite: isFavorite });
  },

  dashboard(): Promise<SingleResponse<ApiDashboard>> {
    return apiClient.get('/api/v1/dashboard');
  },
};
