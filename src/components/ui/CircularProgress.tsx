import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import { progressColor } from '../../utils/progress-color';

interface CircularProgressProps {
  // Progresso 0..1 (calculado pelo backend).
  value: number;
  size?: number;
  stroke?: number;
  // Cor do arco. Se omitida, usa o limiar de progresso (success/warning/danger).
  color?: string;
  trackColor?: string;
  // Conteúdo central (ex.: rótulo de %).
  children?: ReactNode;
  style?: ViewStyle;
}

// Meia-volta do anel: um wrapper que recorta metade do círculo (overflow hidden)
// contendo um disco com a borda colorida em metade. O disco gira em torno do
// CENTRO do círculo (o wrapper tem largura = raio e o disco width = diâmetro
// ancorado na borda interna do wrapper), preenchendo de 0 a 180°.
function HalfArc({
  side,
  rotate,
  size,
  stroke,
  color,
  visible,
}: {
  side: 'left' | 'right';
  rotate: number;
  size: number;
  stroke: number;
  color: string;
  visible: boolean;
}) {
  const half = size / 2;
  const isRight = side === 'right';
  return (
    <View
      style={[
        styles.clip,
        { width: half, height: size, left: isRight ? half : 0 },
      ]}
    >
      <View
        style={{
          width: size,
          height: size,
          // Ancorar o disco para que seu centro coincida com o centro do anel.
          left: isRight ? -half : 0,
          borderRadius: half,
          borderWidth: stroke,
          borderColor: 'transparent',
          // A metade direita pinta a borda direita; a esquerda, a esquerda.
          ...(isRight
            ? { borderTopColor: color, borderRightColor: color }
            : { borderBottomColor: color, borderLeftColor: color }),
          opacity: visible ? 1 : 0,
          transform: [{ rotate: `${rotate}deg` }],
        }}
      />
    </View>
  );
}

// Anel de progresso SEM dependências (react-native-svg ausente neste projeto).
export function CircularProgress({
  value,
  size = 120,
  stroke = 10,
  color,
  trackColor,
  children,
  style,
}: CircularProgressProps) {
  const { theme } = useTheme();
  const clamped = Math.max(0, Math.min(1, value || 0));
  const arcColor = color ?? progressColor(clamped);
  const track = trackColor ?? theme.colors.border;

  const deg = clamped * 360;
  // A borda pintada de cada disco cobre o quadrante 0..90 (top+right / bottom+left).
  // Girando o disco direito de -135° (início no topo) avançamos o arco no sentido
  // horário; a metade esquerda assume após 180°.
  const rightRotate = -135 + Math.min(deg, 180);
  const leftRotate = -135 + Math.max(deg - 180, 0);
  const half = size / 2;
  const inner = size - stroke * 2;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {/* Track completo (anel por baixo) */}
      <View
        style={[
          StyleSheet.absoluteFill,
          { borderRadius: half, borderWidth: stroke, borderColor: track },
        ]}
      />

      <HalfArc side="right" rotate={rightRotate} size={size} stroke={stroke} color={arcColor} visible />
      <HalfArc side="left" rotate={leftRotate} size={size} stroke={stroke} color={arcColor} visible={deg > 180} />

      {/* Centro: rótulo (ex.: %) */}
      <View
        style={[
          styles.center,
          { width: inner, height: inner, top: stroke, left: stroke },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { position: 'absolute', top: 0, overflow: 'hidden' },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
