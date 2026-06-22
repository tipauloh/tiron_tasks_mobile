import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  cancelAnimation,
  type SharedValue,
} from 'react-native-reanimated';

/**
 * DECISÃO DE BIBLIOTECA
 * ─────────────────────
 * Avaliei `react-native-draggable-flatlist` (última versão real 4.0.x). Ela depende
 * da API do reanimated 2 e do gesture-handler v1 e NÃO é compatível com o stack atual
 * (reanimated 4 + RN 0.85 + worklets em `react-native-worklets`, nova arquitetura).
 * Está praticamente sem manutenção. Adicioná-la exigiria build nativa para uma lib
 * quebrada — risco sem ganho. Por isso mantive e PROFISSIONALIZEI a implementação
 * manual sobre gesture-handler + reanimated (ambos já instalados, zero dependência
 * nativa nova).
 *
 * O QUE MUDOU
 * ───────────
 * - Arraste SEMPRE disponível: long-press (220ms) em qualquer linha ativa o arraste,
 *   sem botão/modo "Reordenar".
 * - Item flutuante: ao ativar, a linha cresce levemente (scale) e ganha sombra/zIndex.
 * - Reordenação suave: as demais linhas deslizam (spring) para o lugar em tempo real.
 * - Auto-scroll: quando o item arrastado se aproxima do topo/base da área visível,
 *   chama `onAutoScroll(dir)` para o pai rolar a FlatList; `onAutoScroll(0)` para.
 */

interface Props<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  /** Altura fixa de cada linha (necessária para o cálculo do destino). */
  itemHeight: number;
  renderItem: (item: T, isActive: boolean) => React.ReactNode;
  /** Recebe os itens na nova ordem após soltar. */
  onReorder: (items: T[]) => void;
  /**
   * Offset (Y absoluto na tela) do topo desta lista, usado para auto-scroll.
   * Sem ele o auto-scroll fica desligado.
   */
  containerTopY?: SharedValue<number>;
  /** Altura da janela de scroll (viewport). Necessária para auto-scroll. */
  viewportHeight?: number;
  /** Direção do auto-scroll: -1 (sobe), 1 (desce), 0 (parar). */
  onAutoScroll?: (direction: -1 | 0 | 1) => void;
}

const SPRING = { damping: 22, stiffness: 280, mass: 0.7 };
// Distância das bordas (px) que dispara o auto-scroll.
const EDGE_THRESHOLD = 90;

function clamp(v: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(v, min), max);
}

interface RowProps<T> {
  item: T;
  itemHeight: number;
  count: number;
  positions: SharedValue<Record<string, number>>;
  itemKey: string;
  renderItem: Props<T>['renderItem'];
  onReorder: () => void;
  // Auto-scroll
  containerTopY?: SharedValue<number>;
  viewportHeight?: number;
  onAutoScroll?: (direction: -1 | 0 | 1) => void;
}

