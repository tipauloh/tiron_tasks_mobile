import { formatKpiValue, formatProgressPercent } from '../../src/utils/kpi-format';

describe('formatKpiValue', () => {
  it('number → o valor como está', () => {
    expect(formatKpiValue(42, 'number')).toBe('42');
  });

  it('quantity → o valor como está', () => {
    expect(formatKpiValue(12, 'quantity')).toBe('12');
  });

  it('percent → sufixo %', () => {
    expect(formatKpiValue(80, 'percent')).toBe('80%');
  });

  it('currency → prefixo R$', () => {
    expect(formatKpiValue(1500, 'currency')).toBe('R$ 1500');
  });

  it('time → sufixo h', () => {
    expect(formatKpiValue(10, 'time')).toBe('10h');
  });

  it('weight → sufixo kg', () => {
    expect(formatKpiValue(75, 'weight')).toBe('75 kg');
  });

  it('custom → usa a unidade fornecida', () => {
    expect(formatKpiValue(30, 'custom', 'páginas')).toBe('30 páginas');
  });

  it('custom sem unidade → só o valor', () => {
    expect(formatKpiValue(30, 'custom')).toBe('30');
  });

  it('decimais → mantém com vírgula, sem zeros à toa', () => {
    expect(formatKpiValue(75.5, 'weight')).toBe('75,5 kg');
    expect(formatKpiValue(75.0, 'weight')).toBe('75 kg');
  });
});

describe('formatProgressPercent', () => {
  it('formata 0..1 como inteiro %', () => {
    expect(formatProgressPercent(0.8)).toBe('80%');
    expect(formatProgressPercent(0)).toBe('0%');
    expect(formatProgressPercent(1)).toBe('100%');
  });

  it('faz clamp fora do intervalo', () => {
    expect(formatProgressPercent(1.4)).toBe('100%');
    expect(formatProgressPercent(-0.2)).toBe('0%');
  });
});
