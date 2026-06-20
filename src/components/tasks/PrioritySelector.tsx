import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import type { TaskPriority } from '../../domain/entities';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PrioritySelectorProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

interface PriorityOption {
  key: TaskPriority;
  label: string;
  color: string;
  bgColor: string;
}

const PRIORITY_OPTIONS: PriorityOption[] = [
  {
    key: 'low',
    label: 'Baixa',
    color: '#6B7280',
    bgColor: '#F3F4F6',
  },
  {
    key: 'normal',
    label: 'Normal',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  {
    key: 'high',
    label: 'Alta',
    color: '#F59E0B',
    bgColor: '#FFFBEB',
  },
  {
    key: 'critical',
    label: 'Crítica',
    color: '#EF4444',
    bgColor: '#FEF2F2',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {PRIORITY_OPTIONS.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? opt.bgColor : theme.colors.surface,
                borderColor: isSelected ? opt.color : theme.colors.border,
                borderWidth: isSelected ? 1.5 : 1,
              },
            ]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.75}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: opt.color,
                  opacity: isSelected ? 1 : 0.5,
                },
              ]}
            />
            <Text
              style={[
                styles.label,
                {
                  color: isSelected ? opt.color : theme.colors.textSecondary,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  label: {
    fontSize: 13,
  },
});