function Row<T>({
  item,
  itemHeight,
  count,
  positions,
  itemKey,
  renderItem,
  onReorder,
  containerTopY,
  viewportHeight,
  onAutoScroll,
}: RowProps<T>) {
  // isActive vive como shared value (worklet) e espelhado em estado p/ o render.
  const [isActive, setIsActive] = React.useState(false);
  const setActiveJS = useCallback((v: boolean) => setIsActive(v), []);

  const top = useSharedValue(positions.value[itemKey] * itemHeight);
  const isDragging = useSharedValue(false);
  const scale = useSharedValue(1);
  const shadow = useSharedValue(0);

  const autoScrollJS = useCallback(
    (dir: -1 | 0 | 1) => onAutoScroll?.(dir),
    [onAutoScroll],
  );

  const animatedStyle = useAnimatedStyle(() => {
    // Quando NÃO está sendo arrastada, segue suavemente a posição alvo.
    if (!isDragging.value) {
      const target = positions.value[itemKey] * itemHeight;
      top.value = withSpring(target, SPRING);
    }
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: top.value,
      zIndex: isDragging.value ? 999 : 0,
      transform: [{ scale: scale.value }],
      shadowColor: '#000',
      shadowOpacity: 0.18 * shadow.value,
      shadowRadius: 12 * shadow.value,
      shadowOffset: { width: 0, height: 6 * shadow.value },
      elevation: isDragging.value ? 8 : 0,
    };
  });

  const maybeAutoScroll = (absoluteY: number) => {
    'worklet';
    if (!onAutoScroll || !containerTopY || !viewportHeight) return;
    const yInViewport = absoluteY - containerTopY.value;
    if (yInViewport < EDGE_THRESHOLD) {
      runOnJS(autoScrollJS)(-1);
    } else if (yInViewport > viewportHeight - EDGE_THRESHOLD) {
      runOnJS(autoScrollJS)(1);
    } else {
      runOnJS(autoScrollJS)(0);
    }
  };

  const pan = Gesture.Pan()
    .activateAfterLongPress(220)
    .onStart(() => {
      cancelAnimation(top);
      isDragging.value = true;
      top.value = positions.value[itemKey] * itemHeight;
      scale.value = withSpring(1.04, SPRING);
      shadow.value = withTiming(1, { duration: 140 });
      runOnJS(setActiveJS)(true);
    })
    .onUpdate((e) => {
      const startTop = positions.value[itemKey] * itemHeight;
      top.value = startTop + e.translationY;

      // Índice de destino com base no centro da linha arrastada.
      const newIndex = clamp(Math.round(top.value / itemHeight), 0, count - 1);
      const curIndex = positions.value[itemKey];
      if (newIndex !== curIndex) {
        const next = { ...positions.value };
        for (const k in next) {
          if (next[k] === newIndex) next[k] = curIndex;
        }
        next[itemKey] = newIndex;
        positions.value = next;
      }

      maybeAutoScroll(e.absoluteY);
    })
    .onEnd(() => {
      const finalIndex = positions.value[itemKey];
      top.value = withSpring(finalIndex * itemHeight, SPRING);
      scale.value = withSpring(1, SPRING);
      shadow.value = withTiming(0, { duration: 160 });
      isDragging.value = false;
      runOnJS(setActiveJS)(false);
      runOnJS(autoScrollJS)(0);
      runOnJS(onReorder)();
    })
    .onFinalize(() => {
      // Garante que o auto-scroll pare mesmo se o gesto for cancelado.
      isDragging.value = false;
      scale.value = withSpring(1, SPRING);
      shadow.value = withTiming(0, { duration: 160 });
      runOnJS(setActiveJS)(false);
      runOnJS(autoScrollJS)(0);
    });

  return (
    <Animated.View style={[animatedStyle, { height: itemHeight }]}>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>{renderItem(item, isActive)}</View>
      </GestureDetector>
    </Animated.View>
  );
}

export function DraggableTaskList<T>({
  data,
  keyExtractor,
  itemHeight,
  renderItem,
  onReorder,
  containerTopY,
  viewportHeight,
  onAutoScroll,
}: Props<T>) {
  const positions = useSharedValue<Record<string, number>>(
    Object.fromEntries(data.map((it, i) => [keyExtractor(it), i])),
  );

  // Reseta as posições quando os dados mudam (refetch / nova ordem do servidor).
  const dataKey = useMemo(() => data.map(keyExtractor).join('|'), [data, keyExtractor]);
  React.useEffect(() => {
    positions.value = Object.fromEntries(data.map((it, i) => [keyExtractor(it), i]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataKey]);

  const byKey = useMemo(() => {
    const m = new Map<string, T>();
    for (const it of data) m.set(keyExtractor(it), it);
    return m;
  }, [data, keyExtractor]);

  const handleReorder = useCallback(() => {
    const ordered = Object.entries(positions.value)
      .sort((a, b) => a[1] - b[1])
      .map(([k]) => byKey.get(k))
      .filter((x): x is T => x != null);
    onReorder(ordered);
  }, [byKey, onReorder, positions]);

  return (
    <View style={{ height: data.length * itemHeight }}>
      {data.map((item) => {
        const k = keyExtractor(item);
        return (
          <Row
            key={k}
            item={item}
            itemKey={k}
            itemHeight={itemHeight}
            count={data.length}
            positions={positions}
            renderItem={renderItem}
            onReorder={handleReorder}
            containerTopY={containerTopY}
            viewportHeight={viewportHeight}
            onAutoScroll={onAutoScroll}
          />
        );
      })}
    </View>
  );
}
