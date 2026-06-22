// Microsoft 365 — geração de resumo de e-mail LOCAL.
//
// SEGURANÇA: este resumo é gerado 100% no dispositivo. NUNCA enviamos o conteúdo
// do e-mail para um serviço externo. A interface está pronta para, no futuro,
// uma implementação de IA on-device ou com consentimento explícito — mas o
// contrato (entrada/saída string) não muda.

/** Limites do resumo, em caracteres. */
export const SUMMARY_MIN_CHARS = 100;
export const SUMMARY_MAX_CHARS = 300;

/** Normaliza espaços/quebras de linha e remove caracteres de controle. */
function normalize(text: string): string {
  return text
    // Remove caracteres de controle (U+0000-U+001F e U+007F).
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trunca em uma fronteira de palavra, sem ultrapassar max. */
function truncateAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  // Reserva 1 char para o ellipsis.
  const slice = text.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(' ');
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

/**
 * Gera um resumo local do e-mail entre 100 e 300 caracteres.
 *
 * Heurística atual (substituível por IA no futuro):
 *  - Combina assunto + preview do corpo.
 *  - Normaliza espaços.
 *  - Se ficar curto (<100), preenche com o assunto como contexto.
 *  - Trunca em fronteira de palavra para não passar de 300.
 *
 * Garantia: o retorno tem no MÁXIMO 300 chars. Tenta ficar acima de 100 chars
 * quando há conteúdo suficiente. Se a entrada for muito curta, o resumo pode
 * ficar abaixo de 100 (não há como inventar conteúdo) — retornamos o que houver.
 */
export function summarizeEmail(preview: string, subject: string): string {
  const cleanSubject = normalize(subject ?? '');
  const cleanPreview = normalize(preview ?? '');

  // Base: "Assunto — preview". Evita duplicar se o preview já começa com o assunto.
  let base: string;
  if (cleanSubject && cleanPreview) {
    base = cleanPreview.toLowerCase().startsWith(cleanSubject.toLowerCase())
      ? cleanPreview
      : `${cleanSubject} — ${cleanPreview}`;
  } else {
    base = cleanPreview || cleanSubject;
  }

  if (!base) return '';

  // Abaixo do mínimo → tenta enriquecer com o assunto como prefixo de contexto.
  if (base.length < SUMMARY_MIN_CHARS && cleanSubject && !base.startsWith(cleanSubject)) {
    base = `${cleanSubject}: ${base}`;
  }

  // Acima do máximo → trunca em palavra.
  if (base.length > SUMMARY_MAX_CHARS) {
    return truncateAtWord(base, SUMMARY_MAX_CHARS);
  }

  return base;
}
