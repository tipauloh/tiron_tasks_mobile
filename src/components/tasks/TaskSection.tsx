import React, { useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/use-theme';
import { Text } from '../ui/Text';
import { TaskItem } from './TaskItem';
import { Task } from '../../domain/entities';
import { Spacing } from '../../constants/spacing';
import { FontSize } from '../../constants/typography';

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  onToggle: (id: string) => void;
  onPress: (task: Task) => void;
  onFavorite: (id: string) => void;
  collapsible?: boolean;
}

export function TaskSection({
  title,
  tasks,
  onToggle,
  onPress,
  onFavorite,
  collapsible = false,
}: TaskSectionProps) {
  const { theme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);

  const chevronRotation = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const contentHeight = useSharedValue<'auto' | number>('auto');

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  function handleToggleCollapse() {
    if (!collapsible) return;
    const next = !collapsed;
    setCollapsed(next);
    chevronRotation.value = withSpring(next ? -90 : 0, { damping: 15, stiffness: 200 });
    contentOpacity.value = withTiming(next ? 0 : 1, { duration: 200 });
  }

  if (tasks.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Section header */}
      <TouchableOpacity
        onPress={handleToggleCollapse}
        disabled={!collapsible}
        activeOpacity={collapsible ? 0.7 : 1}
        style={[styles.header, { borderBottomColor: theme.colors.border }]}
      >
        <Text
          variant="label"
          weight="semibold"
          secondary
          style={styles.headerTitle}
        >
          {title.toUpperCase()}
        </Text>

        <View style={styles.headerRight}>
          <Text variant="caption" tertiary>
            {tasks.length}
          </Text>
          {collapsible && (
            <Animated.Text
              style={[
                styles.chevron,
                { color: theme.colors.textTertiary },
                chevronStyle,
              ]}
            >
              ▾
            </Animated.Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Section content */}
      {!collapsed && (
        <Animated.View style={contentStyle}>
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={onToggle}
              onPress={onPress}
              onFavorite={onFavorite}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    letterSpacing: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  chevron: {
    fontSize: FontSize.md,
    lineHeight: FontSize.md,
  },
});
