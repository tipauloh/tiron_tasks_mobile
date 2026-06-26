import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { AppIcon, type AppIconName } from '@/components/ui/AppIcon';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import type { GoalTrend } from '@/domain/entities';

const TREND_META: Record<GoalTrend, { icon: AppIconName; label: string; color: string }> = {
  up: { icon: 'trendUp', label: 'Melhorando', color: Colors.success },
  stable: { icon: 'trendStable', label: 'Estável', color: Colors.warning },
  down: { icon: 'trendDown', label: 'Atenção', color: Colors.danger },
};

export function TrendIndicator({ trend, size = 'md' }: { trend: GoalTrend; size?: 'sm' | 'md' }) {
  const meta = TREND_META[trend] ?? TREND_META.stable;
  const fontSize = size === 'sm' ? 12 : 14;
  return (
    <View style={styles.row}>
      <AppIcon name={meta.icon} size={fontSize + 2} color={meta.color} />
      <Text variant="caption" weight="semibold" style={{ color: meta.color, fontSize }}>
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
});
