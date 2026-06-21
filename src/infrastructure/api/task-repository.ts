import type { Task, TaskStatus } from '@/domain/entities';
import type { TaskRepository } from '@/domain/repositories';
import { taskApi } from './task-api';
import type { ApiTaskSummary } from './types';

function mapApiTask(t: ApiTaskSummary): Task {
  return {
    id: String(t.id),
    title: t.title,
    status: t.status as Task['status'],
    priority: t.priority as Task['priority'],
    dueDate: t.due_date ?? undefined,
    isFavorite: t.is_favorite,
    position: 0,
    completedAt: t.completed_at ?? undefined,
    createdAt: t.created_at ?? new Date().toISOString(),
    updatedAt: t.updated_at ?? new Date().toISOString(),
    listId: undefined,
    description: undefined,
    parentId: undefined,
  };
}

export class ApiTaskRepository implements TaskRepository {
  async findAll(options?: { listId?: string; status?: TaskStatus; isFavorite?: boolean }): Promise<Task[]> {
    const params: Record<string, string | number | undefined> = {};
    if (options?.listId) params.task_list_id = parseInt(options.listId);
    if (options?.status) params.status = options.status;

    if (options?.isFavorite) {
      const res = await taskApi.important();
      return res.data.map(mapApiTask);
    }

    const res = await taskApi.list(params);
    return res.data.map(mapApiTask);
  }

  async findById(id: string): Promise<Task | null> {
    try {
      const res = await taskApi.getById(parseInt(id));
      const t = res.data;
      return {
        id: String(t.id),
        title: t.title,
        description: t.description ?? undefined,
        status: t.status as Task['status'],
        priority: t.priority as Task['priority'],
        dueDate: t.due_date ?? undefined,
        listId: t.task_list ? String(t.task_list.id) : undefined,
        isFavorite: t.is_favorite,
        position: 0,
        completedAt: t.completed_at ?? undefined,
        createdAt: t.created_at ?? new Date().toISOString(),
        updatedAt: t.updated_at ?? new Date().toISOString(),
        parentId: undefined,
      };
    } catch {
      return null;
    }
  }

  async findSubtasks(_parentId: string): Promise<Task[]> {
    return [];
  }

  async findDueToday(): Promise<Task[]> {
    const res = await taskApi.myDay();
    return res.data.map(mapApiTask);
  }

  async findOverdue(): Promise<Task[]> {
    const res = await taskApi.list({ status: 'not_started' });
    const today = new Date().toISOString().split('T')[0];
    return res.data
      .filter((t) => t.due_date != null && t.due_date < today)
      .map(mapApiTask);
  }

  async findDueThisWeek(): Promise<Task[]> {
    const res = await taskApi.upcoming();
    return res.data.map(mapApiTask);
  }

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const res = await taskApi.create({
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      due_date: data.dueDate,
      task_list_id: data.listId ? parseInt(data.listId) : undefined,
      is_favorite: data.isFavorite,
    });
    return mapApiTask(res.data);
  }

  async update(id: string, data: Partial<Task>): Promise<Task> {
    const updates: Record<string, unknown> = {};
    if (data.title != null) updates.title = data.title;
    if (data.description != null) updates.description = data.description;
    if (data.status != null) updates.status = data.status;
    if (data.priority != null) updates.priority = data.priority;
    if (data.dueDate !== undefined) updates.due_date = data.dueDate ?? null;
    if (data.listId !== undefined) updates.task_list_id = data.listId ? parseInt(data.listId) : null;

    if (data.isFavorite != null) {
      const res = await taskApi.toggleFavorite(parseInt(id), data.isFavorite);
      return mapApiTask(res.data);
    }
    if (data.status != null && Object.keys(updates).length === 1) {
      const res = await taskApi.updateStatus(parseInt(id), data.status);
      return mapApiTask(res.data);
    }

    const res = await taskApi.update(parseInt(id), updates);
    return mapApiTask(res.data);
  }

  async delete(id: string): Promise<void> {
    await taskApi.delete(parseInt(id));
  }

  async updatePositions(_updates: Array<{ id: string; position: number }>): Promise<void> {
    // Position management is done server-side
  }
}
