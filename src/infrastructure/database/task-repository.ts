import { getDatabase } from './db';
import type { Task, TaskStatus } from '../../domain/entities';
import type { TaskRepository } from '../../domain/repositories';
import { generateId, nowISO, todayDate } from '../../utils/id';

// Shape returned by getAllSync / getFirstSync for the tasks table
interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  due_date: string | null;
  list_id: string | null;
  parent_id: string | null;
  is_favorite: number;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SQLiteTaskRepository implements TaskRepository {
  private get db() {
    return getDatabase();
  }

  private mapRow(row: TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      status: row.status as Task['status'],
      priority: row.priority as Task['priority'],
      dueDate: row.due_date ?? undefined,
      listId: row.list_id ?? undefined,
      parentId: row.parent_id ?? undefined,
      isFavorite: Boolean(row.is_favorite),
      position: row.position,
      completedAt: row.completed_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findAll(options?: {
    listId?: string;
    status?: TaskStatus;
    isFavorite?: boolean;
  }): Promise<Task[]> {
    let sql = 'SELECT * FROM tasks WHERE parent_id IS NULL';
    const params: (string | number)[] = [];

    if (options?.listId) {
      sql += ' AND list_id = ?';
      params.push(options.listId);
    }
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }
    if (options?.isFavorite !== undefined) {
      sql += ' AND is_favorite = ?';
      params.push(options.isFavorite ? 1 : 0);
    }

    sql += ' ORDER BY position ASC, created_at DESC';

    const rows = this.db.getAllSync<TaskRow>(sql, params);
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id: string): Promise<Task | null> {
    const row = this.db.getFirstSync<TaskRow>(
      'SELECT * FROM tasks WHERE id = ?',
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  async findSubtasks(parentId: string): Promise<Task[]> {
    const rows = this.db.getAllSync<TaskRow>(
      'SELECT * FROM tasks WHERE parent_id = ? ORDER BY position ASC, created_at DESC',
      [parentId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findDueToday(): Promise<Task[]> {
    const today = todayDate();
    const rows = this.db.getAllSync<TaskRow>(
      `SELECT * FROM tasks
       WHERE due_date = ? AND status NOT IN ('completed', 'cancelled')
       ORDER BY position ASC, created_at DESC`,
      [today],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findOverdue(): Promise<Task[]> {
    const today = todayDate();
    const rows = this.db.getAllSync<TaskRow>(
      `SELECT * FROM tasks
       WHERE due_date < ? AND status NOT IN ('completed', 'cancelled')
       ORDER BY due_date ASC, position ASC`,
      [today],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findDueThisWeek(): Promise<Task[]> {
    const today = todayDate();
    const todayMs = new Date(today).getTime();
    const weekEnd = new Date(todayMs + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const rows = this.db.getAllSync<TaskRow>(
      `SELECT * FROM tasks
       WHERE due_date >= ? AND due_date <= ? AND status NOT IN ('completed', 'cancelled')
       ORDER BY due_date ASC, position ASC`,
      [today, weekEnd],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async create(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
    const id = generateId();
    const now = nowISO();

    this.db.runSync(
      `INSERT INTO tasks
         (id, title, description, status, priority, due_date, list_id, parent_id,
          is_favorite, position, completed_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.title,
        data.description ?? null,
        data.status,
        data.priority,
        data.dueDate ?? null,
        data.listId ?? null,
        data.parentId ?? null,
        data.isFavorite ? 1 : 0,
        data.position,
        data.completedAt ?? null,
        now,
        now,
      ],
    );

    const created = await this.findById(id);
    if (!created) throw new Error(`Failed to retrieve created task ${id}`);
    return created;
  }

  async update(id: string, data: Partial<Task>): Promise<Task> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Task not found: ${id}`);

    const now = nowISO();
    const merged: Task = { ...existing, ...data, id, updatedAt: now };

    this.db.runSync(
      `UPDATE tasks SET
         title = ?, description = ?, status = ?, priority = ?,
         due_date = ?, list_id = ?, parent_id = ?, is_favorite = ?,
         position = ?, completed_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        merged.title,
        merged.description ?? null,
        merged.status,
        merged.priority,
        merged.dueDate ?? null,
        merged.listId ?? null,
        merged.parentId ?? null,
        merged.isFavorite ? 1 : 0,
        merged.position,
        merged.completedAt ?? null,
        now,
        id,
      ],
    );

    return merged;
  }

  async delete(id: string): Promise<void> {
    this.db.runSync('DELETE FROM tasks WHERE id = ?', [id]);
  }

  async updatePositions(updates: Array<{ id: string; position: number }>): Promise<void> {
    this.db.withTransactionSync(() => {
      for (const { id, position } of updates) {
        this.db.runSync(
          'UPDATE tasks SET position = ?, updated_at = ? WHERE id = ?',
          [position, nowISO(), id],
        );
      }
    });
  }
}
