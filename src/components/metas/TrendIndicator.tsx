import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import type { GoalTrend } from '@/domain/entities';

const TREND_META: Record<GoalTrend, { emoji: string; label: string; color: string }> = {
  up: { emoji: '⬆️', label: 'Melhorando', color: Colors.success },
  stable: { emoji: '➡️', label: 'Estável', color: Colors.warning },
  down: { emoji: '⬇️', label: 'Atenção', color: Colors.danger },
};

export function TrendIndicator({ trend, size = 'md' }: { trend: GoalTrend; size?: 'sm' | 'md' }) {
  const meta = TREND_META[trend] ?? TREND_META.stable;
  const fontSize = size === 'sm' ? 12 : 14;
  return (
    <View style={styles.row}>
      <Text style={{ fontSize }}>{meta.emoji}</Text>
      <Text variant="caption" weight="semibold" style={{ color: meta.color, fontSize }}>
        {meta.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1] },
});
