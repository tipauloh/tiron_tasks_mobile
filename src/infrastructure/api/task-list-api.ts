import { apiClient } from './client';
import type {
  ApiTaskListCreateRequest,
  ApiTaskListFull,
  ApiTaskListUpdateRequest,
  MessageResponse,
  SingleResponse,
} from './types';

const BASE = '/api/v1/task-lists';

export const taskListApi = {
  list(): Promise<SingleResponse<ApiTaskListFull[]>> {
    return apiClient.get(BASE);
  },

  create(data: ApiTaskListCreateRequest): Promise<SingleResponse<ApiTaskListFull>> {
    return apiClient.post(BASE, data);
  },

  update(id: number, data: ApiTaskListUpdateRequest): Promise<SingleResponse<ApiTaskListFull>> {
    return apiClient.put(`${BASE}/${id}`, data);
  },

  delete(id: number): Promise<MessageResponse> {
    return apiClient.delete(`${BASE}/${id}`);
  },
};
