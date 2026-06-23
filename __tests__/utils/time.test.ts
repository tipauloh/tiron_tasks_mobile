import {
  minutesToTime,
  shiftEndOnStartChange,
  applyStartChange,
  applyEndChange,
  recomputeDuration,
  type TimeRangeState,
} from '../../src/utils/time';

describe('minutesToTime', () => {
  it('converte e faz clamp 00:00–23:59', () => {
    expect(minutesToTime(0)).toBe('00:00');
    expect(minutesToTime(9 * 60 + 5)).toBe('09:05');
    expect(minutesToTime(23 * 60 + 59)).toBe('23:59');
    expect(minutesToTime(99999)).toBe('23:59'); // clamp
    expect(minutesToTime(-10)).toBe('00:00'); // clamp
  });
});

describe('shiftEndOnStartChange (mantém a janela ao mudar o início)', () => {
  it('desloca o fim mantendo a duração', () => {
    // 09:00–10:30 (90min) → início 11:00 → fim 12:30
    expect(shiftEndOnStartChange('09:00', '10:30', '11:00')).toBe('12:30');
    // janela de 60min
    expect(shiftEndOnStartChange('08:00', '09:00', '14:15')).toBe('15:15');
  });

  it('faz clamp do fim em 23:59 (não vira o dia)', () => {
    expect(shiftEndOnStartChange('09:00', '10:00', '23:30')).toBe('23:59');
  });

  it('não desloca quando não há janela válida prévia', () => {
    expect(shiftEndOnStartChange('', '10:30', '11:00')).toBeNull(); // sem início anterior
    expect(shiftEndOnStartChange('09:00', '', '11:00')).toBeNull(); // sem fim
    expect(shiftEndOnStartChange('09:00', '10:30', '11')).toBeNull(); // novo início incompleto
    expect(shiftEndOnStartChange('10:00', '09:00', '11:00')).toBeNull(); // janela anterior inválida
  });
});

describe('applyStartChange / applyEndChange (faixa início–fim com duração)', () => {
  // Simula a digitação caractere a caractere, propagando o estado como o componente.
  function type(state: TimeRangeState, seq: string[], which: 'start' | 'end') {
    return seq.reduce(
      (s, raw) => (which === 'start' ? applyStartChange(s, raw) : applyEndChange(s, raw)),
      state,
    );
  }

  it('REGRESSÃO: mantém a janela ao redigitar o início dígito a dígito', () => {
    // Janela inicial 09:00–10:30 (90 min) já memorizada.
    const initial: TimeRangeState = { start: '09:00', end: '10:30', duration: 90 };
    // Usuário limpa o início e redigita 11:00 (passa por estados parciais inválidos).
    const result = type(initial, ['', '1', '11', '110', '1100'], 'start');
    expect(result.start).toBe('11:00');
    expect(result.end).toBe('12:30'); // janela de 90 min preservada
    expect(result.duration).toBe(90);
  });

  it('desloca quando o novo início chega completo de uma vez', () => {
    const r = applyStartChange({ start: '08:00', end: '09:00', duration: 60 }, '1415');
    expect(r.end).toBe('15:15');
  });

  it('mudar o fim atualiza a duração e não toca o início', () => {
    const r = applyEndChange({ start: '09:00', end: '10:00', duration: 60 }, '1200');
    expect(r.start).toBe('09:00');
    expect(r.end).toBe('12:00');
    expect(r.duration).toBe(180);
  });

  it('não cria fim quando não havia fim definido', () => {
    const r = applyStartChange({ start: '', end: '', duration: null }, '0800');
    expect(r.start).toBe('08:00');
    expect(r.end).toBe('');
  });

  it('recomputeDuration mantém o valor anterior quando a janela é inválida', () => {
    expect(recomputeDuration('09:00', '10:30', null)).toBe(90);
    expect(recomputeDuration('09:0', '10:30', 90)).toBe(90); // parcial → mantém
    expect(recomputeDuration('', '10:30', 90)).toBe(90); // vazio → mantém
  });
});
