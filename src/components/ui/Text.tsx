import React from 'react';
import { Text as RNText, TextProps, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import { FontSize, FontWeight } from '../../constants/typography';

interface TironTextProps extends TextProps {
  variant?: 'display' | 'title' | 'headline' | 'body' | 'callout' | 'caption' | 'label';
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  color?: string;
  secondary?: boolean;
  tertiary?: boolean;
}

export function Text({
  variant = 'body',
  weight = 'regular',
  color,
  secondary,
  tertiary,
  style,
  ...props
}: TironTextProps) {
  const { theme } = useTheme();

  const variantStyles = StyleSheet.create({
    display: { fontSize: FontSize['3xl'], fontWeight: FontWeight.bold },
    title: { fontSize: FontSize['2xl'], fontWeight: FontWeight.bold },
    headline: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold },
    body: { fontSize: FontSize.base, fontWeight: FontWeight[weight] },
    callout: { fontSize: FontSize.md, fontWeight: FontWeight[weight] },
    caption: { fontSize: FontSize.sm, fontWeight: FontWeight[weight] },
    label: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, letterSpacing: 0.5 },
  });

  const textColor = color
    ?? (tertiary
      ? theme.colors.textTertiary
      : secondary
      ? theme.colors.textSecondary
      : theme.colors.text);

  return (
    <RNText
      style={[variantStyles[variant], { color: textColor }, style]}
      {...props}
    />
  );
}
