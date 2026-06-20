import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from './Text';
import { Radius, Spacing } from '../../constants/spacing';
import { FontSize, FontWeight } from '../../constants/typography';

type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  label: string;
  color: string;
  textColor?: string;
  size?: BadgeSize;
  style?: ViewStyle;
}

export function Badge({ label, color, textColor = '#FFFFFF', size = 'md', style }: BadgeProps) {
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: color,
          paddingHorizontal: isSmall ? Spacing[1.5] : Spacing[2],
          paddingVertical: isSmall ? 2 : 4,
          borderRadius: Radius.full,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: isSmall ? FontSize.xs : FontSize.sm,
          fontWeight: FontWeight.semibold,
          color: textColor,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
