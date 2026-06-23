import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import { Radius } from '../../constants/spacing';
import { progressColor } from '../../utils/progress-color';

interface ProgressBarProps {
  // Progresso 0..1 (já calculado pelo backend).
  value: number;
  // Cor da barra. Se omitida, usa o limiar de progresso (success/warning/danger).
  color?: string;
  height?: number;
  trackColor?: string;
  style?: ViewStyle;
}

export function ProgressBar({ value, color, height = 8, trackColor, style }: ProgressBarProps) {
  const { theme } = useTheme();
  const clamped = Math.max(0, Math.min(1, value || 0));
  const barColor = color ?? progressColor(clamped);

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: Radius.full,
          backgroundColor: trackColor ?? theme.colors.border,
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${clamped * 100}%`,
          height: '100%',
          borderRadius: Radius.full,
          backgroundColor: barColor,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    overflow: 'hidden',
  },
});
