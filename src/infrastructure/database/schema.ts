export const CREATE_TABLES_SQL = `
  CREATE TABLE IF NOT EXISTS task_lists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#208AEF',
    icon TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    archived_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'not_started',
    priority TEXT NOT NULL DEFAULT 'normal',
    due_date TEXT,
    list_id TEXT REFERENCES task_lists(id),
    parent_id TEXT REFERENCES tasks(id),
    is_favorite INTEGER NOT NULL DEFAULT 0,
    position INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS labels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6B7280'
  );

  CREATE TABLE IF NOT EXISTS task_labels (
    task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, label_id)
  );
`;

export const SEED_DEFAULT_LISTS_SQL = `
  INSERT OR IGNORE INTO task_lists (id, name, color, icon, is_favorite, position, created_at, updated_at)
  VALUES
    ('list-pessoal', 'Pessoal', '#10B981', '👤', 0, 0, datetime('now'), datetime('now')),
    ('list-trabalho', 'Trabalho', '#3B82F6', '💼', 0, 1, datetime('now'), datetime('now')),
    ('list-compras', 'Compras', '#F59E0B', '🛒', 0, 2, datetime('now'), datetime('now')),
    ('list-estudos', 'Estudos', '#8B5CF6', '📚', 0, 3, datetime('now'), datetime('now'));
`;
