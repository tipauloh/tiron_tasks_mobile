/**
 * Testes unitários dos hooks de metas (TanStack Query v5).
 * Mock completo do goalApi; QueryClient real com renderHook (RNTL v14, async).
 */

const mockList = jest.fn();
const mockGetById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockSetPrimary = jest.fn();
const mockDashboard = jest.fn();
const mockAddKr = jest.fn();
const mockUpdateKr = jest.fn();
const mockDeleteKr = jest.fn();
const mockUpdateKrValue = jest.fn();

jest.mock('@/infrastructure/api/goal-api', () => ({
  goalApi: {
    list: (...a: unknown[]) => mockList(...a),
    getById: (...a: unknown[]) => mockGetById(...a),
    create: (...a: unknown[]) => mockCreate(...a),
    update: (...a: unknown[]) => mockUpdate(...a),
    delete: (...a: unknown[]) => mockDelete(...a),
    setPrimary: (...a: unknown[]) => mockSetPrimary(...a),
    dashboard: (...a: unknown[]) => mockDashboard(...a),
    addKeyResult: (...a: unknown[]) => mockAddKr(...a),
    updateKeyResult: (...a: unknown[]) => mockUpdateKr(...a),
    deleteKeyResult: (...a: unknown[]) => mockDeleteKr(...a),
    updateKeyResultValue: (...a: unknown[]) => mockUpdateKrValue(...a),
  },
}));

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';

notifyManager.setScheduler((cb) => cb());

import {
  useGoals,
  useGoal,
  useGoalsDashboard,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  useSetPrimaryGoal,
  useUpdateKeyResultValue,
  useAddKeyResult,
  useUpdateKeyResult,
  useDeleteKeyResult,
} from '../../src/hooks/api/use-goals';
import type { ApiGoalSummary, ApiGoalsDashboard } from '../../src/infrastructure/api/goal-types';
import type { PaginatedResponse } from '../../src/infrastructure/api/types';

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: qc }, children);
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

const GOAL: ApiGoalSummary = {
  id: 1,
  title: 'Correr maratona',
  category: 'Saúde',
  status: 'on_track',
  end_date: null,
  is_primary: false,
  weight: 1,
  progress: 0.5,
  key_results: [],
};

const PAGINATED: PaginatedResponse<ApiGoalSummary> = {
  data: [GOAL],
  meta: { next_cursor: null, has_more: false },
};

const DASHBOARD: ApiGoalsDashboard = {
  score: 0.6,
  status_label: 'No caminho',
  trend: 'up',
  primary_goal: GOAL,
  goals: [GOAL],
  kpis: [],
};

beforeEach(() => jest.clearAllMocks());

describe('useGoals', () => {
  it('retorna a lista paginada', async () => {
    mockList.mockResolvedValue(PAGINATED);
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useGoals(), { wrapper: makeWrapper(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(PAGINATED);
    expect(mockList).toHaveBeenCalledWith({});
  });

  it('passa filtros para goalApi.list', async () => {
    mockList.mockResolvedValue(PAGINATED);
    const qc = makeQueryClient();
    const filters = { category: 'Saúde', limit: 10 };
    const { result } = await renderHook(() => useGoals(filters), { wrapper: makeWrapper(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockList).toHaveBeenCalledWith(filters);
  });

  it('isError quando a API falha', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useGoals(), { wrapper: makeWrapper(qc) });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useGoal', () => {
  it('retorna uma meta pelo id', async () => {
    mockGetById.mockResolvedValue({ data: GOAL });
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useGoal('1'), { wrapper: makeWrapper(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(GOAL);
    expect(mockGetById).toHaveBeenCalledWith(1);
  });

  it('não busca quando id vazio', async () => {
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useGoal(''), { wrapper: makeWrapper(qc) });
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockGetById).not.toHaveBeenCalled();
  });
});

describe('useGoalsDashboard', () => {
  it('retorna o dashboard', async () => {
    mockDashboard.mockResolvedValue({ data: DASHBOARD });
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useGoalsDashboard(), { wrapper: makeWrapper(qc) });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(DASHBOARD);
  });
});

describe('useCreateGoal', () => {
  it('chama goalApi.create e invalida goals', async () => {
    mockCreate.mockResolvedValue({ data: GOAL });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const { result } = await renderHook(() => useCreateGoal(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ title: 'Nova', category: 'Saúde' });
    });
    expect(mockCreate).toHaveBeenCalledWith({ title: 'Nova', category: 'Saúde' });
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['goals'] }));
    invalidateSpy.mockRestore();
  });
});

