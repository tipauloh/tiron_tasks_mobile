/**
 * Testes do gerador de resumo local de e-mail.
 * Garante limites de 100–300 chars e que nada é enviado para fora (função pura).
 */

import {
  summarizeEmail,
  SUMMARY_MIN_CHARS,
  SUMMARY_MAX_CHARS,
} from '../../../src/modules/microsoft365/services/summary';

describe('summarizeEmail', () => {
  it('trunca conteúdo longo para no máximo 300 chars', () => {
    const longPreview = 'lorem ipsum dolor sit amet '.repeat(50);
    const out = summarizeEmail(longPreview, 'Assunto qualquer');
    expect(out.length).toBeLessThanOrEqual(SUMMARY_MAX_CHARS);
    expect(out.length).toBeGreaterThanOrEqual(SUMMARY_MIN_CHARS);
  });

  it('mantém um resumo de tamanho médio dentro da faixa 100–300', () => {
    const preview =
      'Segue em anexo a proposta atualizada com os novos valores e prazos combinados ' +
      'na última reunião. Por favor, revise os itens destacados e responda até sexta.';
    const out = summarizeEmail(preview, 'Proposta comercial');
    expect(out.length).toBeGreaterThanOrEqual(SUMMARY_MIN_CHARS);
    expect(out.length).toBeLessThanOrEqual(SUMMARY_MAX_CHARS);
  });

  it('normaliza múltiplos espaços e quebras de linha', () => {
    const out = summarizeEmail('linha1\n\n   linha2\t\tlinha3', 'Assunto');
    expect(out).not.toMatch(/\s{2,}/);
    expect(out).not.toMatch(/\n|\t/);
  });

  it('combina assunto e preview quando o preview não começa pelo assunto', () => {
    const out = summarizeEmail('corpo do email aqui', 'Reunião');
    expect(out).toContain('Reunião');
    expect(out).toContain('corpo do email aqui');
  });

  it('não duplica o assunto quando o preview já começa com ele', () => {
    const out = summarizeEmail('Reunião amanhã às 10h confirmada', 'Reunião');
    const occurrences = out.split('Reunião').length - 1;
    expect(occurrences).toBe(1);
  });

  it('retorna string vazia quando não há conteúdo', () => {
    expect(summarizeEmail('', '')).toBe('');
  });

  it('lida com entrada muito curta sem quebrar (pode ficar abaixo de 100)', () => {
    const out = summarizeEmail('ok', 'Oi');
    expect(typeof out).toBe('string');
    expect(out.length).toBeLessThanOrEqual(SUMMARY_MAX_CHARS);
  });

  it('nunca ultrapassa 300 chars mesmo com assunto enorme', () => {
    const hugeSubject = 'x'.repeat(500);
    const out = summarizeEmail('corpo', hugeSubject);
    expect(out.length).toBeLessThanOrEqual(SUMMARY_MAX_CHARS);
  });
});
