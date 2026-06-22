import React, { useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { useTheme } from '@/hooks/use-theme';
import { CalendarPicker } from '@/components/tasks/CalendarPicker';
import type { ApiRecurrence, RecurrenceFrequency } from '@/infrastructure/api/types';

type FreqOption = 'none' | RecurrenceFrequency;

const FREQ_OPTIONS: Array<{ value: FreqOption; label: string }> = [
  { value: 'none', label: 'Nunca' },
  { value: 'daily', label: 'Diária' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'yearly', label: 'Anual' },
];

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']; // 0=Dom .. 6=Sáb

const UNIT_LABEL: Record<RecurrenceFrequency, [string, string]> = {
  daily: ['dia', 'dias'],
  weekly: ['semana', 'semanas'],
  monthly: ['mês', 'meses'],
  yearly: ['ano', 'anos'],
};

interface Props {
  value: ApiRecurrence | null;
  onChange: (value: ApiRecurrence | null) => void;
}

function parseDateStr(s: string): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map((n) => parseInt(n, 10));
  return new Date(y, m - 1, d);
}

function formatDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Seção "Repetir" — monta um ApiRecurrence (ou null = Nunca). JS-only.
 * Reutiliza o CalendarPicker existente para o campo "até" (ends_at).
 */
export function RecurrencePicker({ value, onChange }: Props) {
  const { theme } = useTheme();
  const [showEndsCalendar, setShowEndsCalendar] = useState(false);

  const freq: FreqOption = value?.frequency ?? 'none';
  const interval = value?.interval ?? 1;
  const byWeekday = value?.by_weekday ?? [];
  const endsAt = value?.ends_at ?? null;

  function selectFreq(next: FreqOption) {
    if (next === 'none') {
      onChange(null);
      return;
    }
    onChange({
      frequency: next,
      interval: value?.interval && value.interval > 0 ? value.interval : 1,
      by_weekday: next === 'weekly' ? (value?.by_weekday ?? []) : null,
      ends_at: value?.ends_at ?? null,
    });
  }

  function patch(p: Partial<ApiRecurrence>) {
    if (!value) return;
    onChange({ ...value, ...p });
  }

  function toggleWeekday(day: number) {
    if (!value) return;
    const set = new Set(value.by_weekday ?? []);
    if (set.has(day)) set.delete(day);
    else set.add(day);
    patch({ by_weekday: [...set].sort((a, b) => a - b) });
  }

  function setIntervalText(text: string) {
    const n = parseInt(text.replace(/\D/g, ''), 10);
    patch({ interval: Number.isFinite(n) && n > 0 ? n : 1 });
  }

  const unit = value ? UNIT_LABEL[value.frequency] : UNIT_LABEL.daily;

  return (
    <View style={{ gap: Spacing[2] }}>
      {/* Frequência */}
      <View style={styles.freqRow}>
        {FREQ_OPTIONS.map((opt) => {
          const active = freq === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => selectFreq(opt.value)}
              style={[
                styles.freqChip,
                {
                  backgroundColor: active ? Colors.primary : theme.colors.surface,
                  borderColor: active ? Colors.primary : theme.colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                variant="caption"
                weight={active ? 'semibold' : 'regular'}
                style={{ color: active ? '#fff' : theme.colors.textSecondary }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {value && (
        <>
          {/* Intervalo "a cada N" */}
          <View style={styles.intervalRow}>
            <Text variant="body" secondary>
              A cada
            </Text>
            <TextInput
              value={String(interval)}
              onChangeText={setIntervalText}
              keyboardType="number-pad"
              maxLength={3}
              style={[
                styles.intervalInput,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
              accessibilityLabel="Intervalo da recorrência"
            />
            <Text variant="body" secondary>
              {interval === 1 ? unit[0] : unit[1]}
            </Text>
          </View>

          {/* Dias da semana (apenas semanal) */}
          {value.frequency === 'weekly' && (
            <View style={styles.weekdayRow}>
              {WEEKDAYS.map((label, day) => {
                const active = byWeekday.includes(day);
                return (
                  <TouchableOpacity
                    key={day}
                    onPress={() => toggleWeekday(day)}
                    style={[
                      styles.weekdayChip,
                      {
                        backgroundColor: active ? Colors.primary : theme.colors.surface,
                        borderColor: active ? Colors.primary : theme.colors.border,
                      },
                    ]}
                    activeOpacity={0.7}
                    accessibilityLabel={`Dia da semana ${day}`}
                  >
                    <Text
                      variant="caption"
                      weight={active ? 'semibold' : 'regular'}
                      style={{ color: active ? '#fff' : theme.colors.textSecondary }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Termina em (ends_at) */}
          <TouchableOpacity
            style={[
              styles.endsRow,
              {
                backgroundColor: theme.colors.surface,
                borderColor: endsAt ? Colors.primary : theme.colors.border,
                borderWidth: endsAt ? 1.5 : StyleSheet.hairlineWidth,
              },
            ]}
            onPress={() => setShowEndsCalendar(true)}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 15 }}>🏁</Text>
            <Text
              variant="body"
              style={{ flex: 1, color: endsAt ? theme.colors.text : theme.colors.textTertiary }}
            >
              {endsAt
                ? `Até ${parseDateStr(endsAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}`
                : 'Sem data de término'}
            </Text>
            {endsAt && (
              <TouchableOpacity
                onPress={() => patch({ ends_at: null })}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ color: Colors.danger, fontSize: 13 }}>Remover</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          <CalendarPicker
            visible={showEndsCalendar}
            onClose={() => setShowEndsCalendar(false)}
            selectedDate={endsAt ? parseDateStr(endsAt) : null}
            onSelect={(d) => {
              patch({ ends_at: formatDateStr(d) });
              setShowEndsCalendar(false);
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  freqChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], marginTop: Spacing[1] },
  intervalInput: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    fontSize: 16,
    minWidth: 56,
    textAlign: 'center',
  },
  weekdayRow: { flexDirection: 'row', gap: Spacing[1.5], marginTop: Spacing[1] },
  weekdayChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  endsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[3],
    borderRadius: Radius.md,
    marginTop: Spacing[1],
  },
});
