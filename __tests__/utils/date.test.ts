/**
 * Testes unitários das funções utilitárias de data/id.
 * Arquivo: src/utils/id.ts
 *
 * Usa jest-expo preset.
 */

// Mock de expo-modules-core para o uuid (não disponível no ambiente de teste Jest puro)
jest.mock('expo-modules-core', () => ({
  uuid: {
    v4: jest.fn(() => '12345678-1234-1234-1234-123456789012'),
  },
}));

import { generateId, nowISO, todayDate } from '../../src/utils/id';

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

describe('generateId', () => {
  it('retorna uma string não vazia', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('retorna o UUID mockado no ambiente de teste', () => {
    const id = generateId();
    expect(id).toBe('12345678-1234-1234-1234-123456789012');
  });
});

// ---------------------------------------------------------------------------
// nowISO
// ---------------------------------------------------------------------------

describe('nowISO', () => {
  it('retorna string no formato ISO 8601 com sufixo Z', () => {
    const iso = nowISO();
    expect(typeof iso).toBe('string');
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('retorna data atual (não futura nem muito no passado)', () => {
    const before = Date.now();
    const iso = nowISO();
    const after = Date.now();
    const ts = new Date(iso).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it('retorna uma string parseável pelo construtor Date', () => {
    const iso = nowISO();
    const parsed = new Date(iso);
    expect(Number.isNaN(parsed.getTime())).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// todayDate
// ---------------------------------------------------------------------------

describe('todayDate', () => {
  it('retorna string no formato YYYY-MM-DD', () => {
    const date = todayDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('não inclui componente de hora', () => {
    const date = todayDate();
    expect(date).not.toContain('T');
    expect(date).not.toContain(':');
  });

  it('retorna a data de hoje em UTC', () => {
    const date = todayDate();
    const expectedUTC = new Date().toISOString().split('T')[0];
    expect(date).toBe(expectedUTC);
  });

  it('retorna string com comprimento exato de 10 caracteres', () => {
    const date = todayDate();
    expect(date).toHaveLength(10);
  });

  it('partes da data são números válidos', () => {
    const date = todayDate();
    const [year, month, day] = date.split('-').map(Number);
    expect(year).toBeGreaterThanOrEqual(2026);
    expect(month).toBeGreaterThanOrEqual(1);
    expect(month).toBeLessThanOrEqual(12);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });
});
