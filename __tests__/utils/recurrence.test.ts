import { expandRecurrence, formatDate, type Recurrence } from '../../src/utils/recurrence';

function rec(partial: Partial<Recurrence>): Recurrence {
  return {
    frequency: 'daily',
    interval: 1,
    by_weekday: null,
    ends_at: null,
    ...partial,
  };
}

describe('expandRecurrence — sem recorrência', () => {
  it('retorna só a due_date quando dentro do range', () => {
    expect(
      expandRecurrence({ due_date: '2026-06-15' }, '2026-06-01', '2026-06-30'),
    ).toEqual(['2026-06-15']);
  });

  it('retorna vazio se due_date fora do range', () => {
    expect(
      expandRecurrence({ due_date: '2026-07-15' }, '2026-06-01', '2026-06-30'),
    ).toEqual([]);
  });

  it('retorna vazio sem due_date', () => {
    expect(
      expandRecurrence({ due_date: null }, '2026-06-01', '2026-06-30'),
    ).toEqual([]);
  });

  it('inclui as bordas do range (inclusive)', () => {
    expect(
      expandRecurrence({ due_date: '2026-06-01' }, '2026-06-01', '2026-06-30'),
    ).toEqual(['2026-06-01']);
    expect(
      expandRecurrence({ due_date: '2026-06-30' }, '2026-06-01', '2026-06-30'),
    ).toEqual(['2026-06-30']);
  });
});

describe('expandRecurrence — diária', () => {
  it('a cada 1 dia preenche todo o range a partir da due_date', () => {
    const out = expandRecurrence(
      { due_date: '2026-06-10', recurrence: rec({ frequency: 'daily', interval: 1 }) },
      '2026-06-10',
      '2026-06-13',
    );
    expect(out).toEqual(['2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13']);
  });

  it('a cada 3 dias', () => {
    const out = expandRecurrence(
      { due_date: '2026-06-01', recurrence: rec({ frequency: 'daily', interval: 3 }) },
      '2026-06-01',
      '2026-06-12',
    );
    expect(out).toEqual(['2026-06-01', '2026-06-04', '2026-06-07', '2026-06-10']);
  });

  it('não gera ocorrências antes da due_date', () => {
    const out = expandRecurrence(
      { due_date: '2026-06-10', recurrence: rec({ frequency: 'daily', interval: 1 }) },
      '2026-06-01',
      '2026-06-11',
    );
    expect(out).toEqual(['2026-06-10', '2026-06-11']);
  });

  it('respeita ends_at', () => {
    const out = expandRecurrence(
      {
        due_date: '2026-06-01',
        recurrence: rec({ frequency: 'daily', interval: 1, ends_at: '2026-06-03' }),
      },
      '2026-06-01',
      '2026-06-30',
    );
    expect(out).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });

  it('alinha corretamente o passo quando o range começa depois da due_date', () => {
    // due 01, a cada 3 dias => 01,04,07,10,13,16,19. Range 08..14 => 10,13.
    const out = expandRecurrence(
      { due_date: '2026-06-01', recurrence: rec({ frequency: 'daily', interval: 3 }) },
      '2026-06-08',
      '2026-06-14',
    );
    expect(out).toEqual(['2026-06-10', '2026-06-13']);
  });
});

describe('expandRecurrence — semanal', () => {
  it('usa o dia da semana da due_date quando by_weekday é null', () => {
    // 2026-06-01 é segunda (getDay=1).
    const out = expandRecurrence(
      { due_date: '2026-06-01', recurrence: rec({ frequency: 'weekly', interval: 1 }) },
      '2026-06-01',
      '2026-06-30',
    );
    expect(out).toEqual(['2026-06-01', '2026-06-08', '2026-06-15', '2026-06-22', '2026-06-29']);
  });

  it('múltiplos dias da semana (seg e qua), semanal', () => {
    // by_weekday = [1, 3] => segundas e quartas.
    const out = expandRecurrence(
      {
        due_date: '2026-06-01',
        recurrence: rec({ frequency: 'weekly', interval: 1, by_weekday: [1, 3] }),
      },
      '2026-06-01',
      '2026-06-10',
    );
    // seg 01, qua 03, seg 08, qua 10
    expect(out).toEqual(['2026-06-01', '2026-06-03', '2026-06-08', '2026-06-10']);
  });

  it('a cada 2 semanas pula a semana intermediária', () => {
    const out = expandRecurrence(
      {
        due_date: '2026-06-01',
        recurrence: rec({ frequency: 'weekly', interval: 2, by_weekday: [1] }),
      },
      '2026-06-01',
      '2026-06-30',
    );
    // seg 01, (pula 08), seg 15, (pula 22), seg 29
    expect(out).toEqual(['2026-06-01', '2026-06-15', '2026-06-29']);
  });

  it('não gera dias da semana anteriores à due_date dentro da primeira semana', () => {
    // due quarta 03; by_weekday inclui seg(1) e qua(3). Seg 01 é antes do due → excluído.
    const out = expandRecurrence(
      {
        due_date: '2026-06-03',
        recurrence: rec({ frequency: 'weekly', interval: 1, by_weekday: [1, 3] }),
      },
      '2026-06-01',
      '2026-06-10',
    );
    expect(out).toEqual(['2026-06-03', '2026-06-08', '2026-06-10']);
  });
});

