import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '../../hooks/use-theme';
import { Text } from './Text';
import { Colors } from '../../constants/colors';
import { FontSize, FontWeight } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/spacing';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  style,
}: ButtonProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
  }

  function handlePressOut() {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }

  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    sm: { height: 36, paddingHorizontal: Spacing[3], borderRadius: Radius.sm },
    md: { height: 44, paddingHorizontal: Spacing[4], borderRadius: Radius.md },
    lg: { height: 52, paddingHorizontal: Spacing[6], borderRadius: Radius.lg },
  };

  const textSizes: Record<ButtonSize, number> = {
    sm: FontSize.sm,
    md: FontSize.base,
    lg: FontSize.md,
  };

  const variantContainerStyles: Record<ButtonVariant, ViewStyle> = {
    primary: {
      backgroundColor: disabled ? theme.colors.border : Colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    ghost: {
      backgroundColor: 'transparent',
    },
    danger: {
      backgroundColor: disabled ? theme.colors.border : Colors.danger,
    },
  };

  const textColors: Record<ButtonVariant, string> = {
    primary: Colors.light.textInverse,
    secondary: theme.colors.text,
    ghost: Colors.primary,
    danger: Colors.light.textInverse,
  };

  const isDisabled = disabled || loading;

  return (
    <AnimatedTouchable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      activeOpacity={1}
      style={[
        styles.base,
        sizeStyles[size],
        variantContainerStyles[variant],
        isDisabled && styles.disabled,
        animatedStyle,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? Colors.primary : Colors.light.textInverse}
        />
      ) : (
        <View style={styles.content}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text
            style={{
              fontSize: textSizes[size],
              fontWeight: FontWeight.semibold,
              color: isDisabled && (variant === 'primary' || variant === 'danger')
                ? theme.colors.textTertiary
                : textColors[variant],
            }}
          >
            {title}
          </Text>
        </View>
      )}
    </AnimatedTouchable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
});
