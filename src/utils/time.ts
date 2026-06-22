/**
 * Helpers puros para horários no formato 'HH:MM' (24h). JS-only, sem dependências.
 */

/** Aplica máscara HH:MM enquanto o usuário digita (aceita só dígitos). */
export function maskTime(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
}

/** Valida uma string 'HH:MM' completa (00:00–23:59). String vazia é considerada "sem valor" (válida). */
export function isValidTime(value: string): boolean {
  if (value === '') return true;
  const m = /^([0-9]{2}):([0-9]{2})$/.exec(value);
  if (!m) return false;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  return h >= 0 && h <= 23 && min >= 0 && min <= 59;
}

/** Converte 'HH:MM' em minutos desde a meia-noite. Retorna null se inválido/vazio. */
export function timeToMinutes(value: string): number | null {
  if (!isValidTime(value) || value === '') return null;
  const [h, m] = value.split(':').map((n) => parseInt(n, 10));
  return h * 60 + m;
}

/**
 * Verifica se o horário de fim é >= início. Se algum dos dois estiver vazio,
 * não há violação (retorna true).
 */
export function isEndAfterStart(start: string, end: string): boolean {
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s == null || e == null) return true;
  return e >= s;
}

/** Converte minutos desde a meia-noite em 'HH:MM' (clamp 00:00–23:59). */
export function minutesToTime(mins: number): string {
  const m = Math.max(0, Math.min(1439, Math.round(mins)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/**
 * Ao alterar o horário de INÍCIO, calcula o novo horário de FIM mantendo a mesma
 * janela de tempo (duração) que existia antes. Retorna o novo 'HH:MM' do fim, ou
 * `null` quando não se deve ajustar (sem janela válida prévia / valores incompletos).
 * O fim é limitado a 23:59 (não "vira o dia").
 */
export function shiftEndOnStartChange(
  prevStart: string,
  end: string,
  newStart: string,
): string | null {
  const prev = timeToMinutes(prevStart);
  const e = timeToMinutes(end);
  const ns = timeToMinutes(newStart);
  if (prev == null || e == null || ns == null) return null;
  if (e < prev) return null; // janela anterior inválida — não desloca
  const duration = e - prev;
  return minutesToTime(ns + duration);
}
