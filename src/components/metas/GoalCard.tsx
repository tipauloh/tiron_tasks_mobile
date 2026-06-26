import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { AppIcon } from '@/components/ui/AppIcon';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '@/constants/spacing';
import { Colors } from '@/constants/colors';
import { formatProgressPercent } from '@/utils/kpi-format';
import { progressColor } from '@/utils/progress-color';
import { categoryMeta } from './categories';
import type { ApiGoalSummary } from '@/infrastructure/api/goal-types';

interface GoalCardProps {
  goal: ApiGoalSummary;
  onPress?: () => void;
  // Variante destacada para a "Meta Principal".
  primary?: boolean;
}

function formatPrazo(endDate: string | null): string {
  if (!endDate) return 'Sem prazo';
  const parts = endDate.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  if (isNaN(d.getTime())) return 'Sem prazo';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function GoalCard({ goal, onPress, primary }: GoalCardProps) {
  const { theme } = useTheme();
  const color = progressColor(goal.progress);
  const cat = categoryMeta(goal.category);

  return (
    <Card
      onPress={onPress}
      padding={4}
      style={primary ? { borderColor: Colors.primary, borderWidth: 1.5 } : undefined}
    >
      <View style={styles.head}>
        <Text style={styles.emoji}>{cat.emoji}</Text>
        <View style={styles.titleBlock}>
          <Text variant="callout" weight="semibold" numberOfLines={2}>
            {goal.title}
          </Text>
          <Text variant="caption" tertiary numberOfLines={1}>
            {goal.category} · {formatPrazo(goal.end_date)}
          </Text>
        </View>
        <Text variant="headline" weight="bold" style={{ color }}>
          {formatProgressPercent(goal.progress)}
        </Text>
      </View>

      <ProgressBar value={goal.progress} color={color} height={8} style={styles.bar} />

      {primary && (
        <View style={[styles.primaryTag, { backgroundColor: Colors.primary + '18' }]}>
          <AppIcon name="star" size={13} color={Colors.primary} />
          <Text variant="label" weight="semibold" style={{ color: Colors.primary }}>
            META PRINCIPAL
          </Text>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  emoji: { fontSize: 22 },
  titleBlock: { flex: 1, gap: 2 },
  bar: { marginTop: Spacing[3] },
  primaryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
    alignSelf: 'flex-start',
    marginTop: Spacing[3],
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: 6,
  },
});
