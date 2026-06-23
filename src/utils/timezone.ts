/**
 * Fuso horário por usuário.
 *
 * Regra do sistema: os horários das tarefas (due_date + start_time/end_time) são
 * armazenados como "wall-clock" CANÔNICO no fuso de referência America/Sao_Paulo
 * (é como sempre foram criados). Mudar o fuso do usuário NÃO reconverte nada no
 * banco — apenas muda a EXIBIÇÃO. O par (data, hora) representa um instante fixo
 * em Brasília e é mostrado convertido para o fuso escolhido.
 *
 * Ex.: tarefa 08:00 criada em -3; usuário troca para -4 → exibe 07:00.
 */

export const SYSTEM_TZ = 'America/Sao_Paulo';

export interface TimezoneOption {
  id: string; // IANA
  label: string; // rótulo amigável (pt-BR)
}

/** Lista curada — Brasil completo + principais internacionais. */
export const TIMEZONES: TimezoneOption[] = [
  { id: 'America/Noronha', label: 'Fernando de Noronha' },
  { id: 'America/Sao_Paulo', label: 'Brasília / São Paulo' },
  { id: 'America/Bahia', label: 'Salvador / Bahia' },
  { id: 'America/Fortaleza', label: 'Fortaleza / Recife' },
  { id: 'America/Cuiaba', label: 'Cuiabá / Mato Grosso' },
  { id: 'America/Campo_Grande', label: 'Campo Grande / MS' },
  { id: 'America/Manaus', label: 'Manaus / Amazonas' },
  { id: 'America/Boa_Vista', label: 'Boa Vista / Roraima' },
  { id: 'America/Porto_Velho', label: 'Porto Velho / Rondônia' },
  { id: 'America/Rio_Branco', label: 'Rio Branco / Acre' },
  { id: 'America/New_York', label: 'Nova York (EUA Leste)' },
  { id: 'America/Chicago', label: 'Chicago (EUA Central)' },
  { id: 'America/Los_Angeles', label: 'Los Angeles (EUA Oeste)' },
  { id: 'Europe/Lisbon', label: 'Lisboa' },
  { id: 'Europe/London', label: 'Londres' },
  { id: 'Europe/Paris', label: 'Paris / Madri / Roma' },
  { id: 'Asia/Tokyo', label: 'Tóquio' },
  { id: 'UTC', label: 'UTC' },
];

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Offset (em minutos, positivo a leste de UTC) de um fuso IANA num dado instante.
 * Ex.: America/Sao_Paulo → -180. Usa Intl (lida com horário de verão).
 * Em caso de falha de Intl no ambiente, cai no offset do próprio dispositivo.
 */
export function tzOffsetMinutes(timeZone: string, at: Date): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = dtf.formatToParts(at);
    const m: Record<string, number> = {};
    for (const p of parts) {
      if (p.type !== 'literal') m[p.type] = Number(p.value);
    }
    // Hermes às vezes formata meia-noite como hora "24" — normaliza.
    const hour = m.hour === 24 ? 0 : m.hour;
    const asUTC = Date.UTC(m.year, m.month - 1, m.day, hour, m.minute, m.second);
    return Math.round((asUTC - at.getTime()) / 60000);
  } catch {
    return -at.getTimezoneOffset();
  }
}

/** Interpreta um wall-clock (ano/mês/dia/hora/min) NUM fuso e retorna o instante UTC. */
function wallClockToInstant(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  timeZone: string,
): Date {
  const guessUTC = Date.UTC(y, mo - 1, d, h, mi);
  // Itera 2x para acertar perto de transições de DST.
  let offset = tzOffsetMinutes(timeZone, new Date(guessUTC));
  let instant = new Date(guessUTC - offset * 60000);
  offset = tzOffsetMinutes(timeZone, instant);
  instant = new Date(guessUTC - offset * 60000);
  return instant;
}

/** Decompõe um instante UTC no wall-clock de um fuso. */
function instantToWallClock(
  instant: Date,
  timeZone: string,
): { y: number; mo: number; d: number; h: number; mi: number } {
  const offset = tzOffsetMinutes(timeZone, instant);
  const local = new Date(instant.getTime() + offset * 60000);
  return {
    y: local.getUTCFullYear(),
    mo: local.getUTCMonth() + 1,
    d: local.getUTCDate(),
    h: local.getUTCHours(),
    mi: local.getUTCMinutes(),
  };
}

