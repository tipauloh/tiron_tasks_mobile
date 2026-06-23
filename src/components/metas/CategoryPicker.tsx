import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { GOAL_CATEGORIES } from './categories';
import type { GoalCategory } from '@/domain/entities';

interface CategoryPickerProps {
  visible: boolean;
  onClose: () => void;
  selected: GoalCategory | null;
  onSelect: (category: GoalCategory) => void;
}

export function CategoryPicker({ visible, onClose, selected, onSelect }: CategoryPickerProps) {
  const { theme } = useTheme();
  return (
    <BottomSheet visible={visible} onClose={onClose} title="Categoria">
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {GOAL_CATEGORIES.map((cat) => {
          const isActive = selected === cat.value;
          return (
            <TouchableOpacity
              key={cat.value}
              style={[styles.option, { borderBottomColor: theme.colors.borderLight }]}
              onPress={() => { onSelect(cat.value); onClose(); }}
              activeOpacity={0.7}
            >
              <View style={[styles.swatch, { backgroundColor: cat.color + '22' }]}>
                <Text style={styles.emoji}>{cat.emoji}</Text>
              </View>
              <Text variant="body" weight={isActive ? 'semibold' : 'regular'} style={{ flex: 1 }}>
                {cat.value}
              </Text>
              {isActive && <Text style={{ color: Colors.primary, fontSize: 16 }}>✓</Text>}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  swatch: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 18 },
});