describe('expandRecurrence — mensal', () => {
  it('mesmo dia do mês a cada 1 mês', () => {
    const out = expandRecurrence(
      { due_date: '2026-01-15', recurrence: rec({ frequency: 'monthly', interval: 1 }) },
      '2026-01-01',
      '2026-04-30',
    );
    expect(out).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
  });

  it('pula meses que não têm o dia (dia 31)', () => {
    const out = expandRecurrence(
      { due_date: '2026-01-31', recurrence: rec({ frequency: 'monthly', interval: 1 }) },
      '2026-01-01',
      '2026-05-31',
    );
    // fev e abr não têm dia 31 → pulados
    expect(out).toEqual(['2026-01-31', '2026-03-31', '2026-05-31']);
  });

  it('a cada 2 meses', () => {
    const out = expandRecurrence(
      { due_date: '2026-01-10', recurrence: rec({ frequency: 'monthly', interval: 2 }) },
      '2026-01-01',
      '2026-06-30',
    );
    expect(out).toEqual(['2026-01-10', '2026-03-10', '2026-05-10']);
  });

  it('range em mês futuro retorna só ocorrências naquele range', () => {
    const out = expandRecurrence(
      { due_date: '2026-01-15', recurrence: rec({ frequency: 'monthly', interval: 1 }) },
      '2026-03-01',
      '2026-03-31',
    );
    expect(out).toEqual(['2026-03-15']);
  });
});

describe('expandRecurrence — anual', () => {
  it('mesma data a cada ano', () => {
    const out = expandRecurrence(
      { due_date: '2024-03-10', recurrence: rec({ frequency: 'yearly', interval: 1 }) },
      '2026-01-01',
      '2026-12-31',
    );
    expect(out).toEqual(['2026-03-10']);
  });

  it('a cada 2 anos', () => {
    const out = expandRecurrence(
      { due_date: '2026-03-10', recurrence: rec({ frequency: 'yearly', interval: 2 }) },
      '2026-01-01',
      '2030-12-31',
    );
    expect(out).toEqual(['2026-03-10', '2028-03-10', '2030-03-10']);
  });

  it('29/02 só aparece em anos bissextos', () => {
    const out = expandRecurrence(
      { due_date: '2024-02-29', recurrence: rec({ frequency: 'yearly', interval: 1 }) },
      '2025-01-01',
      '2028-12-31',
    );
    // 2025,2026,2027 não-bissextos → pulados; 2028 bissexto → ok
    expect(out).toEqual(['2028-02-29']);
  });
});

describe('expandRecurrence — robustez', () => {
  it('interval inválido (0) cai para 1', () => {
    const out = expandRecurrence(
      { due_date: '2026-06-01', recurrence: rec({ frequency: 'daily', interval: 0 }) },
      '2026-06-01',
      '2026-06-03',
    );
    expect(out).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });

  it('rangeStart > rangeEnd retorna vazio', () => {
    expect(
      expandRecurrence(
        { due_date: '2026-06-01', recurrence: rec({ frequency: 'daily' }) },
        '2026-06-30',
        '2026-06-01',
      ),
    ).toEqual([]);
  });

  it('ends_at antes do range retorna vazio', () => {
    expect(
      expandRecurrence(
        {
          due_date: '2026-01-01',
          recurrence: rec({ frequency: 'daily', ends_at: '2026-01-05' }),
        },
        '2026-06-01',
        '2026-06-30',
      ),
    ).toEqual([]);
  });
});

describe('formatDate', () => {
  it('formata componentes locais como YYYY-MM-DD', () => {
    expect(formatDate(new Date(2026, 0, 9))).toBe('2026-01-09');
    expect(formatDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});
