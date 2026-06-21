/**
 * Testes unitários dos hooks de task lists (TanStack Query v5).
 * Cobre: useTaskLists, useCreateTaskList, useUpdateTaskList, useArchiveTaskList.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockTaskListApiList = jest.fn();
const mockTaskListApiCreate = jest.fn();
const mockTaskListApiUpdate = jest.fn();
const mockTaskListApiDelete = jest.fn();

jest.mock('@/infrastructure/api/task-list-api', () => ({
  taskListApi: {
    list: (...args: unknown[]) => mockTaskListApiList(...args),
    create: (...args: unknown[]) => mockTaskListApiCreate(...args),
    update: (...args: unknown[]) => mockTaskListApiUpdate(...args),
    delete: (...args: unknown[]) => mockTaskListApiDelete(...args),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native'; // waitFor is used in useTaskLists tests
import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';
import {
  useTaskLists,
  useCreateTaskList,
  useUpdateTaskList,
  useArchiveTaskList,
  TASK_LISTS_QUERY_KEY,
} from '../../src/hooks/api/use-task-lists';
import type { ApiTaskListFull, SingleResponse, MessageResponse } from '../../src/infrastructure/api/types';

// Configurar scheduler síncrono para testes
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

const TASK_LIST: ApiTaskListFull = {
  id: 1,
  name: 'Trabalho',
  color: '#3B82F6',
  icon: '💼',
  position: 0,
  archived_at: null,
  created_at: '2026-06-20T00:00:00.000Z',
  updated_at: '2026-06-20T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// useTaskLists
// ---------------------------------------------------------------------------

describe('useTaskLists', () => {
  it('retorna as listas da API', async () => {
    mockTaskListApiList.mockResolvedValue({ data: [TASK_LIST] });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useTaskLists(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([TASK_LIST]);
    expect(mockTaskListApiList).toHaveBeenCalledTimes(1);
  });

  it('inicia no estado loading', async () => {
    let resolve!: (v: SingleResponse<ApiTaskListFull[]>) => void;
    mockTaskListApiList.mockReturnValue(new Promise((r) => { resolve = r; }));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useTaskLists(), {
      wrapper: makeWrapper(qc),
    });

    expect(result.current.isPending).toBe(true);

    await act(async () => { resolve({ data: [TASK_LIST] }); });
  });

  it('define isError=true quando a API falha', async () => {
    mockTaskListApiList.mockRejectedValue(new Error('API error'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useTaskLists(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useCreateTaskList
// ---------------------------------------------------------------------------

describe('useCreateTaskList', () => {
  it('chama taskListApi.create com os dados corretos', async () => {
    mockTaskListApiCreate.mockResolvedValue({ data: TASK_LIST });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useCreateTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Trabalho', color: '#3B82F6' });
    });

    expect(mockTaskListApiCreate).toHaveBeenCalledWith({ name: 'Trabalho', color: '#3B82F6' });
  });

  it('invalida a query de task-lists após criação', async () => {
    mockTaskListApiCreate.mockResolvedValue({ data: TASK_LIST });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useCreateTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Nova lista' });
    });

    // Verificar que invalidateQueries foi chamada com a chave correta
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: TASK_LISTS_QUERY_KEY }),
    );
    invalidateSpy.mockRestore();
  });

  it('sinaliza sucesso após criação', async () => {
    mockTaskListApiCreate.mockResolvedValue({ data: TASK_LIST });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useCreateTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ name: 'Pessoal' });
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('rejeita quando a API falha', async () => {
    mockTaskListApiCreate.mockRejectedValue(new Error('Falha ao criar'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useCreateTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ name: 'Teste' })).rejects.toThrow('Falha ao criar');
    });

    expect(result.current.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useUpdateTaskList
// ---------------------------------------------------------------------------

describe('useUpdateTaskList', () => {
  it('chama taskListApi.update com id e dados corretos', async () => {
    mockTaskListApiUpdate.mockResolvedValue({ data: { ...TASK_LIST, name: 'Atualizado' } });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useUpdateTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '1', data: { name: 'Atualizado' } });
    });

    expect(mockTaskListApiUpdate).toHaveBeenCalledWith(1, { name: 'Atualizado' });
  });

  it('invalida a query de task-lists após atualização', async () => {
    mockTaskListApiUpdate.mockResolvedValue({ data: TASK_LIST });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useUpdateTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '1', data: { color: '#FF0000' } });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: TASK_LISTS_QUERY_KEY }),
    );
    invalidateSpy.mockRestore();
  });

  it('converte string id para número ao chamar a API', async () => {
    mockTaskListApiUpdate.mockResolvedValue({ data: TASK_LIST });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useUpdateTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '42', data: { name: 'Novo nome' } });
    });

    expect(mockTaskListApiUpdate).toHaveBeenCalledWith(42, { name: 'Novo nome' });
  });
});

// ---------------------------------------------------------------------------
// useArchiveTaskList
// ---------------------------------------------------------------------------

describe('useArchiveTaskList', () => {
  it('chama taskListApi.delete com o id correto', async () => {
    const response: MessageResponse = { message: 'Archived' };
    mockTaskListApiDelete.mockResolvedValue(response);
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useArchiveTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync('3');
    });

    expect(mockTaskListApiDelete).toHaveBeenCalledWith(3);
  });

  it('invalida a query de task-lists após arquivamento', async () => {
    mockTaskListApiDelete.mockResolvedValue({ message: 'ok' });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useArchiveTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync('1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: TASK_LISTS_QUERY_KEY }),
    );
    invalidateSpy.mockRestore();
  });

  it('rejeita quando a API falha', async () => {
    mockTaskListApiDelete.mockRejectedValue(new Error('Não encontrado'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useArchiveTaskList(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await expect(result.current.mutateAsync('99')).rejects.toThrow('Não encontrado');
    });
  });
});
