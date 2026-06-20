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
}

export function TaskItem({ task, onToggle, onPress, onFavorite }: TaskItemProps) {
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
        style={[styles.row, { borderBottomColor: theme.colors.borderLight }]}
        onPress={() => onPress(task)}
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

          <View style={styles.meta}>
            {task.dueDate && <DueDateLabel dueDate={task.dueDate} />}
            <PriorityBadge priority={task.priority} size="sm" />
          </View>
        </View>

        {/* Right: Favorite button */}
        <TouchableOpacity
          onPress={() => onFavorite(task.id)}
          hitSlop={8}
          style={styles.favoriteButton}
        >
          <Text style={[styles.star, { color: task.isFavorite ? Colors.warning : theme.colors.textTertiary }]}>
            {task.isFavorite ? '★' : '☆'}
          </Text>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
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
  title: {
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
  favoriteButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
  },
  star: {
    fontSize: 20,
  },
});
