/**
 * Testes unitários dos hooks de tarefas (TanStack Query v5).
 * Cobre: useTasks, useCreateTask, useUpdateTask, useDeleteTask, useToggleTaskStatus.
 *
 * Estratégia:
 * - Mock completo do taskApi para não fazer requisições reais.
 * - Usa QueryClient real com renderHook de @testing-library/react-native.
 * - renderHook é async no RNTL v14 — deve ser usado com await.
 */

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockTaskApiList = jest.fn();
const mockTaskApiCreate = jest.fn();
const mockTaskApiUpdate = jest.fn();
const mockTaskApiDelete = jest.fn();
const mockTaskApiUpdateStatus = jest.fn();
const mockTaskApiToggleFavorite = jest.fn();
const mockTaskApiGetById = jest.fn();
const mockTaskApiDashboard = jest.fn();
const mockTaskApiMyDay = jest.fn();
const mockTaskApiImportant = jest.fn();
const mockTaskApiUpcoming = jest.fn();

jest.mock('@/infrastructure/api/task-api', () => ({
  taskApi: {
    list: (...args: unknown[]) => mockTaskApiList(...args),
    create: (...args: unknown[]) => mockTaskApiCreate(...args),
    update: (...args: unknown[]) => mockTaskApiUpdate(...args),
    delete: (...args: unknown[]) => mockTaskApiDelete(...args),
    updateStatus: (...args: unknown[]) => mockTaskApiUpdateStatus(...args),
    toggleFavorite: (...args: unknown[]) => mockTaskApiToggleFavorite(...args),
    getById: (...args: unknown[]) => mockTaskApiGetById(...args),
    dashboard: (...args: unknown[]) => mockTaskApiDashboard(...args),
    myDay: (...args: unknown[]) => mockTaskApiMyDay(...args),
    important: (...args: unknown[]) => mockTaskApiImportant(...args),
    upcoming: (...args: unknown[]) => mockTaskApiUpcoming(...args),
  },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider, notifyManager } from '@tanstack/react-query';

// Configurar o notifyManager de forma SÍNCRONA a nível de módulo.
// Isso é necessário porque o beforeAll pode não ser executado antes que
// o TanStack Query inicie operações assíncronas em ambiente de testes.
notifyManager.setScheduler((cb) => cb());
import {
  useTasks,
  useMyDay,
  useImportantTasks,
  useUpcomingTasks,
  useTask,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useToggleTaskStatus,
  useToggleFavorite,
} from '../../src/hooks/api/use-tasks';
import type {
  PaginatedResponse,
  ApiTaskSummary,
  SingleResponse,
  MessageResponse,
} from '../../src/infrastructure/api/types';

// ---------------------------------------------------------------------------
// Helper — wrapper com QueryClientProvider
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

const TASK_SUMMARY: ApiTaskSummary = {
  id: 1,
  title: 'Tarefa de teste',
  status: 'not_started',
  priority: 'normal',
  due_date: null,
  is_favorite: false,
  completed_at: null,
  checklist_count: 0,
  checklist_done: 0,
  labels: [],
  created_at: '2026-06-20T00:00:00.000Z',
  updated_at: '2026-06-20T00:00:00.000Z',
};

const PAGINATED_RESPONSE: PaginatedResponse<ApiTaskSummary> = {
  data: [TASK_SUMMARY],
  meta: { next_cursor: null, has_more: false },
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Helper: aguardar que as queries sejam invalidadas
async function waitForInvalidation(
  qc: QueryClient,
  queryKey: unknown[],
) {
  await waitFor(() => {
    expect(qc.getQueryState(queryKey)?.isInvalidated).toBe(true);
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // Defaults seguros para mocks não utilizados em testes específicos
  mockTaskApiMyDay.mockResolvedValue({ data: [] });
  mockTaskApiImportant.mockResolvedValue({ data: [] });
  mockTaskApiUpcoming.mockResolvedValue({ data: [] });
});

// ---------------------------------------------------------------------------
// useTasks
// ---------------------------------------------------------------------------

describe('useTasks', () => {
  it('retorna dados corretos quando a API é bem-sucedida', async () => {
    mockTaskApiList.mockResolvedValue(PAGINATED_RESPONSE);
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useTasks(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(PAGINATED_RESPONSE);
    expect(mockTaskApiList).toHaveBeenCalledWith({});
  });

  it('passa os filtros para taskApi.list', async () => {
    mockTaskApiList.mockResolvedValue(PAGINATED_RESPONSE);
    const qc = makeQueryClient();
    const filters = { status: 'in_progress', limit: 10 };

    const { result } = await renderHook(() => useTasks(filters), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockTaskApiList).toHaveBeenCalledWith(filters);
  });

  it('define isError=true quando a API falha', async () => {
    mockTaskApiList.mockRejectedValue(new Error('Server error'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useTasks(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('inicia no estado loading', async () => {
    // Não resolve a promise imediatamente
    let resolve!: (v: PaginatedResponse<ApiTaskSummary>) => void;
    mockTaskApiList.mockReturnValue(new Promise((r) => { resolve = r; }));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useTasks(), {
      wrapper: makeWrapper(qc),
    });

    // Logo após renderizar, deve estar em estado pendente
    expect(result.current.isPending).toBe(true);

    // Resolvar para não deixar promessas pendentes
    await act(async () => { resolve(PAGINATED_RESPONSE); });
  });
});

// ---------------------------------------------------------------------------
// useCreateTask
// ---------------------------------------------------------------------------

describe('useCreateTask', () => {
  it('chama taskApi.create com os dados corretos', async () => {
    const newTask: SingleResponse<ApiTaskSummary> = { data: { ...TASK_SUMMARY, id: 99 } };
    mockTaskApiCreate.mockResolvedValue(newTask);
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useCreateTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Nova tarefa' });
    });

    expect(mockTaskApiCreate).toHaveBeenCalledWith({ title: 'Nova tarefa' });
  });

  it('invalida queries de tasks após sucesso', async () => {
    mockTaskApiCreate.mockResolvedValue({ data: TASK_SUMMARY });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useCreateTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Teste' });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tasks'] }),
    );
    invalidateSpy.mockRestore();
  });

  it('sinaliza sucesso após mutação', async () => {
    mockTaskApiCreate.mockResolvedValue({ data: TASK_SUMMARY });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useCreateTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ title: 'Test task' });
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('rejeita quando a API falha', async () => {
    mockTaskApiCreate.mockRejectedValue(new Error('Falha na criação'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useCreateTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await expect(result.current.mutateAsync({ title: 'Vai falhar' })).rejects.toThrow(
        'Falha na criação',
      );
    });

    expect(result.current.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useUpdateTask
// ---------------------------------------------------------------------------

describe('useUpdateTask', () => {
  it('chama taskApi.update com o id e dados corretos', async () => {
    const updated: SingleResponse<ApiTaskSummary> = {
      data: { ...TASK_SUMMARY, title: 'Atualizado' },
    };
    mockTaskApiUpdate.mockResolvedValue(updated);
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useUpdateTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '1', data: { title: 'Atualizado' } });
    });

    expect(mockTaskApiUpdate).toHaveBeenCalledWith(1, { title: 'Atualizado' });
  });

  it('invalida a query da tarefa específica após sucesso', async () => {
    mockTaskApiUpdate.mockResolvedValue({ data: TASK_SUMMARY });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useUpdateTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '1', data: { title: 'Novo título' } });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tasks', '1'] }),
    );
    invalidateSpy.mockRestore();
  });

  it('sinaliza sucesso após atualização', async () => {
    mockTaskApiUpdate.mockResolvedValue({ data: TASK_SUMMARY });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useUpdateTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '2', data: { status: 'completed' } });
    });

    expect(result.current.isSuccess).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useDeleteTask
// ---------------------------------------------------------------------------

describe('useDeleteTask', () => {
  it('chama taskApi.delete com o id correto (convertido para número)', async () => {
    const response: MessageResponse = { message: 'Deleted' };
    mockTaskApiDelete.mockResolvedValue(response);
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useDeleteTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync('5');
    });

    expect(mockTaskApiDelete).toHaveBeenCalledWith(5);
  });

  it('invalida queries de tasks após deleção', async () => {
    mockTaskApiDelete.mockResolvedValue({ message: 'ok' });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useDeleteTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync('1');
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tasks'] }),
    );
    invalidateSpy.mockRestore();
  });

  it('rejeita quando a API falha', async () => {
    mockTaskApiDelete.mockRejectedValue(new Error('Tarefa não encontrada'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useDeleteTask(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await expect(result.current.mutateAsync('999')).rejects.toThrow('Tarefa não encontrada');
    });

    expect(result.current.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// useToggleTaskStatus
// ---------------------------------------------------------------------------

describe('useToggleTaskStatus', () => {
  it('chama taskApi.updateStatus com id e status corretos', async () => {
    mockTaskApiUpdateStatus.mockResolvedValue({ data: { ...TASK_SUMMARY, status: 'completed' } });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useToggleTaskStatus(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '3', status: 'completed' });
    });

    expect(mockTaskApiUpdateStatus).toHaveBeenCalledWith(3, 'completed');
  });

  it('invalida queries de tasks e da tarefa específica após sucesso', async () => {
    mockTaskApiUpdateStatus.mockResolvedValue({ data: TASK_SUMMARY });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useToggleTaskStatus(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '3', status: 'in_progress' });
    });

    // Verificar que invalidateQueries foi chamada para tasks e para a tarefa específica
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tasks'] }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tasks', '3'] }),
    );
    invalidateSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useToggleFavorite
