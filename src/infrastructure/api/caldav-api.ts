import { apiClient } from './client';
import type { MessageResponse, SingleResponse } from './types';

const BASE = '/api/v1/caldav';

// Endereço fixo do servidor CalDAV (mostrado ao usuário para configurar o cliente).
export const CALDAV_SERVER_URL = 'https://synctasks.tiron.com.br';

// Um token CalDAV listado pelo backend. `token` (o segredo em si) NUNCA é
// retornado por listTokens — apenas no momento da criação (createToken).
export interface CaldavToken {
  id: number;
  username: string;
  label: string | null;
  revoked: boolean;
  last_used_at: string | null;
  created_at: string | null;
}

// Resposta de createToken: traz o segredo `token` UMA ÚNICA vez.
export interface CaldavTokenCreated {
  id: number;
  username: string;
  token: string;
}

export interface CaldavCreateTokenRequest {
  label?: string;
  regenerate?: boolean;
}

export const caldavApi = {
  listTokens(): Promise<SingleResponse<CaldavToken[]>> {
    return apiClient.get(`${BASE}/tokens`);
  },

  createToken(
    data: CaldavCreateTokenRequest = {},
  ): Promise<SingleResponse<CaldavTokenCreated>> {
    return apiClient.post(`${BASE}/tokens`, data);
  },

  deleteToken(id: number): Promise<MessageResponse> {
    return apiClient.delete(`${BASE}/tokens/${id}`);
  },
};
