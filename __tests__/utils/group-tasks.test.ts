import { partitionTasks, buildTaskRows, COMPLETED_HEADER_KEY } from '../../src/utils/group-tasks';

type T = { id: string; status: string };

const pendentes: T[] = [
  { id: '1', status: 'not_started' },
  { id: '2', status: 'in_progress' },
];
const concluidas: T[] = [
  { id: '3', status: 'completed' },
  { id: '4', status: 'completed' },
];
const cancelada: T = { id: '5', status: 'cancelled' };

describe('partitionTasks', () => {
  it('separa concluídas das demais', () => {
    const { pending, completed } = partitionTasks([...pendentes, ...concluidas]);
    expect(pending.map((t) => t.id)).toEqual(['1', '2']);
    expect(completed.map((t) => t.id)).toEqual(['3', '4']);
  });

  it('trata cancelada como pendente (não-concluída)', () => {
    const { pending, completed } = partitionTasks([cancelada, ...concluidas]);
    expect(pending.map((t) => t.id)).toEqual(['5']);
    expect(completed).toHaveLength(2);
  });

  it('lida com lista vazia', () => {
    const { pending, completed } = partitionTasks<T>([]);
    expect(pending).toEqual([]);
    expect(completed).toEqual([]);
  });
});

describe('buildTaskRows', () => {
  it('omite o cabeçalho quando não há concluídas', () => {
    const rows = buildTaskRows(pendentes, false);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.kind === 'task')).toBe(true);
  });

  it('com showCompleted=false: pendentes + cabeçalho, sem concluídas', () => {
    const rows = buildTaskRows([...pendentes, ...concluidas], false);
    expect(rows).toHaveLength(3); // 2 pendentes + 1 header
    expect(rows[2]).toEqual({ kind: 'completed-header', count: 2 });
  });

  it('com showCompleted=true: pendentes + cabeçalho + concluídas', () => {
    const rows = buildTaskRows([...pendentes, ...concluidas], true);
    expect(rows).toHaveLength(5); // 2 + header + 2
    expect(rows[2]).toEqual({ kind: 'completed-header', count: 2 });
    expect(rows[3]).toMatchObject({ kind: 'task', task: { id: '3' } });
    expect(rows[4]).toMatchObject({ kind: 'task', task: { id: '4' } });
  });

  it('cabeçalho sempre vem após as pendentes e antes das concluídas', () => {
    const rows = buildTaskRows([concluidas[0], pendentes[0]], true);
    expect(rows[0]).toMatchObject({ kind: 'task', task: { id: '1' } });
    expect(rows[1]).toEqual({ kind: 'completed-header', count: 1 });
    expect(rows[2]).toMatchObject({ kind: 'task', task: { id: '3' } });
  });

  it('exporta a chave estável do cabeçalho', () => {
    expect(COMPLETED_HEADER_KEY).toBe('__completed_header__');
  });
});
