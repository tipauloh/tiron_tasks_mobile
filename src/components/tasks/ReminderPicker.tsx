import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { useTheme } from '@/hooks/use-theme';
import { CalendarPicker } from '@/components/tasks/CalendarPicker';
import { AppIcon } from '@/components/ui/AppIcon';
import { maskTime, isValidTime } from '@/utils/time';

export type ReminderOptionKey =
  | 'none'
  | 'at_time'
  | 'm5'
  | 'm10'
  | 'm15'
  | 'm30'
  | 'h1'
  | 'custom';

export const REMINDER_OFFSETS: Partial<Record<ReminderOptionKey, number>> = {
  at_time: 0,
  m5: 5,
  m10: 10,
  m15: 15,
  m30: 30,
  h1: 60,
};

const OPTIONS: Array<{ key: ReminderOptionKey; label: string }> = [
  { key: 'none', label: 'Nenhum' },
  { key: 'at_time', label: 'Na hora' },
  { key: 'm5', label: '5 min antes' },
  { key: 'm10', label: '10 min antes' },
  { key: 'm15', label: '15 min antes' },
  { key: 'm30', label: '30 min antes' },
  { key: 'h1', label: '1 hora antes' },
  { key: 'custom', label: 'Personalizado' },
];

/** Formata Date local -> 'YYYY-MM-DDTHH:MM:SS'. */
export function toLocalIso(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

/**
 * Calcula o `remind_at` (Date) a partir de uma opção relativa.
 * baseDueDate: 'YYYY-MM-DD' (ou null). baseTime: 'HH:MM' (ou '' → usa 09:00).
 * Retorna null se não houver data base (opções relativas exigem data).
 */
export function computeRelativeRemindAt(
  key: ReminderOptionKey,
  baseDueDate: string | null,
  baseTime: string,
): Date | null {
  const offset = REMINDER_OFFSETS[key];
  if (offset == null || !baseDueDate) return null;
  const [y, mo, d] = baseDueDate.split('-').map((n) => parseInt(n, 10));
  const time = isValidTime(baseTime) && baseTime ? baseTime : '09:00';
  const [h, mi] = time.split(':').map((n) => parseInt(n, 10));
  const base = new Date(y, mo - 1, d, h, mi, 0);
  return new Date(base.getTime() - offset * 60_000);
}

interface Props {
  selected: ReminderOptionKey;
  customDate: Date | null;
  customTime: string; // 'HH:MM'
  onChange: (key: ReminderOptionKey, customDate: Date | null, customTime: string) => void;
  /** Data base da tarefa ('YYYY-MM-DD') para as opções relativas. */
  baseDueDate: string | null;
  /** Hora base da tarefa ('HH:MM'). */
  baseTime: string;
}

/**
 * Seletor de lembrete: chips com opções rápidas + modo personalizado (calendário + HH:MM).
 * Não persiste nada — apenas reporta a seleção via onChange. A tela decide quando
 * computar o remind_at (ver computeRelativeRemindAt / customDate+customTime).
 */
export function ReminderPicker({
  selected,
  customDate,
  customTime,
  onChange,
  baseDueDate,
  baseTime,
}: Props) {
  const { theme } = useTheme();
  const [showCalendar, setShowCalendar] = useState(false);

  const needsDate = selected !== 'none' && selected !== 'custom' && !baseDueDate;
  const customTimeInvalid = selected === 'custom' && (!customTime || !isValidTime(customTime));

  return (
    <View style={{ gap: Spacing[2] }}>
      <View style={styles.grid}>
        {OPTIONS.map((opt) => {
          const isActive = selected === opt.key;
          return (
            <TouchableOpacity
              key={opt.key}
              onPress={() => onChange(opt.key, customDate, customTime)}
              style={[
                styles.chip,
                {
                  backgroundColor: isActive ? Colors.primary : theme.colors.surface,
                  borderColor: isActive ? Colors.primary : theme.colors.border,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                variant="caption"
                weight={isActive ? 'semibold' : 'regular'}
                style={{ color: isActive ? '#fff' : theme.colors.textSecondary }}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {needsDate && (
        <Text variant="caption" style={{ color: Colors.danger }}>
          Defina a data de entrega da tarefa para usar lembretes relativos.
        </Text>
      )}

      {selected === 'custom' && (
        <View style={styles.customBox}>
          <TouchableOpacity
            style={[
              styles.dateRow,
              { backgroundColor: theme.colors.surface, borderColor: customDate ? Colors.primary : theme.colors.border },
            ]}
            onPress={() => setShowCalendar(true)}
            activeOpacity={0.7}
          >
            <AppIcon name="calendar" size={16} color={customDate ? theme.colors.text : theme.colors.textTertiary} />
            <Text variant="body" style={{ flex: 1, color: customDate ? theme.colors.text : theme.colors.textTertiary }}>
              {customDate
                ? customDate.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })
                : 'Escolher data'}
            </Text>
          </TouchableOpacity>

          <View style={styles.timeField}>
            <Text variant="caption" secondary>Hora</Text>
            <TextInput
              value={customTime}
              onChangeText={(t) => onChange('custom', customDate, maskTime(t))}
              placeholder="HH:MM"
              placeholderTextColor={theme.colors.textTertiary}
              keyboardType="number-pad"
              maxLength={5}
              style={[
                styles.timeInput,
                {
                  color: theme.colors.text,
                  backgroundColor: theme.colors.surface,
                  borderColor: customTimeInvalid ? Colors.danger : customTime ? Colors.primary : theme.colors.border,
                },
              ]}
            />
          </View>
        </View>
      )}

      {customTimeInvalid && (
        <Text variant="caption" style={{ color: Colors.danger }}>
          Informe a hora no formato HH:MM.
        </Text>
      )}

      <CalendarPicker
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
        selectedDate={customDate}
        onSelect={(d) => {
          onChange('custom', d, customTime);
          setShowCalendar(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  chip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  customBox: { flexDirection: 'row', gap: Spacing[2], alignItems: 'flex-end' },
  dateRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: 1.5,
  },
  timeField: { gap: 2, width: 100 },
  timeInput: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2.5],
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
