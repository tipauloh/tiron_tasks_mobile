// Microsoft 365 — hooks React Query sobre o serviço/repositórios.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { microsoft365Service } from '../services';
import { microsoft365ItemRepository } from '../repositories';
import type { Microsoft365Item, Microsoft365SourceType } from '../types';

export const MS365_QUERY_KEYS = {
  connection: ['ms365', 'connection'] as const,
  items: (sourceType?: Microsoft365SourceType) =>
    sourceType ? (['ms365', 'items', sourceType] as const) : (['ms365', 'items'] as const),
};

/** Estado da conta/conexão (lê do cache local). */
export function useMicrosoftAccount() {
  return useQuery({
    queryKey: MS365_QUERY_KEYS.connection,
    queryFn: () => microsoft365Service.getConnectionState(),
    staleTime: 10_000,
  });
}

/** Itens sincronizados (e-mails e/ou tarefas) do cache local. */
export function useMicrosoft365Items(sourceType?: Microsoft365SourceType) {
  return useQuery<Microsoft365Item[]>({
    queryKey: MS365_QUERY_KEYS.items(sourceType),
    queryFn: () => microsoft365ItemRepository.listItems(sourceType ? { sourceType } : undefined),
    staleTime: 10_000,
  });
}

function invalidateAll(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['ms365'] });
}

/** Conecta a conta (mock). */
export function useMicrosoftConnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => microsoft365Service.connect(userId),
    onSuccess: () => invalidateAll(qc),
  });
}

/** Desconecta a conta, removendo ou mantendo dados locais. */
export function useMicrosoftDisconnect() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (removeData: boolean) => microsoft365Service.disconnect(removeData),
    onSuccess: () => invalidateAll(qc),
  });
}

/** Dispara uma sincronização. */
export function useMicrosoftSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => microsoft365Service.syncNow(),
    onSuccess: () => invalidateAll(qc),
  });
}
