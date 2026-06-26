import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import type { KpiType } from '@/domain/entities';

export const KPI_TYPES: Array<{ value: KpiType; icon: AppIconName; label: string; hint: string }> = [
  { value: 'number', icon: 'kpiNumber', label: 'Número', hint: 'ex.: 42' },
  { value: 'percent', icon: 'kpiPercent', label: 'Percentual', hint: 'ex.: 80%' },
  { value: 'currency', icon: 'kpiCurrency', label: 'Moeda', hint: 'ex.: R$ 1.500' },
  { value: 'quantity', icon: 'kpiQuantity', label: 'Quantidade', hint: 'ex.: 12 itens' },
  { value: 'time', icon: 'kpiTime', label: 'Tempo', hint: 'ex.: 10h' },
  { value: 'weight', icon: 'kpiWeight', label: 'Peso', hint: 'ex.: 75 kg' },
  { value: 'custom', icon: 'kpiCustom', label: 'Personalizado', hint: 'com unidade' },
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
              <View style={styles.emoji}>
                <AppIcon name={t.icon} size={20} color={theme.colors.text} />
              </View>
              <Text variant="body" weight={isActive ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                {t.label}
              </Text>
              <Text variant="caption" tertiary>{t.hint}</Text>
              {isActive && <AppIcon name="check" size={16} color={Colors.primary} />}
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
  emoji: { width: 28, alignItems: 'center' },
});