export interface DateTimeParts {
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:MM'
}

/**
 * Move um wall-clock (data + hora) de um fuso para outro, preservando o instante.
 * Retorna a nova data e hora (a data pode mudar se cruzar a meia-noite).
 */
export function shiftWallClock(
  dateISO: string,
  timeHHMM: string,
  fromTz: string,
  toTz: string,
): DateTimeParts {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const [h, mi] = timeHHMM.split(':').map(Number);
  if (!y || !mo || !d || Number.isNaN(h) || Number.isNaN(mi)) {
    return { date: dateISO, time: timeHHMM };
  }
  if (fromTz === toTz) return { date: dateISO, time: timeHHMM };
  const instant = wallClockToInstant(y, mo, d, h, mi, fromTz);
  const w = instantToWallClock(instant, toTz);
  return {
    date: `${w.y}-${pad(w.mo)}-${pad(w.d)}`,
    time: `${pad(w.h)}:${pad(w.mi)}`,
  };
}

/** Canônico (Brasília) → fuso do usuário, para EXIBIR. */
export function canonicalToDisplay(
  dateISO: string,
  timeHHMM: string,
  userTz: string,
): DateTimeParts {
  return shiftWallClock(dateISO, timeHHMM, SYSTEM_TZ, userTz);
}

/** Fuso do usuário → canônico (Brasília), para SALVAR. */
export function displayToCanonical(
  dateISO: string,
  timeHHMM: string,
  userTz: string,
): DateTimeParts {
  return shiftWallClock(dateISO, timeHHMM, userTz, SYSTEM_TZ);
}

/** Rótulo de offset atual de um fuso, ex.: "UTC-3" / "UTC+1". */
export function formatOffset(timeZone: string, at: Date = new Date()): string {
  const off = tzOffsetMinutes(timeZone, at);
  if (off === 0) return 'UTC';
  const sign = off > 0 ? '+' : '-';
  const abs = Math.abs(off);
  const hh = Math.floor(abs / 60);
  const mm = abs % 60;
  return mm === 0 ? `UTC${sign}${hh}` : `UTC${sign}${hh}:${pad(mm)}`;
}

/** Nome amigável de um fuso (com fallback para o próprio id). */
export function timezoneLabel(timeZone: string): string {
  return TIMEZONES.find((t) => t.id === timeZone)?.label ?? timeZone;
}

/** Data de "hoje" (YYYY-MM-DD) num fuso. */
export function todayInTz(timeZone: string): string {
  const w = instantToWallClock(new Date(), timeZone);
  return `${w.y}-${pad(w.mo)}-${pad(w.d)}`;
}

export interface TaskSchedule {
  dueDate?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * Converte o horário CANÔNICO (Brasília) de uma tarefa para o fuso do usuário,
 * para EXIBIÇÃO. Tarefas sem horário (só data ou nada) não são convertidas —
 * uma data "dia inteiro" não tem fuso. A data exibida acompanha o horário se a
 * conversão cruzar a meia-noite.
 */
export function displaySchedule(
  schedule: TaskSchedule,
  userTz: string,
): TaskSchedule {
  const { dueDate, startTime, endTime } = schedule;
  if (!startTime || userTz === SYSTEM_TZ) return schedule;
  const base = dueDate ?? todayInTz(SYSTEM_TZ);
  const start = canonicalToDisplay(base, startTime, userTz);
  const out: TaskSchedule = {
    dueDate: dueDate ? start.date : undefined,
    startTime: start.time,
    endTime: undefined,
  };
  if (endTime) {
    out.endTime = canonicalToDisplay(base, endTime, userTz).time;
  }
  return out;
}

/**
 * Inverso de displaySchedule: converte o horário digitado pelo usuário (no fuso
 * dele) de volta para o CANÔNICO (Brasília), para SALVAR na API.
 */
export function toCanonicalSchedule(
  schedule: TaskSchedule,
  userTz: string,
): TaskSchedule {
  const { dueDate, startTime, endTime } = schedule;
  if (!startTime || userTz === SYSTEM_TZ) return schedule;
  const base = dueDate ?? todayInTz(userTz);
  const start = displayToCanonical(base, startTime, userTz);
  const out: TaskSchedule = {
    dueDate: dueDate ? start.date : undefined,
    startTime: start.time,
    endTime: undefined,
  };
  if (endTime) {
    out.endTime = displayToCanonical(base, endTime, userTz).time;
  }
  return out;
}