// ---------------------------------------------------------------------------

describe('useToggleFavorite', () => {
  it('chama taskApi.toggleFavorite com id e isFavorite corretos', async () => {
    mockTaskApiToggleFavorite.mockResolvedValue({ data: { ...TASK_SUMMARY, is_favorite: true } });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useToggleFavorite(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '7', isFavorite: true });
    });

    expect(mockTaskApiToggleFavorite).toHaveBeenCalledWith(7, true);
  });

  it('invalida queries de tasks após toggle', async () => {
    mockTaskApiToggleFavorite.mockResolvedValue({ data: TASK_SUMMARY });
    const qc = makeQueryClient();
    const invalidateSpy = jest.spyOn(qc, 'invalidateQueries');

    const { result } = await renderHook(() => useToggleFavorite(), {
      wrapper: makeWrapper(qc),
    });

    await act(async () => {
      await result.current.mutateAsync({ id: '2', isFavorite: false });
    });

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['tasks'] }),
    );
    invalidateSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useMyDay
// ---------------------------------------------------------------------------

describe('useMyDay', () => {
  it('retorna as tarefas do dia da API', async () => {
    mockTaskApiMyDay.mockResolvedValue({ data: [TASK_SUMMARY] });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useMyDay(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([TASK_SUMMARY]);
    expect(mockTaskApiMyDay).toHaveBeenCalledTimes(1);
  });

  it('define isError=true quando a API falha', async () => {
    mockTaskApiMyDay.mockRejectedValue(new Error('My day error'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useMyDay(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useImportantTasks
// ---------------------------------------------------------------------------

describe('useImportantTasks', () => {
  it('retorna as tarefas importantes da API', async () => {
    mockTaskApiImportant.mockResolvedValue({ data: [TASK_SUMMARY] });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useImportantTasks(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([TASK_SUMMARY]);
    expect(mockTaskApiImportant).toHaveBeenCalledTimes(1);
  });

  it('define isError=true quando a API falha', async () => {
    mockTaskApiImportant.mockRejectedValue(new Error('Important error'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useImportantTasks(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useUpcomingTasks
// ---------------------------------------------------------------------------

describe('useUpcomingTasks', () => {
  it('retorna as próximas tarefas da API', async () => {
    mockTaskApiUpcoming.mockResolvedValue({ data: [TASK_SUMMARY] });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useUpcomingTasks(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([TASK_SUMMARY]);
    expect(mockTaskApiUpcoming).toHaveBeenCalledTimes(1);
  });

  it('define isError=true quando a API falha', async () => {
    mockTaskApiUpcoming.mockRejectedValue(new Error('Upcoming error'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useUpcomingTasks(), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

// ---------------------------------------------------------------------------
// useTask
// ---------------------------------------------------------------------------

describe('useTask', () => {
  it('retorna uma tarefa específica pelo id', async () => {
    mockTaskApiGetById.mockResolvedValue({ data: TASK_SUMMARY });
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useTask('1'), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(TASK_SUMMARY);
    expect(mockTaskApiGetById).toHaveBeenCalledWith(1);
  });

  it('não faz a busca quando id está vazio', async () => {
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useTask(''), {
      wrapper: makeWrapper(qc),
    });

    // Com enabled: false (id vazio), deve estar pending mas não fetching
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockTaskApiGetById).not.toHaveBeenCalled();
  });

  it('define isError=true quando a API falha', async () => {
    mockTaskApiGetById.mockRejectedValue(new Error('Task not found'));
    const qc = makeQueryClient();

    const { result } = await renderHook(() => useTask('99'), {
      wrapper: makeWrapper(qc),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});
