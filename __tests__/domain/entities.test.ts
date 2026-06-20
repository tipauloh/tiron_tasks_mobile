/**
 * Testes unitários das entidades do domínio.
 * Validam que os tipos e valores aceitos pelas entidades estão corretos.
 * Usam apenas TypeScript — sem dependências externas.
 */

import type { Task, TaskList, Label, TaskStatus, TaskPriority } from '../../src/domain/entities';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-001',
    title: 'Tarefa de teste',
    status: 'not_started',
    priority: 'normal',
    isFavorite: false,
    position: 0,
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
    ...overrides,
  };
}

function makeList(overrides: Partial<TaskList> = {}): TaskList {
  return {
    id: 'list-001',
    name: 'Pessoal',
    color: '#10B981',
    isFavorite: false,
    position: 0,
    createdAt: '2026-06-20T00:00:00.000Z',
    updatedAt: '2026-06-20T00:00:00.000Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Task
// ---------------------------------------------------------------------------

describe('Task entity', () => {
  it('deve ter campos obrigatórios preenchidos', () => {
    const task = makeTask();
    expect(task.id).toBeTruthy();
    expect(task.title).toBeTruthy();
    expect(task.status).toBeDefined();
    expect(task.priority).toBeDefined();
    expect(typeof task.isFavorite).toBe('boolean');
    expect(typeof task.position).toBe('number');
    expect(task.createdAt).toBeTruthy();
    expect(task.updatedAt).toBeTruthy();
  });

  it('deve aceitar campos opcionais como undefined', () => {
    const task = makeTask();
    expect(task.description).toBeUndefined();
    expect(task.dueDate).toBeUndefined();
    expect(task.listId).toBeUndefined();
    expect(task.parentId).toBeUndefined();
    expect(task.completedAt).toBeUndefined();
  });

  it('deve aceitar todos os valores válidos de status', () => {
    const statuses: TaskStatus[] = ['not_started', 'in_progress', 'completed', 'cancelled'];
    statuses.forEach((status) => {
      const task = makeTask({ status });
      expect(task.status).toBe(status);
    });
  });

  it('deve aceitar todos os valores válidos de prioridade', () => {
    const priorities: TaskPriority[] = ['low', 'normal', 'high', 'critical'];
    priorities.forEach((priority) => {
      const task = makeTask({ priority });
      expect(task.priority).toBe(priority);
    });
  });

  it('deve aceitar isFavorite true e false', () => {
    expect(makeTask({ isFavorite: true }).isFavorite).toBe(true);
    expect(makeTask({ isFavorite: false }).isFavorite).toBe(false);
  });

  it('deve aceitar subtarefa com parentId preenchido', () => {
    const subtask = makeTask({ parentId: 'task-000', id: 'task-001-sub' });
    expect(subtask.parentId).toBe('task-000');
  });

  it('deve aceitar tarefa com lista vinculada', () => {
    const task = makeTask({ listId: 'list-pessoal' });
    expect(task.listId).toBe('list-pessoal');
  });

  it('deve aceitar completedAt quando tarefa está concluída', () => {
    const completedAt = '2026-06-20T12:00:00.000Z';
    const task = makeTask({ status: 'completed', completedAt });
    expect(task.completedAt).toBe(completedAt);
  });
});

// ---------------------------------------------------------------------------
// TaskList
// ---------------------------------------------------------------------------

describe('TaskList entity', () => {
  it('deve ter campos obrigatórios preenchidos', () => {
    const list = makeList();
    expect(list.id).toBeTruthy();
    expect(list.name).toBeTruthy();
    expect(list.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(typeof list.isFavorite).toBe('boolean');
    expect(typeof list.position).toBe('number');
  });

  it('deve aceitar icon como undefined', () => {
    const list = makeList();
    expect(list.icon).toBeUndefined();
  });

  it('deve aceitar icon como emoji', () => {
    const list = makeList({ icon: '👤' });
    expect(list.icon).toBe('👤');
  });

  it('deve aceitar archivedAt como undefined (não arquivada)', () => {
    const list = makeList();
    expect(list.archivedAt).toBeUndefined();
  });

  it('deve aceitar archivedAt preenchido (arquivada)', () => {
    const archivedAt = '2026-06-20T10:00:00.000Z';
    const list = makeList({ archivedAt });
    expect(list.archivedAt).toBe(archivedAt);
  });
});

// ---------------------------------------------------------------------------
// Label
// ---------------------------------------------------------------------------

describe('Label entity', () => {
  it('deve ter id, name e color', () => {
    const label: Label = { id: 'label-001', name: 'Urgente', color: '#EF4444' };
    expect(label.id).toBeTruthy();
    expect(label.name).toBeTruthy();
    expect(label.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});
