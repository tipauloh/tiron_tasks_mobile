import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTheme } from '../../hooks/use-theme';
import { Text } from '../ui/Text';
import { Spacing } from '../../constants/spacing';
import { FontSize } from '../../constants/typography';

// Lógica pura reexportada para conveniência das telas (testada em utils/group-tasks).
export { partitionTasks, buildTaskRows, COMPLETED_HEADER_KEY } from '../../utils/group-tasks';
export type { TaskRow } from '../../utils/group-tasks';

interface CompletedSectionHeaderProps {
  count: number;
  expanded: boolean;
  onToggle: () => void;
}

/** Cabeçalho clicável "Concluídas (N)" com chevron que indica expandido/recolhido. */
export function CompletedSectionHeader({ count, expanded, onToggle }: CompletedSectionHeaderProps) {
  const { theme } = useTheme();

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: withSpring(expanded ? '0deg' : '-90deg', { damping: 15, stiffness: 200 }) }],
  }));

  return (
    <TouchableOpacity
      onPress={onToggle}
      activeOpacity={0.7}
      style={[styles.header, { borderBottomColor: theme.colors.border }]}
      accessibilityRole="button"
      accessibilityLabel={`Concluídas, ${count} ${count === 1 ? 'tarefa' : 'tarefas'}, ${expanded ? 'ocultar' : 'mostrar'}`}
    >
      <Text variant="label" weight="semibold" secondary style={styles.title}>
        CONCLUÍDAS
      </Text>
      <View style={styles.right}>
        <Text variant="caption" tertiary>
          {count}
        </Text>
        <Animated.Text style={[styles.chevron, { color: theme.colors.textTertiary }, chevronStyle]}>
          ▾
        </Animated.Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    marginTop: Spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: {
    letterSpacing: 1,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  chevron: {
    fontSize: FontSize.md,
    lineHeight: FontSize.md,
  },
});