describe('useUpdateGoal', () => {
  it('chama goalApi.update com id numérico', async () => {
    mockUpdate.mockResolvedValue({ data: GOAL });
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useUpdateGoal(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ id: '1', data: { title: 'X' } });
    });
    expect(mockUpdate).toHaveBeenCalledWith(1, { title: 'X' });
  });
});

describe('useDeleteGoal', () => {
  it('chama goalApi.delete com id numérico', async () => {
    mockDelete.mockResolvedValue({ message: 'ok' });
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useDeleteGoal(), { wrapper: makeWrapper(qc) });
    await act(async () => { await result.current.mutateAsync('5'); });
    expect(mockDelete).toHaveBeenCalledWith(5);
  });
});

describe('useSetPrimaryGoal', () => {
  it('chama goalApi.setPrimary', async () => {
    mockSetPrimary.mockResolvedValue({ data: GOAL });
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useSetPrimaryGoal(), { wrapper: makeWrapper(qc) });
    await act(async () => { await result.current.mutateAsync('3'); });
    expect(mockSetPrimary).toHaveBeenCalledWith(3);
  });
});

describe('useUpdateKeyResultValue', () => {
  it('chama goalApi.updateKeyResultValue com id e value', async () => {
    mockUpdateKrValue.mockResolvedValue({ data: {} });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');
    const { result } = await renderHook(() => useUpdateKeyResultValue(), { wrapper: makeWrapper(qc) });
    await act(async () => { await result.current.mutateAsync({ id: '9', value: 42 }); });
    expect(mockUpdateKrValue).toHaveBeenCalledWith(9, 42, undefined);
    expect(invalidateSpy).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ['goals'] }));
    invalidateSpy.mockRestore();
  });

  it('repassa a observação (note) para goalApi.updateKeyResultValue', async () => {
    mockUpdateKrValue.mockResolvedValue({ data: {} });
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useUpdateKeyResultValue(), { wrapper: makeWrapper(qc) });
    await act(async () => { await result.current.mutateAsync({ id: '9', value: 42, note: 'corri 5km' }); });
    expect(mockUpdateKrValue).toHaveBeenCalledWith(9, 42, 'corri 5km');
  });
});

describe('key-result mutations', () => {
  it('useAddKeyResult chama addKeyResult com goalId numérico', async () => {
    mockAddKr.mockResolvedValue({ data: {} });
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useAddKeyResult(), { wrapper: makeWrapper(qc) });
    const data = { title: 'KR', kpi_type: 'number' as const, start_value: 0, target_value: 10 };
    await act(async () => { await result.current.mutateAsync({ goalId: '2', data }); });
    expect(mockAddKr).toHaveBeenCalledWith(2, data);
  });

  it('useUpdateKeyResult chama updateKeyResult com id numérico', async () => {
    mockUpdateKr.mockResolvedValue({ data: {} });
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useUpdateKeyResult(), { wrapper: makeWrapper(qc) });
    await act(async () => { await result.current.mutateAsync({ id: '4', data: { title: 'Y' } }); });
    expect(mockUpdateKr).toHaveBeenCalledWith(4, { title: 'Y' });
  });

  it('useDeleteKeyResult chama deleteKeyResult com id numérico', async () => {
    mockDeleteKr.mockResolvedValue({ message: 'ok' });
    const qc = makeQueryClient();
    const { result } = await renderHook(() => useDeleteKeyResult(), { wrapper: makeWrapper(qc) });
    await act(async () => { await result.current.mutateAsync('7'); });
    expect(mockDeleteKr).toHaveBeenCalledWith(7);
  });
});
