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
