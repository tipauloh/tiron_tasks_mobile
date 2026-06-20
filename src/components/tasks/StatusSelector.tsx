import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import type { TaskStatus } from '../../domain/entities';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatusSelectorProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}

// ─── Config ───────────────────────────────────────────────────────────────────

interface StatusOption {
  key: TaskStatus;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    key: 'not_started',
    label: 'Não iniciada',
    color: '#9CA3AF',
    bgColor: '#F9FAFB',
    icon: '○',
  },
  {
    key: 'in_progress',
    label: 'Em andamento',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
    icon: '◑',
  },
  {
    key: 'completed',
    label: 'Concluída',
    color: '#10B981',
    bgColor: '#ECFDF5',
    icon: '●',
  },
  {
    key: 'cancelled',
    label: 'Cancelada',
    color: '#EF4444',
    bgColor: '#FEF2F2',
    icon: '✕',
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export function StatusSelector({ value, onChange }: StatusSelectorProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.container}>
      {STATUS_OPTIONS.map((opt) => {
        const isSelected = value === opt.key;
        return (
          <TouchableOpacity
            key={opt.key}
            style={[
              styles.option,
              {
                backgroundColor: isSelected ? opt.bgColor : theme.colors.surface,
                borderColor: isSelected ? opt.color : theme.colors.border,
                borderWidth: isSelected ? 1.5 : 1,
              },
            ]}
            onPress={() => onChange(opt.key)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                styles.icon,
                {
                  color: opt.color,
                  opacity: isSelected ? 1 : 0.5,
                },
              ]}
            >
              {opt.icon}
            </Text>
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
            {isSelected && (
              <View
                style={[styles.selectedDot, { backgroundColor: opt.color }]}
              />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 10,
  },
  icon: {
    fontSize: 16,
    width: 20,
    textAlign: 'center',
  },
  label: {
    flex: 1,
    fontSize: 14,
  },
  selectedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
