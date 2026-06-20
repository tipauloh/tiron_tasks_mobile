/**
 * Testes unitários do useTaskStore (Zustand).
 *
 * Estratégia: mockar os repositórios SQLite para isolar a lógica
 * da store sem depender do banco de dados real.
 *
 * Usa jest-expo preset (configurado via package.json ou jest.config.js).
 */

import { act } from '@testing-library/react-native';
import type { Task, TaskList } from '../../src/domain/entities';

// ---------------------------------------------------------------------------
// Mocks dos módulos de repositório
// ---------------------------------------------------------------------------

const mockTasks: Task[] = [
  {
    id: 'task-001',
    title: 'Tarefa um',
    status: 'not_started',
    priority: 'normal',
    isFavorite: false,
    position: 0,
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
  },
  {
    id: 'task-002',
    title: 'Tarefa dois',
    status: 'in_progress',
    priority: 'high',
    isFavorite: true,
    position: 1,
    createdAt: '2026-06-20T00:01:00.000Z',
    updatedAt: '2026-06-20T00:01:00.000Z',
  },
];

const mockLists: TaskList[] = [
  {
    id: 'list-001',
    name: 'Pessoal',
    color: '#10B981',
    isFavorite: false,
    position: 0,
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
  },
];

// Repositório de tarefas mockado
const mockTaskRepo = {
  findAll: jest.fn().mockResolvedValue(mockTasks),
  findById: jest.fn().mockImplementation((id: string) =>
    Promise.resolve(mockTasks.find((t) => t.id === id) ?? null),
  ),
  findSubtasks: jest.fn().mockResolvedValue([]),
  findDueToday: jest.fn().mockResolvedValue([]),
  findOverdue: jest.fn().mockResolvedValue([]),
  findDueThisWeek: jest.fn().mockResolvedValue([]),
  create: jest.fn().mockImplementation((data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...data,
      id: 'task-new',
      createdAt: '2026-06-20T01:00:00.000Z',
      updatedAt: '2026-06-20T01:00:00.000Z',
    };
    return Promise.resolve(newTask);
  }),
  update: jest.fn().mockImplementation((id: string, data: Partial<Task>) => {
    const existing = mockTasks.find((t) => t.id === id)!;
    return Promise.resolve({ ...existing, ...data, updatedAt: '2026-06-20T02:00:00.000Z' });
  }),
  delete: jest.fn().mockResolvedValue(undefined),
  updatePositions: jest.fn().mockResolvedValue(undefined),
};

// Repositório de listas mockado
const mockListRepo = {
  findAll: jest.fn().mockResolvedValue(mockLists),
  findById: jest.fn().mockResolvedValue(null),
  create: jest.fn().mockImplementation((data: Omit<TaskList, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newList: TaskList = {
      ...data,
      id: 'list-new',
      createdAt: '2026-06-20T01:00:00.000Z',
      updatedAt: '2026-06-20T01:00:00.000Z',
    };
    return Promise.resolve(newList);
  }),
  update: jest.fn().mockResolvedValue(null),
  archive: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
};

// Substituir os módulos de repositório antes de importar a store
jest.mock('../../src/infrastructure/database/task-repository', () => ({
  SQLiteTaskRepository: jest.fn(() => mockTaskRepo),
}));

jest.mock('../../src/infrastructure/database/list-repository', () => ({
  SQLiteTaskListRepository: jest.fn(() => mockListRepo),
}));

// ---------------------------------------------------------------------------
// Import da store (após os mocks)
// ---------------------------------------------------------------------------

import { useTaskStore } from '../../src/store/task-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getStore() {
  return useTaskStore.getState();
}

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

beforeEach(() => {
  // Resetar o estado da store entre testes
  useTaskStore.setState({ tasks: [], lists: [], isLoading: false, error: null });
  jest.clearAllMocks();
  // Restaurar implementações padrão dos mocks
  mockTaskRepo.findAll.mockResolvedValue(mockTasks);
  mockListRepo.findAll.mockResolvedValue(mockLists);
  mockTaskRepo.create.mockImplementation((data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTask: Task = {
      ...data,
      id: 'task-new',
      createdAt: '2026-06-20T01:00:00.000Z',
      updatedAt: '2026-06-20T01:00:00.000Z',
    };
    return Promise.resolve(newTask);
  });
  mockTaskRepo.update.mockImplementation((id: string, data: Partial<Task>) => {
    const existing = mockTasks.find((t) => t.id === id) ?? mockTasks[0];
    return Promise.resolve({ ...existing, ...data, updatedAt: '2026-06-20T02:00:00.000Z' });
  });
  mockTaskRepo.delete.mockResolvedValue(undefined);
});

