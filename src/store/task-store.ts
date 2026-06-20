import { create } from 'zustand';
import type { Task, TaskList } from '../domain/entities';
import { SQLiteTaskRepository } from '../infrastructure/database/task-repository';
import { SQLiteTaskListRepository } from '../infrastructure/database/list-repository';

const taskRepo = new SQLiteTaskRepository();
const listRepo = new SQLiteTaskListRepository();

interface TaskState {
  tasks: Task[];
  lists: TaskList[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadAll: () => Promise<void>;
  createTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  createList: (data: Omit<TaskList, 'id' | 'createdAt' | 'updatedAt'>) => Promise<TaskList>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  lists: [],
  isLoading: false,
  error: null,

  loadAll: async () => {
    set({ isLoading: true, error: null });
    try {
      const [tasks, lists] = await Promise.all([
        taskRepo.findAll(),
        listRepo.findAll(),
      ]);
      set({ tasks, lists, isLoading: false });
    } catch (e) {
      set({ error: String(e), isLoading: false });
    }
  },

  createTask: async (data) => {
    const task = await taskRepo.create(data);
    set((state) => ({ tasks: [...state.tasks, task] }));
    return task;
  },

  updateTask: async (id, data) => {
    const updated = await taskRepo.update(id, data);
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? updated : t)),
    }));
  },

  deleteTask: async (id) => {
    await taskRepo.delete(id);
    set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
  },

  toggleComplete: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    const newStatus =
      task.status === 'completed' ? 'not_started' : 'completed';
    await get().updateTask(id, {
      status: newStatus,
      completedAt:
        newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  },

  toggleFavorite: async (id) => {
    const task = get().tasks.find((t) => t.id === id);
    if (!task) return;
    await get().updateTask(id, { isFavorite: !task.isFavorite });
  },

  createList: async (data) => {
    const list = await listRepo.create(data);
    set((state) => ({ lists: [...state.lists, list] }));
    return list;
  },
}));
