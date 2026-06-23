// Sincronização das contas Microsoft entre dispositivos da mesma conta Tiron.
// O backend guarda metadados + tokens CIFRADOS; só o dono autenticado os lê.

import { apiClient } from '@/infrastructure/api/client';
import type { SingleResponse, MessageResponse } from '@/infrastructure/api/types';

export interface RemoteMicrosoftAccount {
  account_id: string;
  email: string | null;
  display_name: string | null;
  access_token: string | null;
  refresh_token: string | null;
  token_expires_at: number | null; // epoch ms
}

export const remoteAccountApi = {
  list(): Promise<SingleResponse<RemoteMicrosoftAccount[]>> {
    return apiClient.get('/api/v1/integrations/microsoft/accounts');
  },
  upsert(
    accountId: string,
    data: RemoteMicrosoftAccount,
  ): Promise<SingleResponse<RemoteMicrosoftAccount>> {
    return apiClient.put(
      `/api/v1/integrations/microsoft/accounts/${encodeURIComponent(accountId)}`,
      data,
    );
  },
  remove(accountId: string): Promise<MessageResponse> {
    return apiClient.delete(
      `/api/v1/integrations/microsoft/accounts/${encodeURIComponent(accountId)}`,
    );
  },
};
