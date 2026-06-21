import type { TaskList } from '@/domain/entities';
import type { TaskListRepository } from '@/domain/repositories';
import { taskListApi } from './task-list-api';
import type { ApiTaskListFull } from './types';

function mapApiList(l: ApiTaskListFull): TaskList {
  return {
    id: String(l.id),
    name: l.name,
    color: l.color ?? '#208AEF',
    icon: l.icon ?? undefined,
    isFavorite: false,
    position: l.position,
    archivedAt: l.archived_at ?? undefined,
    createdAt: l.created_at ?? new Date().toISOString(),
    updatedAt: l.updated_at ?? new Date().toISOString(),
  };
}

export class ApiTaskListRepository implements TaskListRepository {
  async findAll(): Promise<TaskList[]> {
    const res = await taskListApi.list();
    return res.data.map(mapApiList);
  }

  async findById(id: string): Promise<TaskList | null> {
    const all = await this.findAll();
    return all.find((l) => l.id === id) ?? null;
  }

  async create(data: Omit<TaskList, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskList> {
    const res = await taskListApi.create({
      name: data.name,
      color: data.color,
      icon: data.icon,
      position: data.position,
    });
    return mapApiList(res.data);
  }

  async update(id: string, data: Partial<TaskList>): Promise<TaskList> {
    const res = await taskListApi.update(parseInt(id), {
      name: data.name,
      color: data.color,
      icon: data.icon,
      position: data.position,
    });
    return mapApiList(res.data);
  }

  async archive(id: string): Promise<void> {
    await taskListApi.delete(parseInt(id));
  }

  async delete(id: string): Promise<void> {
    await taskListApi.delete(parseInt(id));
  }
}
