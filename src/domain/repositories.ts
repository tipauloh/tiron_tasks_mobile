import type { Task, TaskList, TaskStatus } from './entities';

export interface TaskRepository {
  findAll(options?: { listId?: string; status?: TaskStatus; isFavorite?: boolean }): Promise<Task[]>;
  findById(id: string): Promise<Task | null>;
  findSubtasks(parentId: string): Promise<Task[]>;
  findDueToday(): Promise<Task[]>;
  findOverdue(): Promise<Task[]>;
  findDueThisWeek(): Promise<Task[]>;
  create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>;
  update(id: string, data: Partial<Task>): Promise<Task>;
  delete(id: string): Promise<void>;
  updatePositions(updates: Array<{ id: string; position: number }>): Promise<void>;
}

export interface TaskListRepository {
  findAll(): Promise<TaskList[]>;
  findById(id: string): Promise<TaskList | null>;
  create(data: Omit<TaskList, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskList>;
  update(id: string, data: Partial<TaskList>): Promise<TaskList>;
  archive(id: string): Promise<void>;
  delete(id: string): Promise<void>;
}
