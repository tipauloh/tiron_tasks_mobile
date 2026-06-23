/**
 * Testes unitários dos hooks CalDAV (TanStack Query v5).
 * Cobre: useCaldavTokens, useCreateCaldavToken, useDeleteCaldavToken.
 *
 * Estratégia (igual a use-tasks.test.ts):
 * - Mock completo do caldavApi para não fazer requisições reais.
 * - QueryClient real com renderHook de @testing-library/react-native.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockListTokens = jest.fn();
const mockCreateToken = jest.fn();
const mockDeleteToken = jest.fn();

jest.mock('@/infrastructure/api/caldav-api', () => ({
  CALDAV_SERVER_URL: 'https://synctasks.tiron.com.br',
  caldavApi: {
    listTokens: (...args: unknown[]) => mockListTokens(...args),
    createToken: (...args: unknown[]) => mockCreateToken(...args),
    deleteToken: (...args: unknown[]) => mockDeleteToken(...args),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';

notifyManager.setScheduler((cb) => cb());

import {
  useCaldavTokens,
  useCreateCaldavToken,
  useDeleteCaldavToken,
  CALDAV_TOKENS_QUERY_KEY,
} from '../../src/hooks/api/use-caldav';
import type {
  CaldavToken,
  CaldavTokenCreated,
} from '../../src/infrastructure/api/caldav-api';
import type { MessageResponse, SingleResponse } from '../../src/infrastructure/api/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeWrapper(queryClient: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TOKEN: CaldavToken = {
  id: 1,
  username: 'user_abc',
  label: null,
  revoked: false,
  last_used_at: null,
  created_at: '2026-06-20T00:00:00.000Z',
};

const TOKENS_RESPONSE: SingleResponse<CaldavToken[]> = { data: [TOKEN] };

const CREATED: SingleResponse<CaldavTokenCreated> = {
  data: { id: 2, username: 'user_abc', token: 'secret-token-xyz' },
};

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useCaldavTokens
// ---------------------------------------------------------------------------

describe('useCaldavTokens', () => {
  it('retorna a lista de tokens (unwrapped) quando a API é bem-sucedida', async () => {
    mockListTokens.mockResolvedValue(TOKENS_RESPONSE);
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useCaldavTokens(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([TOKEN]);
    expect(mockListTokens).toHaveBeenCalledTimes(1);
  });

  it('define isError=true quando a API falha', async () => {
    mockListTokens.mockRejectedValue(new Error('Server error'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useCaldavTokens(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useCreateCaldavToken
// ---------------------------------------------------------------------------

describe('useCreateCaldavToken', () => {
  it('chama caldavApi.createToken com regenerate', async () => {
    mockCreateToken.mockResolvedValue(CREATED);
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useCreateCaldavToken(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ regenerate: true });
    });

    expect(mockCreateToken).toHaveBeenCalledWith({ regenerate: true });
    expect(result.current.data).toEqual(CREATED);
  });

  it('invalida a query de tokens após sucesso', async () => {
    mockCreateToken.mockResolvedValue(CREATED);
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useCreateCaldavToken(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({});
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CALDAV_TOKENS_QUERY_KEY }),
    );
    invalidateSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useDeleteCaldavToken
// ---------------------------------------------------------------------------

describe('useDeleteCaldavToken', () => {
  it('chama caldavApi.deleteToken com o id correto', async () => {
    const response: MessageResponse = { message: 'ok' };
    mockDeleteToken.mockResolvedValue(response);
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useDeleteCaldavToken(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync(5);
    });

    expect(mockDeleteToken).toHaveBeenCalledWith(5);
  });

  it('invalida a query de tokens após deleção', async () => {
    mockDeleteToken.mockResolvedValue({ message: 'ok' });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useDeleteCaldavToken(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync(1);
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: CALDAV_TOKENS_QUERY_KEY }),
    );
    invalidateSpy.mockRestore();
  });
});
