import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { useTheme } from '@/hooks/use-theme';
import { useProductivity } from '@/hooks/api/use-tasks';
import { Spacing, Radius } from '@/constants/spacing';
import { Colors } from '@/constants/colors';
import type { ApiProductivityMonthly } from '@/infrastructure/api/types';

const MONTHS_PT = [
  'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
  'jul', 'ago', 'set', 'out', 'nov', 'dez',
];

// 'YYYY-MM' -> 'mmm/aa' pt-BR (ex.: '2026-06' -> 'jun/26').
function formatMonthLabel(month: string): string {
  const [year, mon] = month.split('-');
  const idx = parseInt(mon, 10) - 1;
  const name = MONTHS_PT[idx] ?? mon;
  return `${name}/${year.slice(2)}`;
}

interface KpiItemProps {
  icon: AppIconName;
  value: number;
  label: string;
  onPress?: () => void;
  badge?: React.ReactNode;
}

function KpiItem({ icon, value, label, onPress, badge }: KpiItemProps) {
  const { theme } = useTheme();
  const Wrapper: React.ElementType = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.7}
      style={styles.kpi}
    >
      {badge}
      <AppIcon name={icon} size={16} color={theme.colors.textTertiary} />
      <Text variant="headline" weight="bold">{value}</Text>
      <Text variant="label" tertiary numberOfLines={1}>{label}</Text>
    </Wrapper>
  );
}

// Faixa compacta de KPIs de produtividade (tarefas concluídas) no topo da aba
// Metas: estímulo/acompanhamento sutil. O KPI do mês abre um drill-down com a
// produção mensal dos últimos 12 meses.
export function ProductivityStrip() {
  const { theme } = useTheme();
  const { data } = useProductivity();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Drill-down: mais recente no topo + barra proporcional ao maior count.
  const monthlyDesc = useMemo<ApiProductivityMonthly[]>(
    () => (data ? [...data.monthly].reverse() : []),
    [data],
  );
  const maxCount = useMemo(
    () => monthlyDesc.reduce((m, x) => Math.max(m, x.count), 0),
    [monthlyDesc],
  );

  if (!data) return null;

  return (
    <>
      <View style={styles.header}>
        <Text variant="callout" weight="semibold">Sua produtividade</Text>
        <Text variant="caption" tertiary style={styles.subtitle}>
          Tarefas concluídas — seu ritmo de produção.
        </Text>
      </View>
      <Card padding={3} style={styles.card}>
        <View style={styles.row}>
          <KpiItem icon="done" value={data.today} label="Hoje" />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <KpiItem
            icon="calendar"
            value={data.month}
            label="Mês"
            onPress={() => setSheetOpen(true)}
            badge={
              <View style={[styles.plusBadge, { backgroundColor: Colors.primary }]}>
                <AppIcon name="plus" size={11} color="#FFFFFF" />
              </View>
            }
          />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <KpiItem icon="award" value={data.year} label="Ano" />
          <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          <KpiItem icon="streak" value={data.streak} label="Sequência" />
        </View>
      </Card>

      <BottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        title="Concluídas por mês"
      >
        <View style={styles.sheetList}>
          {monthlyDesc.map((m) => {
            const pct = maxCount > 0 ? Math.max(m.count / maxCount, m.count > 0 ? 0.04 : 0) : 0;
            return (
              <View key={m.month} style={styles.barRow}>
                <Text variant="caption" tertiary style={styles.barLabel}>
                  {formatMonthLabel(m.month)}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: theme.colors.surface }]}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${pct * 100}%`, backgroundColor: Colors.primary },
                    ]}
                  />
                </View>
                <Text variant="caption" weight="semibold" style={styles.barValue}>
                  {m.count}
                </Text>
              </View>
            );
          })}
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing[1], marginBottom: Spacing[2], gap: 2 },
  subtitle: { lineHeight: 16 },
  card: { paddingVertical: Spacing[3] },
  row: { flexDirection: 'row', alignItems: 'center' },
  kpi: { flex: 1, alignItems: 'center', gap: Spacing[0.5] },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', marginVertical: Spacing[1] },
  plusBadge: {
    position: 'absolute',
    top: -6,
    right: 10,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetList: { gap: Spacing[2.5] },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  barLabel: { width: 52 },
  barTrack: { flex: 1, height: 10, borderRadius: Radius.full, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.full },
  barValue: { width: 28, textAlign: 'right' },
});
