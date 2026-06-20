import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import type { Task } from '../../domain/entities';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SubtaskListProps {
  parentId: string;
  tasks: Task[];
  onAdd: (title: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubtaskList({
  tasks,
  onAdd,
  onToggle,
  onDelete,
}: SubtaskListProps) {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setInputValue('');
  };

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
          Subtarefas
        </Text>
        {tasks.length > 0 && (
          <Text
            style={[styles.headerCount, { color: theme.colors.textSecondary }]}
          >
            {completedCount}/{tasks.length}
          </Text>
        )}
      </View>

      {/* Progress bar */}
      {tasks.length > 0 && (
        <View
          style={[
            styles.progressTrack,
            { backgroundColor: theme.colors.border },
          ]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.colors.success,
                width: `${Math.round((completedCount / tasks.length) * 100)}%`,
              },
            ]}
          />
        </View>
      )}

      {/* Subtask list */}
      {tasks.map((subtask) => (
        <SubtaskRow
          key={subtask.id}
          subtask={subtask}
          onToggle={() => onToggle(subtask.id)}
          onDelete={() => onDelete(subtask.id)}
          theme={theme}
        />
      ))}

      {/* Add input */}
      <View
        style={[
          styles.addRow,
          { borderColor: theme.colors.border },
        ]}
      >
        <TextInput
          style={[
            styles.addInput,
            {
              color: theme.colors.text,
            },
          ]}
          placeholder="Adicionar subtarefa..."
          placeholderTextColor={theme.colors.textTertiary}
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        {inputValue.trim().length > 0 && (
          <TouchableOpacity
            style={[
              styles.addButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={handleAdd}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── SubtaskRow ───────────────────────────────────────────────────────────────

interface SubtaskRowProps {
  subtask: Task;
  onToggle: () => void;
  onDelete: () => void;
  theme: ReturnType<typeof import('../../hooks/use-theme')['useTheme']>['theme'];
}

function SubtaskRow({ subtask, onToggle, onDelete, theme }: SubtaskRowProps) {
  const isCompleted = subtask.status === 'completed';

  return (
    <View style={styles.subtaskRow}>
      <TouchableOpacity
        style={[
          styles.checkbox,
          {
            borderColor: isCompleted ? theme.colors.success : theme.colors.border,
            backgroundColor: isCompleted ? theme.colors.success : 'transparent',
          },
        ]}
        onPress={onToggle}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {isCompleted && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>

      <Text
        style={[
          styles.subtaskTitle,
          {
            color: isCompleted ? theme.colors.textTertiary : theme.colors.text,
            textDecorationLine: isCompleted ? 'line-through' : 'none',
          },
        ]}
        numberOfLines={2}
      >
        {subtask.title}
      </Text>

      <TouchableOpacity
        style={styles.deleteButton}
        onPress={onDelete}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text
          style={[styles.deleteIcon, { color: theme.colors.textTertiary }]}
        >
          ✕
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    gap: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerCount: {
    fontSize: 13,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    marginBottom: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  subtaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  subtaskTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
  },
  deleteButton: {
    padding: 2,
  },
  deleteIcon: {
    fontSize: 13,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 8,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  addButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '400',
  },
});
