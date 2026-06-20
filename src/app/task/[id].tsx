import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '@/store/task-store';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import type { Task, TaskStatus, TaskPriority } from '@/domain/entities';

// ─── Status Selector ───────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string; color: string; emoji: string }> = [
  { value: 'not_started', label: 'Não iniciada', color: Colors.statusNotStarted, emoji: '⭕' },
  { value: 'in_progress', label: 'Em andamento', color: Colors.statusInProgress, emoji: '🔵' },
  { value: 'completed', label: 'Concluída', color: Colors.statusCompleted, emoji: '✅' },
  { value: 'cancelled', label: 'Cancelada', color: Colors.statusCancelled, emoji: '🚫' },
];

interface StatusSelectorProps {
  value: TaskStatus;
  onChange: (status: TaskStatus) => void;
}

function StatusSelector({ value, onChange }: StatusSelectorProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.selectorGrid}>
      {STATUS_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.selectorOption,
              {
                borderColor: isActive ? opt.color : theme.colors.border,
                backgroundColor: isActive
                  ? opt.color + '20'
                  : theme.colors.surface,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
            <Text
              variant="caption"
              weight={isActive ? 'semibold' : 'regular'}
              style={{ color: isActive ? opt.color : theme.colors.textSecondary }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Priority Selector ─────────────────────────────────────────────────────

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string; color: string; emoji: string }> = [
  { value: 'low', label: 'Baixa', color: Colors.priorityLow, emoji: '🔽' },
  { value: 'normal', label: 'Normal', color: Colors.priorityNormal, emoji: '➡️' },
  { value: 'high', label: 'Alta', color: Colors.priorityHigh, emoji: '🔼' },
  { value: 'critical', label: 'Crítica', color: Colors.priorityCritical, emoji: '🚨' },
];

interface PrioritySelectorProps {
  value: TaskPriority;
  onChange: (priority: TaskPriority) => void;
}

function PrioritySelector({ value, onChange }: PrioritySelectorProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.selectorRow}>
      {PRIORITY_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[
              styles.priorityOption,
              {
                borderColor: isActive ? opt.color : theme.colors.border,
                backgroundColor: isActive ? opt.color : theme.colors.surface,
                flex: 1,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 14 }}>{opt.emoji}</Text>
            <Text
              variant="label"
              style={{ color: isActive ? '#fff' : theme.colors.textSecondary }}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text
      variant="label"
      style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}
    >
      {label.toUpperCase()}
    </Text>
  );
}

// ─── Task Detail Screen ────────────────────────────────────────────────────

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { tasks, updateTask, deleteTask } = useTaskStore();

  const task = tasks.find((t) => t.id === id);

  // Local editable state
  const [title, setTitle] = useState(task?.title ?? '');
  const [description, setDescription] = useState(task?.description ?? '');
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? 'not_started');
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? 'normal');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(task.status);
      setPriority(task.priority);
      setIsDirty(false);
    }
  }, [task?.id]);

  function markDirty() {
    setIsDirty(true);
  }

  const handleSave = useCallback(async () => {
    if (!task) return;
    await updateTask(task.id, {
      title: title.trim(),
      description: description.trim() || undefined,
      status,
      priority,
    });
    setIsDirty(false);
    router.back();
  }, [task, title, description, status, priority, updateTask, router]);

  const handleDelete = useCallback(() => {
    if (!task) return;
    Alert.alert(
      'Excluir tarefa',
      `"${task.title}" será removida permanentemente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(task.id);
            router.back();
          },
        },
      ]
    );
  }, [task, deleteTask, router]);

  function handleClose() {
    if (isDirty) {
      Alert.alert(
        'Descartar alterações?',
        'Você tem alterações não salvas.',
        [
          { text: 'Continuar editando', style: 'cancel' },
          {
            text: 'Descartar',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  }

  if (!task) {
    return (
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.colors.background }]}
        edges={['top', 'bottom']}
      >
        <View style={styles.notFound}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text variant="headline" weight="semibold">
            Tarefa não encontrada
          </Text>
          <Button title="Voltar" onPress={() => router.back()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.colors.background }]}
        edges={['top', 'bottom']}
      >
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={handleClose}
            style={styles.headerBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="body" style={{ color: Colors.primary }}>
              Fechar
            </Text>
          </TouchableOpacity>

          <Text variant="callout" weight="semibold">
            Tarefa
          </Text>

          <TouchableOpacity
            onPress={handleSave}
            style={styles.headerBtn}
            disabled={!isDirty || !title.trim()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              variant="body"
              weight="semibold"
              style={{
                color:
                  isDirty && title.trim() ? Colors.primary : theme.colors.textTertiary,
              }}
            >
              Salvar
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <Input
            value={title}
            onChangeText={(t) => { setTitle(t); markDirty(); }}
            placeholder="Título da tarefa"
            style={styles.titleInput}
            multiline
            returnKeyType="done"
            blurOnSubmit
          />

          {/* Description */}
          <View style={styles.section}>
            <SectionLabel label="Descrição" />
            <Input
              value={description}
              onChangeText={(t) => { setDescription(t); markDirty(); }}
              placeholder="Adicione uma descrição..."
              multiline
              numberOfLines={4}
            />
          </View>

          {/* Status */}
          <View style={styles.section}>
            <SectionLabel label="Status" />
            <StatusSelector
              value={status}
              onChange={(s) => { setStatus(s); markDirty(); }}
            />
          </View>

          {/* Priority */}
          <View style={styles.section}>
            <SectionLabel label="Prioridade" />
            <PrioritySelector
              value={priority}
              onChange={(p) => { setPriority(p); markDirty(); }}
            />
          </View>

          {/* Due date (read-only display) */}
          {task.dueDate && (
            <View style={styles.section}>
              <SectionLabel label="Data de entrega" />
              <View
                style={[
                  styles.infoRow,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 16 }}>📅</Text>
                <Text variant="body">
                  {new Date(task.dueDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          )}

          {/* Metadata */}
          <View style={styles.section}>
            <SectionLabel label="Informações" />
            <View
              style={[
                styles.metaCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.metaRow}>
                <Text variant="caption" secondary>Criada em</Text>
                <Text variant="caption" secondary>
                  {new Date(task.createdAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
              {task.completedAt && (
                <View style={styles.metaRow}>
                  <Text variant="caption" secondary>Concluída em</Text>
                  <Text variant="caption" secondary>
                    {new Date(task.completedAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Delete button */}
          <View style={[styles.section, { marginTop: Spacing[4] }]}>
            <Button
              title="Excluir tarefa"
              onPress={handleDelete}
              variant="danger"
              size="md"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: {
    minWidth: 60,
  },
  scroll: {
    padding: Spacing[4],
    paddingBottom: Spacing[12],
    gap: Spacing[4],
  },
  titleInput: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    minHeight: 56,
  },
  section: {
    gap: Spacing[2],
  },
  sectionLabel: {
    letterSpacing: 0.6,
  },
  selectorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  selectorOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1.5],
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1.5,
    minWidth: '48%',
    flexShrink: 1,
  },
  selectorRow: {
    flexDirection: 'row',
    gap: Spacing[1.5],
  },
  priorityOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[1],
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  metaCard: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'transparent',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[4],
  },
});
