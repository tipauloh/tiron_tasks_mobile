/**
 * Lógica pura (sem dependência de UI) para separar tarefas concluídas das pendentes
 * e montar as linhas de uma FlatList com cabeçalho de seção recolhível.
 */

/** Separa tarefas em pendentes (tudo que não está 'completed') e concluídas. */
export function partitionTasks<T extends { status: string }>(tasks: T[]): { pending: T[]; completed: T[] } {
  const pending: T[] = [];
  const completed: T[] = [];
  for (const t of tasks) {
    if (t.status === 'completed') completed.push(t);
    else pending.push(t);
  }
  return { pending, completed };
}

/** Linha discriminada para alimentar uma FlatList com cabeçalho de seção de concluídas. */
export type TaskRow<T> =
  | { kind: 'task'; task: T }
  | { kind: 'completed-header'; count: number };

export const COMPLETED_HEADER_KEY = '__completed_header__';

/**
 * Monta as linhas de uma FlatList: pendentes no topo, um cabeçalho "Concluídas (N)"
 * e — quando `showCompleted` — as concluídas abaixo. Se não houver concluídas, o
 * cabeçalho é omitido.
 */
export function buildTaskRows<T extends { status: string }>(
  tasks: T[],
  showCompleted: boolean,
): TaskRow<T>[] {
  const { pending, completed } = partitionTasks(tasks);
  const rows: TaskRow<T>[] = pending.map((task) => ({ kind: 'task', task }));
  if (completed.length > 0) {
    rows.push({ kind: 'completed-header', count: completed.length });
    if (showCompleted) {
      for (const task of completed) rows.push({ kind: 'task', task });
    }
  }
  return rows;
}
