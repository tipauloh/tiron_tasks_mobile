import { minutesToTime, shiftEndOnStartChange } from '../../src/utils/time';

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
