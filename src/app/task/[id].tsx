import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import type { TaskStatus, TaskPriority } from '@/domain/entities';
import { useTask, useUpdateTask, useDeleteTask } from '@/hooks/api/use-tasks';
import { CalendarPicker } from '@/components/tasks/CalendarPicker';
import { ListSelectorTrigger } from '@/components/tasks/ListSelector';

const STATUS_OPTIONS: Array<{ value: TaskStatus; label: string; color: string; emoji: string }> = [
  { value: 'not_started', label: 'Não iniciada', color: Colors.statusNotStarted, emoji: '⭕' },
  { value: 'in_progress', label: 'Em andamento', color: Colors.statusInProgress, emoji: '🔵' },
  { value: 'completed', label: 'Concluída', color: Colors.statusCompleted, emoji: '✅' },
  { value: 'cancelled', label: 'Cancelada', color: Colors.statusCancelled, emoji: '🚫' },
];

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string; color: string; emoji: string }> = [
  { value: 'low', label: 'Baixa', color: Colors.priorityLow, emoji: '🔽' },
  { value: 'normal', label: 'Normal', color: Colors.priorityNormal, emoji: '➡️' },
  { value: 'high', label: 'Alta', color: Colors.priorityHigh, emoji: '🔼' },
  { value: 'critical', label: 'Crítica', color: Colors.priorityCritical, emoji: '🚨' },
];

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text variant="label" style={[styles.sectionLabel, { color: theme.colors.textTertiary }]}>{label.toUpperCase()}</Text>;
}

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const { data: task, isLoading } = useTask(id ?? '');
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [listId, setListId] = useState<string | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(task.status as TaskStatus);
      setPriority(task.priority as TaskPriority);
      if (task.due_date) {
        const parts = task.due_date.split('-');
        setDueDate(new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2])));
      } else {
        setDueDate(null);
      }
      setListId(task.task_list ? String(task.task_list.id) : undefined);
      setIsDirty(false);
    }
  }, [task?.id]);

  const handleSave = useCallback(async () => {
    if (!task) return;
    await updateTask.mutateAsync({
      id: String(task.id),
      data: {
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        due_date: dueDate
          ? `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}-${String(dueDate.getDate()).padStart(2, '0')}`
          : null as unknown as undefined,
        task_list_id: listId ? parseInt(listId) : (null as unknown as undefined),
      },
    });
    setIsDirty(false);
    router.back();
  }, [task, title, description, status, priority, dueDate, listId, updateTask, router]);

  const handleDelete = useCallback(() => {
    if (!task) return;
    Alert.alert('Excluir tarefa', `"${task.title}" será removida permanentemente.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: async () => { await deleteTask.mutateAsync(String(task.id)); router.back(); } },
    ]);
  }, [task, deleteTask, router]);

  function handleClose() {
    if (isDirty) {
      Alert.alert('Descartar alterações?', 'Você tem alterações não salvas.', [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.notFound}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.notFound}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text variant="headline" weight="semibold">Tarefa não encontrada</Text>
          <Button title="Voltar" onPress={() => router.back()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={handleClose} style={styles.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.primary }}>Fechar</Text>
          </TouchableOpacity>
          <Text variant="callout" weight="semibold">Tarefa</Text>
          <TouchableOpacity onPress={handleSave} style={styles.headerBtn} disabled={!isDirty || !title.trim() || updateTask.isPending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" weight="semibold" style={{ color: isDirty && title.trim() ? Colors.primary : theme.colors.textTertiary }}>
              {updateTask.isPending ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          <Input
            value={title}
            onChangeText={(t) => { setTitle(t); setIsDirty(true); }}
            placeholder="Título da tarefa"
            style={styles.titleInput}
            multiline
            returnKeyType="done"
            blurOnSubmit
          />

          <View style={styles.section}>
            <SectionLabel label="Descrição" />
            <Input
              value={description}
              onChangeText={(t) => { setDescription(t); setIsDirty(true); }}
              placeholder="Adicione uma descrição..."
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel label="Status" />
            <View style={styles.selectorGrid}>
              {STATUS_OPTIONS.map((opt) => {
                const isActive = status === opt.value;
                return (
                  <TouchableOpacity key={opt.value} onPress={() => { setStatus(opt.value); setIsDirty(true); }}
                    style={[styles.selectorOption, { borderColor: isActive ? opt.color : theme.colors.border, backgroundColor: isActive ? opt.color + '20' : theme.colors.surface }]} activeOpacity={0.7}>
                    <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                    <Text variant="caption" weight={isActive ? 'semibold' : 'regular'} style={{ color: isActive ? opt.color : theme.colors.textSecondary }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel label="Prioridade" />
            <View style={styles.selectorRow}>
              {PRIORITY_OPTIONS.map((opt) => {
                const isActive = priority === opt.value;
                return (
                  <TouchableOpacity key={opt.value} onPress={() => { setPriority(opt.value); setIsDirty(true); }}
                    style={[styles.priorityOption, { borderColor: isActive ? opt.color : theme.colors.border, backgroundColor: isActive ? opt.color : theme.colors.surface, flex: 1 }]} activeOpacity={0.7}>
                    <Text style={{ fontSize: 14 }}>{opt.emoji}</Text>
                    <Text variant="label" style={{ color: isActive ? '#fff' : theme.colors.textSecondary }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel label="Lista" />
            <ListSelectorTrigger
              value={listId}
              onChange={(id) => { setListId(id); setIsDirty(true); }}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel label="Data de entrega" />
            <TouchableOpacity
              style={[styles.infoRow, { backgroundColor: theme.colors.surface, borderColor: dueDate ? Colors.primary : theme.colors.border, borderWidth: dueDate ? 1.5 : StyleSheet.hairlineWidth }]}
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 16 }}>📅</Text>
              <Text variant="body" style={{ flex: 1, color: dueDate ? theme.colors.text : theme.colors.textTertiary }}>
                {dueDate
                  ? dueDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
                  : 'Sem data de entrega'}
              </Text>
              {dueDate && (
                <TouchableOpacity
                  onPress={() => { setDueDate(null); setIsDirty(true); }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ color: Colors.danger, fontSize: 13 }}>Remover</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          <CalendarPicker
            visible={showCalendar}
            onClose={() => setShowCalendar(false)}
            selectedDate={dueDate}
            onSelect={(d) => { setDueDate(d); setIsDirty(true); setShowCalendar(false); }}
          />

          <View style={styles.section}>
            <SectionLabel label="Informações" />
            <View style={[styles.metaCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={styles.metaRow}>
                <Text variant="caption" secondary>Criada em</Text>
                <Text variant="caption" secondary>{task.created_at ? new Date(task.created_at).toLocaleDateString('pt-BR') : '—'}</Text>
              </View>
              {task.completed_at && (
                <View style={styles.metaRow}>
                  <Text variant="caption" secondary>Concluída em</Text>
                  <Text variant="caption" secondary>{new Date(task.completed_at).toLocaleDateString('pt-BR')}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.section, { marginTop: Spacing[4] }]}>
            <Button
              title={updateTask.isPending ? 'Salvando...' : 'Salvar alterações'}
              onPress={handleSave}
              disabled={!isDirty || !title.trim() || updateTask.isPending}
              loading={updateTask.isPending}
              size="lg"
            />
          </View>

          <View style={styles.section}>
            <Button title={deleteTask.isPending ? 'Excluindo...' : 'Excluir tarefa'} onPress={handleDelete} variant="danger" size="md" />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  headerBtn: { minWidth: 60 },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[4] },
  titleInput: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, minHeight: 56 },
  section: { gap: Spacing[2] },
  sectionLabel: { letterSpacing: 0.6 },
  selectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  selectorOption: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1.5], paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.md, borderWidth: 1.5, minWidth: '48%', flexShrink: 1 },
  selectorRow: { flexDirection: 'row', gap: Spacing[1.5] },
  priorityOption: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing[2], paddingHorizontal: Spacing[1], borderRadius: Radius.md, borderWidth: 1.5, gap: 2 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth },
  metaCard: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', padding: Spacing[3] },
  notFound: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[4] },
});
