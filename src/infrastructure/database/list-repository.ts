import { getDatabase } from './db';
import type { TaskList } from '../../domain/entities';
import type { TaskListRepository } from '../../domain/repositories';
import { generateId, nowISO } from '../../utils/id';

// Shape returned by getAllSync / getFirstSync for the task_lists table
interface TaskListRow {
  id: string;
  name: string;
  color: string;
  icon: string | null;
  is_favorite: number;
  position: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SQLiteTaskListRepository implements TaskListRepository {
  private get db() {
    return getDatabase();
  }

  private mapRow(row: TaskListRow): TaskList {
    return {
      id: row.id,
      name: row.name,
      color: row.color,
      icon: row.icon ?? undefined,
      isFavorite: Boolean(row.is_favorite),
      position: row.position,
      archivedAt: row.archived_at ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async findAll(): Promise<TaskList[]> {
    const rows = this.db.getAllSync<TaskListRow>(
      'SELECT * FROM task_lists WHERE archived_at IS NULL ORDER BY position ASC, created_at ASC',
      [],
    );
    return rows.map((r) => this.mapRow(r));
  }

  async findById(id: string): Promise<TaskList | null> {
    const row = this.db.getFirstSync<TaskListRow>(
      'SELECT * FROM task_lists WHERE id = ?',
      [id],
    );
    return row ? this.mapRow(row) : null;
  }

  async create(data: Omit<TaskList, 'id' | 'createdAt' | 'updatedAt'>): Promise<TaskList> {
    const id = generateId();
    const now = nowISO();

    this.db.runSync(
      `INSERT INTO task_lists
         (id, name, color, icon, is_favorite, position, archived_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.color,
        data.icon ?? null,
        data.isFavorite ? 1 : 0,
        data.position,
        data.archivedAt ?? null,
        now,
        now,
      ],
    );

    const created = await this.findById(id);
    if (!created) throw new Error(`Failed to retrieve created list ${id}`);
    return created;
  }

  async update(id: string, data: Partial<TaskList>): Promise<TaskList> {
    const existing = await this.findById(id);
    if (!existing) throw new Error(`TaskList not found: ${id}`);

    const now = nowISO();
    const merged: TaskList = { ...existing, ...data, id, updatedAt: now };

    this.db.runSync(
      `UPDATE task_lists SET
         name = ?, color = ?, icon = ?, is_favorite = ?,
         position = ?, archived_at = ?, updated_at = ?
       WHERE id = ?`,
      [
        merged.name,
        merged.color,
        merged.icon ?? null,
        merged.isFavorite ? 1 : 0,
        merged.position,
        merged.archivedAt ?? null,
        now,
        id,
      ],
    );

    return merged;
  }

  async archive(id: string): Promise<void> {
    this.db.runSync(
      'UPDATE task_lists SET archived_at = ?, updated_at = ? WHERE id = ?',
      [nowISO(), nowISO(), id],
    );
  }

  async delete(id: string): Promise<void> {
    this.db.runSync('DELETE FROM task_lists WHERE id = ?', [id]);
  }
}
