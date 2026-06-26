import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { Colors } from '../../constants/colors';
import { TaskPriority } from '../../domain/entities';
import { AppIcon } from './AppIcon';

interface CheckboxProps {
  checked: boolean;
  onToggle: () => void;
  priority?: TaskPriority;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: Colors.priorityLow,
  normal: Colors.priorityNormal,
  high: Colors.priorityHigh,
  critical: Colors.priorityCritical,
};

const CHECKBOX_SIZE = 24;

export function Checkbox({ checked, onToggle, priority = 'normal' }: CheckboxProps) {
  const progress = useSharedValue(checked ? 1 : 0);
  const scale = useSharedValue(1);

  const borderColor = PRIORITY_COLORS[priority];
  const fillColor = PRIORITY_COLORS[priority];

  React.useEffect(() => {
    progress.value = withTiming(checked ? 1 : 0, { duration: 200 });
  }, [checked, progress]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', fillColor]
    ),
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [borderColor, fillColor]
    ),
    transform: [{ scale: scale.value }],
  }));

  const checkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }));

  function handlePress() {
    scale.value = withSpring(0.85, { damping: 10, stiffness: 400 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 300 });
    });
    onToggle();
  }

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8} hitSlop={8}>
      <Animated.View style={[styles.checkbox, containerAnimatedStyle]}>
        <Animated.View style={checkAnimatedStyle}>
          <AppIcon name="check" size={14} color="#FFFFFF" />
        </Animated.View>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: CHECKBOX_SIZE,
    height: CHECKBOX_SIZE,
    borderRadius: CHECKBOX_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
});
