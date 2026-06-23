import { apiClient } from './client';
import type {
  MessageResponse,
  PaginatedResponse,
  SingleResponse,
} from './types';
import type {
  ApiGoalCreateRequest,
  ApiGoalDetail,
  ApiGoalsDashboard,
  ApiGoalSummary,
  ApiGoalUpdateRequest,
  ApiKeyResultCreateRequest,
  ApiKeyResultSummary,
  ApiKeyResultUpdateRequest,
} from './goal-types';

const BASE = '/api/v1/goals';
const KR_BASE = '/api/v1/key-results';

export type GoalListParams = {
  cursor?: string;
  category?: string;
  status?: string;
  limit?: number;
};

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null);
  if (!entries.length) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

export const goalApi = {
  list(params: GoalListParams = {}): Promise<PaginatedResponse<ApiGoalSummary>> {
    const q = buildQuery(params as Record<string, string | number | undefined>);
    return apiClient.get(`${BASE}${q}`);
  },

  getById(id: number): Promise<SingleResponse<ApiGoalDetail>> {
    return apiClient.get(`${BASE}/${id}`);
  },

  create(data: ApiGoalCreateRequest): Promise<SingleResponse<ApiGoalSummary>> {
    return apiClient.post(`${BASE}`, data);
  },

  update(id: number, data: ApiGoalUpdateRequest): Promise<SingleResponse<ApiGoalSummary>> {
    return apiClient.put(`${BASE}/${id}`, data);
  },

  delete(id: number): Promise<MessageResponse> {
    return apiClient.delete(`${BASE}/${id}`);
  },

  setPrimary(id: number): Promise<SingleResponse<ApiGoalSummary>> {
    return apiClient.post(`${BASE}/${id}/primary`);
  },

  dashboard(): Promise<SingleResponse<ApiGoalsDashboard>> {
    return apiClient.get(`${BASE}/dashboard`);
  },

  reports(): Promise<SingleResponse<unknown>> {
    return apiClient.get(`${BASE}/reports`);
  },

  // ─── Resultados-Chave (KPIs) ───────────────────────────────────────────────

  addKeyResult(
    goalId: number,
    data: ApiKeyResultCreateRequest,
  ): Promise<SingleResponse<ApiKeyResultSummary>> {
    return apiClient.post(`${BASE}/${goalId}/key-results`, data);
  },

  updateKeyResult(
    krId: number,
    data: ApiKeyResultUpdateRequest,
  ): Promise<SingleResponse<ApiKeyResultSummary>> {
    return apiClient.put(`${KR_BASE}/${krId}`, data);
  },

  deleteKeyResult(krId: number): Promise<MessageResponse> {
    return apiClient.delete(`${KR_BASE}/${krId}`);
  },

  // Atualização rápida do valor de um KPI (≤3 taps via QuickUpdateSheet).
  updateKeyResultValue(
    krId: number,
    value: number,
  ): Promise<SingleResponse<ApiKeyResultSummary>> {
    return apiClient.patch(`${KR_BASE}/${krId}/value`, { value });
  },
};
