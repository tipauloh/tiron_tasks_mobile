import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import type { KpiType } from '@/domain/entities';

export const KPI_TYPES: Array<{ value: KpiType; emoji: string; label: string; hint: string }> = [
  { value: 'number', emoji: '🔢', label: 'Número', hint: 'ex.: 42' },
  { value: 'percent', emoji: '％', label: 'Percentual', hint: 'ex.: 80%' },
  { value: 'currency', emoji: '💰', label: 'Moeda', hint: 'ex.: R$ 1.500' },
  { value: 'quantity', emoji: '📦', label: 'Quantidade', hint: 'ex.: 12 itens' },
  { value: 'time', emoji: '⏱️', label: 'Tempo', hint: 'ex.: 10h' },
  { value: 'weight', emoji: '⚖️', label: 'Peso', hint: 'ex.: 75 kg' },
  { value: 'custom', emoji: '✏️', label: 'Personalizado', hint: 'com unidade' },
];

export function kpiTypeMeta(type: KpiType) {
  return KPI_TYPES.find((t) => t.value === type) ?? KPI_TYPES[0];
}

interface KpiTypePickerProps {
  visible: boolean;
  onClose: () => void;
  selected: KpiType | null;
  onSelect: (type: KpiType) => void;
}

export function KpiTypePicker({ visible, onClose, selected, onSelect }: KpiTypePickerProps) {
  const { theme } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Tipo de KPI">
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {KPI_TYPES.map((t) => {
          const isActive = selected === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              style={[styles.option, { borderBottomColor: theme.colors.borderLight }]}
              onPress={() => { onSelect(t.value); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={styles.emoji}>{t.emoji}</Text>
              <Text variant="body" weight={isActive ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                {t.label}
              </Text>
              <Text variant="caption" tertiary>{t.hint}</Text>
              {isActive && <Text style={{ color: Colors.primary, fontSize: 16, marginLeft: Spacing[2] }}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  emoji: { fontSize: 20, width: 28, textAlign: 'center' },
});
