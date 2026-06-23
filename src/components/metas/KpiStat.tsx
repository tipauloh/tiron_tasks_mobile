import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/spacing';
import { formatKpiValue, formatProgressPercent } from '@/utils/kpi-format';
import { progressColor } from '@/utils/progress-color';
import type { ApiKeyResultSummary } from '@/infrastructure/api/goal-types';

interface KpiStatProps {
  kr: ApiKeyResultSummary;
  onPress?: () => void;
}

// Estatística compacta de um KPI em destaque no painel: rótulo + valor atual
// formatado pelo tipo. Mostra a meta-pai quando o backend a anexa.
export function KpiStat({ kr, onPress }: KpiStatProps) {
  const { theme } = useTheme();
  const color = progressColor(kr.progress);
  const Wrapper: React.ElementType = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.75}
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
    >
      <Text variant="caption" secondary numberOfLines={1}>
        {kr.title}
      </Text>
      <Text variant="headline" weight="bold" style={{ color }}>
        {formatKpiValue(kr.current_value, kr.kpi_type, kr.unit)}
      </Text>
      <View style={styles.metaRow}>
        <Text variant="label" tertiary numberOfLines={1} style={styles.parent}>
          {kr.goal_title ?? `de ${formatKpiValue(kr.target_value, kr.kpi_type, kr.unit)}`}
        </Text>
        <Text variant="label" weight="semibold" style={{ color }}>
          {formatProgressPercent(kr.progress)}
        </Text>
      </View>
      <ProgressBar value={kr.progress} color={color} height={5} />
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing[3],
    gap: Spacing[1],
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing[2] },
  parent: { flex: 1 },
});