describe('useTaskStore — loadAll', () => {
  it('carrega tarefas e listas do repositório', async () => {
    await act(async () => {
      await getStore().loadAll();
    });
    const { tasks, lists, isLoading, error } = getStore();
    expect(tasks).toHaveLength(2);
    expect(lists).toHaveLength(1);
    expect(isLoading).toBe(false);
    expect(error).toBeNull();
    expect(mockTaskRepo.findAll).toHaveBeenCalledTimes(1);
    expect(mockListRepo.findAll).toHaveBeenCalledTimes(1);
  });

  it('define error quando repositório lança exceção', async () => {
    mockTaskRepo.findAll.mockRejectedValueOnce(new Error('SQLite error'));
    await act(async () => {
      await getStore().loadAll();
    });
    const { error, isLoading } = getStore();
    expect(error).toContain('SQLite error');
    expect(isLoading).toBe(false);
  });
});

describe('useTaskStore — createTask', () => {
  it('adiciona nova tarefa ao estado', async () => {
    // Carregar estado inicial
    await act(async () => { await getStore().loadAll(); });

    const newData = {
      title: 'Nova tarefa',
      status: 'not_started' as const,
      priority: 'low' as const,
      isFavorite: false,
      position: 2,
    };

    await act(async () => {
      await getStore().createTask(newData);
    });

    const { tasks } = getStore();
    expect(tasks).toHaveLength(3); // 2 originais + 1 nova
    expect(tasks.find((t) => t.id === 'task-new')).toBeDefined();
    expect(mockTaskRepo.create).toHaveBeenCalledWith(newData);
  });
});

describe('useTaskStore — toggleComplete', () => {
  it('muda status de not_started para completed', async () => {
    await act(async () => { await getStore().loadAll(); });

    await act(async () => {
      await getStore().toggleComplete('task-001');
    });

    const { tasks } = getStore();
    const task = tasks.find((t) => t.id === 'task-001');
    expect(task?.status).toBe('completed');
    expect(mockTaskRepo.update).toHaveBeenCalledWith(
      'task-001',
      expect.objectContaining({ status: 'completed' }),
    );
  });

  it('muda status de completed para not_started', async () => {
    // Colocar task-001 como completed no estado
    useTaskStore.setState({
      tasks: [{ ...mockTasks[0], status: 'completed', completedAt: '2026-06-20T12:00:00.000Z' }],
      lists: [],
      isLoading: false,
      error: null,
    });

    mockTaskRepo.update.mockImplementationOnce((id: string, data: Partial<Task>) =>
      Promise.resolve({ ...mockTasks[0], ...data, updatedAt: '2026-06-20T03:00:00.000Z' }),
    );

    await act(async () => {
      await getStore().toggleComplete('task-001');
    });

    const { tasks } = getStore();
    const task = tasks.find((t) => t.id === 'task-001');
    expect(task?.status).toBe('not_started');
    expect(task?.completedAt).toBeUndefined();
  });
});

describe('useTaskStore — deleteTask', () => {
  it('remove tarefa do estado após deletar', async () => {
    await act(async () => { await getStore().loadAll(); });

    await act(async () => {
      await getStore().deleteTask('task-001');
    });

    const { tasks } = getStore();
    expect(tasks).toHaveLength(1);
    expect(tasks.find((t) => t.id === 'task-001')).toBeUndefined();
    expect(mockTaskRepo.delete).toHaveBeenCalledWith('task-001');
  });
});

describe('useTaskStore — toggleFavorite', () => {
  it('alterna isFavorite de false para true', async () => {
    await act(async () => { await getStore().loadAll(); });

    await act(async () => {
      await getStore().toggleFavorite('task-001'); // task-001 tem isFavorite: false
    });

    expect(mockTaskRepo.update).toHaveBeenCalledWith(
      'task-001',
      expect.objectContaining({ isFavorite: true }),
    );
  });

  it('alterna isFavorite de true para false', async () => {
    await act(async () => { await getStore().loadAll(); });

    await act(async () => {
      await getStore().toggleFavorite('task-002'); // task-002 tem isFavorite: true
    });

    expect(mockTaskRepo.update).toHaveBeenCalledWith(
      'task-002',
      expect.objectContaining({ isFavorite: false }),
    );
  });
});
