/**
 * Lógica PURA (sem dependência de UI/rede) para expandir tarefas recorrentes em
 * ocorrências dentro de um intervalo de datas. Usado pelo calendário para mostrar
 * UMA tarefa recorrente em vários dias.
 *
 * Convenção de datas: strings 'YYYY-MM-DD' (date-only). Toda a aritmética é feita
 * em "datas civis" (sem fuso/horas) para evitar bugs de timezone.
 */

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Recurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  by_weekday: number[] | null; // 0=Dom .. 6=Sáb
  ends_at: string | null; // 'YYYY-MM-DD'
}

/** Tarefa mínima necessária para expandir ocorrências. */
export interface ExpandableTask {
  due_date: string | null;
  recurrence?: Recurrence | null;
}

// ─── Helpers de data (date-only, sem timezone) ────────────────────────────────

/** Converte 'YYYY-MM-DD' (ou 'YYYY-MM-DD HH:MM...') em Date no fuso local à meia-noite. */
function parseDate(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

/** Formata um Date como 'YYYY-MM-DD' usando os componentes locais. */
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Compara só por data civil (ignora hora). Retorna <0, 0 ou >0. */
function cmpDate(a: Date, b: Date): number {
  return a.getTime() - b.getTime();
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

function addMonths(d: Date, n: number): Date {
  // Mantém o mesmo dia do mês; se o mês destino não tiver esse dia (ex.: 31),
  // o Date "transborda" — descartamos essas ocorrências inválidas no chamador.
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

function addYears(d: Date, n: number): Date {
  return new Date(d.getFullYear() + n, d.getMonth(), d.getDate());
}

/**
 * Expande as ocorrências de uma tarefa dentro de [rangeStart, rangeEnd] (inclusive),
 * ambos 'YYYY-MM-DD'. Retorna a lista de datas ('YYYY-MM-DD') ordenadas em que a
 * tarefa deve aparecer.
 *
 * Regras:
 * - Sem `recurrence`: aparece só na `due_date` (se cair no range).
 * - daily: a cada N dias a partir da due_date.
 * - weekly: nos dias da semana de `by_weekday`, a cada N semanas (semana 0 = a da due_date).
 *   Se `by_weekday` for vazio/null, usa o dia da semana da própria due_date.
 * - monthly: mesmo dia do mês, a cada N meses; meses sem aquele dia são pulados.
 * - yearly: mesma data, a cada N anos.
 * - Nunca gera ocorrência anterior à due_date, nem posterior a `ends_at` (se houver).
 */
export function expandRecurrence(
  task: ExpandableTask,
  rangeStart: string,
  rangeEnd: string,
): string[] {
  if (!task.due_date) return [];

  const start = parseDate(rangeStart);
  const end = parseDate(rangeEnd);
  if (cmpDate(start, end) > 0) return [];

  const due = parseDate(task.due_date);
  const rec = task.recurrence ?? null;

  // Sem recorrência: única ocorrência na due_date.
  if (!rec) {
    return cmpDate(due, start) >= 0 && cmpDate(due, end) <= 0 ? [formatDate(due)] : [];
  }

  const interval = rec.interval && rec.interval > 0 ? rec.interval : 1;
  const endsAt = rec.ends_at ? parseDate(rec.ends_at) : null;
  // Limite superior efetivo = min(rangeEnd, ends_at).
  const upper = endsAt && cmpDate(endsAt, end) < 0 ? endsAt : end;
  if (cmpDate(due, upper) > 0) return [];

  const results: string[] = [];
  // Trava de segurança contra laços infinitos por dados inválidos.
  const MAX_ITER = 4000;
  let iter = 0;

  function pushIfInRange(d: Date) {
    if (cmpDate(d, due) < 0) return; // nunca antes da due_date
    if (cmpDate(d, start) < 0) return;
    if (cmpDate(d, upper) > 0) return;
    results.push(formatDate(d));
  }

  switch (rec.frequency) {
    case 'daily': {
      // Avança do due em passos de N dias até passar do upper.
      let cur = due;
      // Salta direto para perto do start para evitar iterar dias fora do range.
      if (cmpDate(start, cur) > 0) {
        const diffDays = Math.floor((start.getTime() - cur.getTime()) / 86_400_000);
        const steps = Math.floor(diffDays / interval);
        cur = addDays(cur, steps * interval);
      }
      while (cmpDate(cur, upper) <= 0 && iter++ < MAX_ITER) {
        pushIfInRange(cur);
        cur = addDays(cur, interval);
      }
      break;
    }

    case 'weekly': {
      const weekdays =
        rec.by_weekday && rec.by_weekday.length > 0
          ? [...new Set(rec.by_weekday)].sort((a, b) => a - b)
          : [due.getDay()];
      // Semana 0 = a semana que contém a due_date (começando no domingo).
      const dueWeekStart = addDays(due, -due.getDay());
      let weekStart = dueWeekStart;
      // Salta para perto do start.
      if (cmpDate(start, weekStart) > 0) {
        const diffDays = Math.floor((start.getTime() - weekStart.getTime()) / 86_400_000);
        const weeksPassed = Math.floor(diffDays / 7);
        const stepsBack = weeksPassed % interval;
        const alignedWeeks = weeksPassed - stepsBack;
        weekStart = addDays(weekStart, alignedWeeks * 7);
      }
      while (cmpDate(weekStart, upper) <= 0 && iter++ < MAX_ITER) {
        for (const wd of weekdays) {
          pushIfInRange(addDays(weekStart, wd));
        }
        weekStart = addDays(weekStart, interval * 7);
      }
      break;
    }

    case 'monthly': {
      const dayOfMonth = due.getDate();
      let cur = due;
      // Salta para perto do start em passos de N meses.
      if (cmpDate(start, cur) > 0) {
        const monthsDiff =
          (start.getFullYear() - cur.getFullYear()) * 12 + (start.getMonth() - cur.getMonth());
        const steps = Math.max(0, Math.floor(monthsDiff / interval));
        cur = addMonths(due, steps * interval);
      }
      // `n` conta os passos a partir da due para gerar datas estáveis.
      let n = Math.round(
        ((cur.getFullYear() - due.getFullYear()) * 12 + (cur.getMonth() - due.getMonth())) /
          interval,
      );
      while (iter++ < MAX_ITER) {
        const occ = addMonths(due, n * interval);
        if (cmpDate(occ, upper) > 0) break;
        // Descarta transbordo de mês (ex.: dia 31 em meses curtos).
        if (occ.getDate() === dayOfMonth) pushIfInRange(occ);
        n++;
      }
      break;
    }

    case 'yearly': {
      let n = 0;
      // Salta para perto do start.
      if (cmpDate(start, due) > 0) {
        const yearsDiff = start.getFullYear() - due.getFullYear();
        n = Math.max(0, Math.floor(yearsDiff / interval));
      }
      while (iter++ < MAX_ITER) {
        const occ = addYears(due, n * interval);
        if (cmpDate(occ, upper) > 0) break;
        // Descarta 29/02 em anos não-bissextos (transbordo p/ 01/03).
        if (occ.getDate() === due.getDate() && occ.getMonth() === due.getMonth()) {
          pushIfInRange(occ);
        }
        n++;
      }
      break;
    }
  }

  // Dedup + ordena (weekly pode gerar fora de ordem entre semanas).
  return [...new Set(results)].sort();
}
