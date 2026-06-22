import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { useTheme } from '@/hooks/use-theme';
import { maskTime, isValidTime, isEndAfterStart } from '@/utils/time';

interface Props {
  start: string; // 'HH:MM' ou ''
  end: string; // 'HH:MM' ou ''
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
}

/**
 * Seletor JS-only (sem módulo nativo) de horário de início/fim. Dois TextInput com
 * máscara HH:MM. Mostra erro quando o formato é inválido ou fim < início.
 */
export function TimeRangePicker({ start, end, onChangeStart, onChangeEnd }: Props) {
  const { theme } = useTheme();

  const startInvalid = !isValidTime(start);
  const endInvalid = !isValidTime(end);
  const orderInvalid = !startInvalid && !endInvalid && !isEndAfterStart(start, end);

  function fieldBorder(invalid: boolean, filled: boolean) {
    if (invalid) return Colors.danger;
    if (filled) return Colors.primary;
    return theme.colors.border;
  }

  return (
    <View>
      <View style={styles.row}>
        <View style={styles.field}>
          <Text variant="caption" secondary style={styles.fieldLabel}>
            Início
          </Text>
          <TextInput
            value={start}
            onChangeText={(t) => onChangeStart(maskTime(t))}
            placeholder="HH:MM"
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType="number-pad"
            maxLength={5}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: fieldBorder(startInvalid, start.length > 0),
              },
            ]}
            accessibilityLabel="Horário de início"
          />
        </View>

        <Text style={[styles.dash, { color: theme.colors.textTertiary }]}>–</Text>

        <View style={styles.field}>
          <Text variant="caption" secondary style={styles.fieldLabel}>
            Fim
          </Text>
          <TextInput
            value={end}
            onChangeText={(t) => onChangeEnd(maskTime(t))}
            placeholder="HH:MM"
            placeholderTextColor={theme.colors.textTertiary}
            keyboardType="number-pad"
            maxLength={5}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: fieldBorder(endInvalid || orderInvalid, end.length > 0),
              },
            ]}
            accessibilityLabel="Horário de fim"
          />
        </View>

        {(start.length > 0 || end.length > 0) && (
          <TouchableOpacity
            onPress={() => {
              onChangeStart('');
              onChangeEnd('');
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearBtn}
          >
            <Text variant="caption" style={{ color: Colors.danger }}>
              Limpar
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {(startInvalid || endInvalid) && (
        <Text variant="caption" style={[styles.error, { color: Colors.danger }]}>
          Use o formato HH:MM (00:00–23:59).
        </Text>
      )}
      {orderInvalid && (
        <Text variant="caption" style={[styles.error, { color: Colors.danger }]}>
          O fim deve ser igual ou após o início.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: Spacing[2] },
  field: { flex: 1, gap: 2 },
  fieldLabel: { marginLeft: 2 },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2.5],
    fontSize: 16,
    textAlign: 'center',
    letterSpacing: 1,
  },
  dash: { fontSize: 18, paddingBottom: Spacing[2.5] },
  clearBtn: { paddingBottom: Spacing[3] },
  error: { marginTop: Spacing[1] },
});
