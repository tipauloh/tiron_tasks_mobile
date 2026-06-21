/**
 * Testes unitários do hook useDashboard (TanStack Query v5).
 * Cobre: busca de dados, estado de loading, estado de erro.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockTaskApiDashboard = jest.fn();
const mockTaskApiMyDay = jest.fn();
const mockTaskApiImportant = jest.fn();
const mockTaskApiUpcoming = jest.fn();
const mockTaskApiList = jest.fn();

jest.mock('@/infrastructure/api/task-api', () => ({
  taskApi: {
    dashboard: (...args: unknown[]) => mockTaskApiDashboard(...args),
    myDay: (...args: unknown[]) => mockTaskApiMyDay(...args),
    important: (...args: unknown[]) => mockTaskApiImportant(...args),
    upcoming: (...args: unknown[]) => mockTaskApiUpcoming(...args),
    list: (...args: unknown[]) => mockTaskApiList(...args),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateStatus: jest.fn(),
    toggleFavorite: jest.fn(),
    getById: jest.fn(),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';
import { useDashboard, DASHBOARD_QUERY_KEY } from '../../src/hooks/api/use-dashboard';
import type { ApiDashboard, SingleResponse } from '../../src/infrastructure/api/types';

// Scheduler síncrono para testes
notifyManager.setScheduler((cb) => cb());

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DASHBOARD_DATA: ApiDashboard = {
  user_name: 'Paulo',
  counters: {
    pending: 5,
    completed: 10,
    overdue: 2,
    due_today: 3,
  },
  urgent_tasks: [],
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useDashboard
// ---------------------------------------------------------------------------

describe('useDashboard', () => {
  it('retorna os dados do dashboard da API', async () => {
    mockTaskApiDashboard.mockResolvedValue({ data: DASHBOARD_DATA });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useDashboard(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(DASHBOARD_DATA);
    expect(mockTaskApiDashboard).toHaveBeenCalledTimes(1);
  });

  it('inicia em estado de loading', async () => {
    let resolve!: (v: SingleResponse<ApiDashboard>) => void;
    mockTaskApiDashboard.mockReturnValue(new Promise((r) => { resolve = r; }));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useDashboard(), {
      wrapper: makeWrapper(qc),
    });

    expect(result.current.isPending).toBe(true);

    await act(async () => { resolve({ data: DASHBOARD_DATA }); });
  });

  it('define isError=true quando a API falha', async () => {
    mockTaskApiDashboard.mockRejectedValue(new Error('Dashboard indisponível'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useDashboard(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('usa a DASHBOARD_QUERY_KEY correta', async () => {
    mockTaskApiDashboard.mockResolvedValue({ data: DASHBOARD_DATA });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useDashboard(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Verificar que o cache existe para a chave correta
    const cachedData = qc.getQueryData([...DASHBOARD_QUERY_KEY]);
    expect(cachedData).toEqual(DASHBOARD_DATA);
  });

  it('retorna todos os campos esperados do dashboard', async () => {
    mockTaskApiDashboard.mockResolvedValue({ data: DASHBOARD_DATA });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useDashboard(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data;
    expect(data).toHaveProperty('user_name');
    expect(data).toHaveProperty('counters');
    expect(data).toHaveProperty('urgent_tasks');
    expect(data?.counters).toHaveProperty('pending');
    expect(data?.counters).toHaveProperty('completed');
    expect(data?.counters).toHaveProperty('overdue');
    expect(data?.counters).toHaveProperty('due_today');
  });

  it('usa staleTime de 60 segundos (dados não refetchados imediatamente)', async () => {
    mockTaskApiDashboard.mockResolvedValue({ data: DASHBOARD_DATA });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useDashboard(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Com staleTime de 60s, os dados ainda devem ser considerados fresh
    expect(result.current.isStale).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DASHBOARD_QUERY_KEY constant
// ---------------------------------------------------------------------------

describe('DASHBOARD_QUERY_KEY', () => {
  it('é um array com o valor "dashboard"', () => {
    expect(DASHBOARD_QUERY_KEY).toEqual(['dashboard']);
  });
});
