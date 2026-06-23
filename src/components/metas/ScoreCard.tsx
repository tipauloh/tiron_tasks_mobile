import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { TrendIndicator } from './TrendIndicator';
import { Spacing } from '@/constants/spacing';
import { formatProgressPercent } from '@/utils/kpi-format';
import { progressColor } from '@/utils/progress-color';
import type { GoalTrend } from '@/domain/entities';

interface ScoreCardProps {
  score: number; // 0..1
  statusLabel: string;
  trend: GoalTrend;
}

// Cartão-resumo do painel: % grande em anel + rótulo de status + tendência.
// Pensado para ser entendido em <5s.
export function ScoreCard({ score, statusLabel, trend }: ScoreCardProps) {
  const color = progressColor(score);
  return (
    <Card padding={5} style={styles.card}>
      <CircularProgress value={score} size={132} stroke={12} color={color}>
        <Text variant="display" weight="bold" style={{ color }}>
          {formatProgressPercent(score)}
        </Text>
        <Text variant="label" tertiary>SCORE</Text>
      </CircularProgress>

      <View style={styles.info}>
        <Text variant="headline" weight="bold" style={styles.statusLabel}>
          {statusLabel}
        </Text>
        <TrendIndicator trend={trend} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: Spacing[4] },
  info: { alignItems: 'center', gap: Spacing[2] },
  statusLabel: { textAlign: 'center' },
});
