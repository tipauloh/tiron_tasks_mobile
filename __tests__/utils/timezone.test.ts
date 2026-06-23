import {
  canonicalToDisplay,
  displayToCanonical,
  displaySchedule,
  toCanonicalSchedule,
  formatOffset,
  SYSTEM_TZ,
} from '@/utils/timezone';

describe('timezone conversion', () => {
  it('exibe o horário canônico (Brasília -3) no fuso do usuário', () => {
    // 08:00 em -3 visto em Manaus (-4) => 07:00 (exemplo do produto)
    expect(canonicalToDisplay('2026-06-21', '08:00', 'America/Manaus')).toEqual({
      date: '2026-06-21',
      time: '07:00',
    });
    // visto em Fernando de Noronha (-2) => 09:00
    expect(canonicalToDisplay('2026-06-21', '08:00', 'America/Noronha')).toEqual({
      date: '2026-06-21',
      time: '09:00',
    });
  });

  it('não altera quando o fuso é o canônico', () => {
    expect(canonicalToDisplay('2026-06-21', '08:00', SYSTEM_TZ)).toEqual({
      date: '2026-06-21',
      time: '08:00',
    });
  });

  it('salva (fuso do usuário -> canônico) de forma inversa', () => {
    // usuário em Manaus digita 08:00 => canônico 09:00
    expect(displayToCanonical('2026-06-21', '08:00', 'America/Manaus')).toEqual({
      date: '2026-06-21',
      time: '09:00',
    });
  });

  it('é consistente no round-trip (salvar e exibir volta ao original)', () => {
    const canon = displayToCanonical('2026-06-21', '08:00', 'America/Manaus');
    expect(canonicalToDisplay(canon.date, canon.time, 'America/Manaus')).toEqual({
      date: '2026-06-21',
      time: '08:00',
    });
  });

  it('ajusta a data ao cruzar a meia-noite', () => {
    // 23:30 em -3 visto em Lisboa (verão +1) => 03:30 do dia seguinte
    const r = canonicalToDisplay('2026-06-21', '23:30', 'Europe/Lisbon');
    expect(r.date).toBe('2026-06-22');
    expect(r.time).toBe('03:30');
  });

  it('displaySchedule não converte tarefas sem horário (dia inteiro)', () => {
    expect(displaySchedule({ dueDate: '2026-06-21' }, 'America/Manaus')).toEqual({
      dueDate: '2026-06-21',
    });
  });

  it('displaySchedule converte data+início+fim juntos', () => {
    const r = displaySchedule(
      { dueDate: '2026-06-21', startTime: '08:00', endTime: '09:30' },
      'America/Manaus',
    );
    expect(r).toEqual({ dueDate: '2026-06-21', startTime: '07:00', endTime: '08:30' });
  });

  it('toCanonicalSchedule é o inverso de displaySchedule', () => {
    const display = { dueDate: '2026-06-21', startTime: '08:00', endTime: '09:30' };
    const canon = toCanonicalSchedule(display, 'America/Manaus');
    expect(displaySchedule(canon, 'America/Manaus')).toEqual(display);
  });

  it('formata offsets legíveis', () => {
    expect(formatOffset('America/Sao_Paulo')).toBe('UTC-3');
    expect(formatOffset('America/Manaus')).toBe('UTC-4');
    expect(formatOffset('UTC')).toBe('UTC');
  });
});
