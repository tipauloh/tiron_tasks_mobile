import React, { useEffect } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/use-theme';
import { Checkbox } from '../ui/Checkbox';
import { Text } from '../ui/Text';
import { AppIcon } from '../ui/AppIcon';
import { Task } from '../../domain/entities';
import { PriorityBadge } from './PriorityBadge';
import { DueDateLabel } from './DueDateLabel';
import { Spacing } from '../../constants/spacing';
import { Colors } from '../../constants/colors';

interface TaskItemProps {
  task: Task;
  onToggle: (id: string) => void;
  onPress: (task: Task) => void;
  onFavorite: (id: string) => void;
  /** Long-press na linha — usado para entrar no modo de seleção múltipla. */
  onLongPress?: (id: string) => void;
  /** Quando true, esconde o separador inferior (use no último item da lista). */
  isLast?: boolean;
}

export function TaskItem({ task, onToggle, onPress, onFavorite, onLongPress, isLast = false }: TaskItemProps) {
  const { theme } = useTheme();
  const isCompleted = task.status === 'completed';

  const opacity = useSharedValue(isCompleted ? 0.55 : 1);
  const scale = useSharedValue(isCompleted ? 0.98 : 1);

  useEffect(() => {
    opacity.value = withTiming(isCompleted ? 0.55 : 1, { duration: 300 });
    scale.value = withSpring(isCompleted ? 0.98 : 1, { damping: 15, stiffness: 200 });
  }, [isCompleted, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        style={[
          styles.row,
          {
            borderBottomColor: theme.colors.border,
            borderBottomWidth: isLast ? 0 : 1,
          },
        ]}
        onPress={() => onPress(task)}
        onLongPress={onLongPress ? () => onLongPress(task.id) : undefined}
        delayLongPress={350}
        activeOpacity={0.7}
      >
        {/* Left: Checkbox */}
        <View style={styles.checkboxWrapper}>
          <Checkbox
            checked={isCompleted}
            onToggle={() => onToggle(task.id)}
            priority={task.priority}
          />
        </View>

        {/* Center: Task info */}
        <View style={styles.center}>
          <View style={styles.titleRow}>
            {task.isEmailLinked && (
              <AppIcon name="flag" size={13} color={theme.colors.textSecondary} />
            )}
            <Text
              variant="body"
              weight="medium"
              style={[
                styles.title,
                isCompleted && styles.titleCompleted,
                isCompleted && { color: theme.colors.textTertiary },
              ]}
              numberOfLines={2}
            >
              {task.title}
            </Text>
          </View>

          <View style={styles.meta}>
            {task.dueDate && <DueDateLabel dueDate={task.dueDate} />}
            {task.startTime && (
              <View style={styles.metaItem}>
                <AppIcon name="clock" size={12} color={theme.colors.textSecondary} />
                <Text variant="caption" style={[styles.timeLabel, { color: theme.colors.textSecondary }]}>
                  {task.startTime}{task.endTime ? `–${task.endTime}` : ''}
                </Text>
              </View>
            )}
            {task.isRecurring && (
              <AppIcon name="repeat" size={12} color={theme.colors.textSecondary} />
            )}
            <PriorityBadge priority={task.priority} size="sm" />
          </View>
        </View>

        {/* Right: botão "Em Foco" (favoritar) — estrela, igual à lista Em Foco */}
        <TouchableOpacity
          onPress={() => onFavorite(task.id)}
          hitSlop={8}
          style={[styles.favoriteButton, { opacity: task.isFavorite ? 1 : 0.3 }]}
          accessibilityLabel={task.isFavorite ? 'Remover do Em Foco' : 'Adicionar ao Em Foco'}
        >
          <AppIcon name="star" size={20} color={task.isFavorite ? Colors.warning : theme.colors.textSecondary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    // Animated.View wrapper
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  checkboxWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    gap: Spacing[1],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    flex: 1,
    lineHeight: 20,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timeLabel: {
    fontSize: 12,
  },
  favoriteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
});
