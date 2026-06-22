import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  runOnJS,
  withSpring,
} from 'react-native-reanimated';

/**
 * Lista reordenável JS-only — construída diretamente sobre react-native-gesture-handler
 * + react-native-reanimated (ambos já instalados; nenhum módulo nativo novo). Optei por
 * NÃO usar react-native-draggable-flatlist porque ele não está instalado, está sem
 * manutenção e não declara compatibilidade com reanimated 4 / RN 0.85 (worklets agora
 * vivem em react-native-worklets), o que exigiria build nativa.
 *
 * Como funciona: cada item é absolutamente posicionado por um offset animado. Um Pan
 * com long-press ativa o arraste; ao soltar, calcula-se a nova ordem e dispara-se
 * onReorder(novaOrdem). É genérico — funciona para a seção de pendentes.
 */

interface Props<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  /** Altura fixa de cada linha (necessária para o cálculo do destino). */
  itemHeight: number;
  renderItem: (item: T, drag: () => void, isActive: boolean) => React.ReactNode;
  /** Recebe os itens na nova ordem após soltar. */
  onReorder: (items: T[]) => void;
}

function clamp(v: number, min: number, max: number): number {
  'worklet';
  return Math.min(Math.max(v, min), max);
}

interface RowProps<T> {
  item: T;
  index: number;
  itemHeight: number;
  count: number;
  positions: ReturnType<typeof useSharedValue<Record<string, number>>>;
  activeKey: ReturnType<typeof useSharedValue<string | null>>;
  itemKey: string;
  renderItem: Props<T>['renderItem'];
  onReorder: () => void;
}

function Row<T>({
  item,
  itemHeight,
  count,
  positions,
  activeKey,
  itemKey,
  renderItem,
  onReorder,
}: RowProps<T>) {
  const [isActive, setIsActive] = useState(false);

  const top = useSharedValue(positions.value[itemKey] * itemHeight);
  const isDragging = useSharedValue(false);

  // Mantém `top` sincronizado quando outra linha reordena (e esta não está sendo arrastada).
  const animatedStyle = useAnimatedStyle(() => {
    const targetIndex = positions.value[itemKey];
    if (!isDragging.value) {
      top.value = withSpring(targetIndex * itemHeight, { damping: 20, stiffness: 250 });
    }
    return {
      position: 'absolute',
      left: 0,
      right: 0,
      top: top.value,
      zIndex: isDragging.value ? 10 : 0,
      elevation: isDragging.value ? 10 : 0,
    };
  });

  const setActiveJS = useCallback((v: boolean) => setIsActive(v), []);

  const pan = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      isDragging.value = true;
      activeKey.value = itemKey;
      runOnJS(setActiveJS)(true);
    })
    .onUpdate((e) => {
      const startTop = positions.value[itemKey] * itemHeight;
      top.value = startTop + e.translationY;

      // Índice destino com base no centro da linha arrastada.
      const newIndex = clamp(
        Math.round(top.value / itemHeight),
        0,
        count - 1,
      );
      const curIndex = positions.value[itemKey];
      if (newIndex !== curIndex) {
        const next = { ...positions.value };
        // Desloca a linha que ocupava o destino.
        for (const k in next) {
          if (next[k] === newIndex) next[k] = curIndex;
        }
        next[itemKey] = newIndex;
        positions.value = next;
      }
    })
    .onEnd(() => {
      const finalIndex = positions.value[itemKey];
      top.value = withTiming(finalIndex * itemHeight, { duration: 120 });
      isDragging.value = false;
      activeKey.value = null;
      runOnJS(setActiveJS)(false);
      runOnJS(onReorder)();
    });

  return (
    <Animated.View style={[animatedStyle, { height: itemHeight }]}>
      <GestureDetector gesture={pan}>
        <View style={StyleSheet.absoluteFill}>
          {renderItem(item, () => {}, isActive)}
        </View>
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
}: Props<T>) {
  // posições atuais: key → index
  const positions = useSharedValue<Record<string, number>>(
    Object.fromEntries(data.map((it, i) => [keyExtractor(it), i])),
  );
  const activeKey = useSharedValue<string | null>(null);

  // Reseta as posições quando os dados mudam (ex.: refetch / nova ordem do servidor).
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
      {data.map((item, index) => {
        const k = keyExtractor(item);
        return (
          <Row
            key={k}
            item={item}
            index={index}
            itemKey={k}
            itemHeight={itemHeight}
            count={data.length}
            positions={positions}
            activeKey={activeKey}
            renderItem={renderItem}
            onReorder={handleReorder}
          />
        );
      })}
    </View>
  );
}
