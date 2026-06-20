import React, { ReactNode } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import { Radius, Spacing } from '../../constants/spacing';

interface CardProps {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: keyof typeof Spacing;
}

export function Card({ children, style, onPress, padding = 4 }: CardProps) {
  const { theme } = useTheme();

  const cardStyle: ViewStyle[] = [
    styles.card,
    {
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      padding: Spacing[padding],
      ...Platform.select({
        ios: {
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 1,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
      }),
    },
    style,
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        style={cardStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
