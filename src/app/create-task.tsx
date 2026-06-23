import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import type { TaskPriority } from '@/domain/entities';
import { useCreateTask } from '@/hooks/api/use-tasks';
import { useTaskLists } from '@/hooks/api/use-task-lists';
import { CalendarPicker } from '@/components/tasks/CalendarPicker';
import { TimeRangePicker } from '@/components/tasks/TimeRangePicker';
import { RecurrencePicker } from '@/components/tasks/RecurrencePicker';
import {
  ReminderPicker,
  computeRelativeRemindAt,
  toLocalIso,
  type ReminderOptionKey,
} from '@/components/tasks/ReminderPicker';
import { useAddReminder } from '@/hooks/api/use-tasks';
import { scheduleTaskReminder } from '@/lib/notifications';
import { isValidTime, isEndAfterStart } from '@/utils/time';
import { useTimezone } from '@/hooks/use-timezone';
import { toCanonicalSchedule } from '@/utils/timezone';
import type { ApiRecurrence } from '@/infrastructure/api/types';

type DateShortcut = 'today' | 'tomorrow' | 'custom' | 'none';

function getDueDate(key: DateShortcut, custom: Date | null): string | undefined {
  const now = new Date();
  if (key === 'today') return now.toISOString().split('T')[0];
  if (key === 'tomorrow') {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }
  if (key === 'custom' && custom) return custom.toISOString().split('T')[0];
  return undefined;
}

const DATE_SHORTCUTS: Array<{ key: DateShortcut; label: string; emoji: string }> = [
  { key: 'none', label: 'Sem data', emoji: '—' },
  { key: 'today', label: 'Hoje', emoji: '📅' },
  { key: 'tomorrow', label: 'Amanhã', emoji: '🌅' },
];

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string; color: string; emoji: string }> = [
  { value: 'low', label: 'Baixa', color: Colors.priorityLow, emoji: '🔽' },
  { value: 'normal', label: 'Normal', color: Colors.priorityNormal, emoji: '➡️' },
  { value: 'high', label: 'Alta', color: Colors.priorityHigh, emoji: '🔼' },
  { value: 'critical', label: 'Crítica', color: Colors.priorityCritical, emoji: '🚨' },
];

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text variant="label" style={{ color: theme.colors.textTertiary, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>;
}

export default function CreateTaskScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const createTask = useCreateTask();
  const addReminder = useAddReminder();
  const { data: lists = [] } = useTaskLists();
  const { date: dateParam } = useLocalSearchParams<{ date?: string }>();

  const [title, setTitle] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dateShortcut, setDateShortcut] = useState<DateShortcut>('none');
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const tz = useTimezone();
  const [recurrence, setRecurrence] = useState<ApiRecurrence | null>(null);
  const [reminderKey, setReminderKey] = useState<ReminderOptionKey>('none');
  const [reminderCustomDate, setReminderCustomDate] = useState<Date | null>(null);
  const [reminderCustomTime, setReminderCustomTime] = useState('');
  const titleRef = useRef<TextInput>(null);

  // Pre-select date when navigated from calendar
  useEffect(() => {
    if (dateParam) {
      const parts = dateParam.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      setCustomDate(d);
      setDateShortcut('custom');
    }
  }, [dateParam]);

  useEffect(() => {
    const timer = setTimeout(() => { titleRef.current?.focus(); }, 150);
    return () => clearTimeout(timer);
  }, []);

  const timeValid =
    isValidTime(startTime) && isValidTime(endTime) && isEndAfterStart(startTime, endTime);
  const canCreate = title.trim().length > 0 && timeValid;
  const isLoading = createTask.isPending;

  async function handleCreate() {
    if (title.trim().length === 0) return;
    if (!timeValid) {
      Alert.alert('Horário inválido', 'Verifique os horários: use HH:MM e o fim deve ser ≥ o início.');
      return;
    }
    const dueDate = getDueDate(dateShortcut, customDate);
    const remindAtDate = resolveRemindAtDate(dueDate);
    // O usuário digita no fuso dele; converte para o canônico (Brasília) ao salvar.
    const canon = toCanonicalSchedule(
      { dueDate, startTime: startTime || undefined, endTime: endTime || undefined },
      tz,
    );
    try {
      const created = await createTask.mutateAsync({
        title: title.trim(),
        status: 'not_started',
        priority,
        due_date: canon.dueDate,
        task_list_id: selectedListId ? parseInt(selectedListId) : undefined,
        start_time: canon.startTime || null,
        end_time: canon.endTime || null,
        recurrence,
        is_favorite: false,
      });
      // Lembrete: persiste no backend e agenda a notificação local.
      if (remindAtDate) {
        const remindAtIso = toLocalIso(remindAtDate);
        try {
          await addReminder.mutateAsync({ taskId: created.data.id, remindAt: remindAtIso });
          // Tarefa recorrente → lembrete recorrente (acompanha cada ocorrência).
          await scheduleTaskReminder(
            { id: created.data.id, title: title.trim() },
            remindAtIso,
            recurrence
              ? { frequency: recurrence.frequency, interval: recurrence.interval, by_weekday: recurrence.by_weekday }
              : null,
          );
        } catch {
          // Não bloqueia a criação da tarefa por causa do lembrete.
        }
      }
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a tarefa. Tente novamente.');
    }
  }

  /** Resolve a Date do lembrete conforme a opção escolhida; null se 'Nenhum' ou inválida. */
  function resolveRemindAtDate(dueDate: string | undefined): Date | null {
    if (reminderKey === 'none') return null;
    if (reminderKey === 'custom') {
      if (!reminderCustomDate || !isValidTime(reminderCustomTime) || !reminderCustomTime) return null;
      const [h, mi] = reminderCustomTime.split(':').map((n) => parseInt(n, 10));
      const d = new Date(reminderCustomDate);
      d.setHours(h, mi, 0, 0);
      return d;
    }
    return computeRelativeRemindAt(reminderKey, dueDate ?? null, startTime);
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.primary }}>Cancelar</Text>
          </TouchableOpacity>
          <Text variant="callout" weight="semibold">Nova tarefa</Text>
          <TouchableOpacity onPress={handleCreate} disabled={!canCreate || isLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" weight="semibold" style={{ color: canCreate && !isLoading ? Colors.primary : theme.colors.textTertiary }}>Criar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          <View style={[styles.titleContainer, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
            <TextInput
              ref={titleRef}
              value={title}
              onChangeText={setTitle}
              placeholder="O que precisa ser feito?"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.titleInput, { color: theme.colors.text }]}
              multiline
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={canCreate ? handleCreate : undefined}
              maxLength={200}
            />
          </View>

          {lists.length > 0 && (
            <View style={styles.section}>
              <SectionLabel label="Lista" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                <TouchableOpacity
                  onPress={() => setSelectedListId(null)}
                  style={[styles.chip, { backgroundColor: selectedListId === null ? Colors.primary : theme.colors.surface, borderColor: selectedListId === null ? Colors.primary : theme.colors.border }]}
                  activeOpacity={0.7}
                >
                  <Text variant="caption" weight="semibold" style={{ color: selectedListId === null ? '#fff' : theme.colors.textSecondary }}>Sem lista</Text>
                </TouchableOpacity>
                {lists.map((list) => {
                  const isActive = selectedListId === String(list.id);
                  const color = list.color ?? Colors.primary;
                  return (
                    <TouchableOpacity key={list.id} onPress={() => setSelectedListId(String(list.id))} style={[styles.chip, { backgroundColor: isActive ? color : theme.colors.surface, borderColor: isActive ? color : theme.colors.border }]} activeOpacity={0.7}>
                      {list.icon ? <Text style={{ fontSize: 13 }}>{list.icon}</Text> : null}
                      <Text variant="caption" weight="semibold" style={{ color: isActive ? '#fff' : theme.colors.textSecondary }}>{list.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <View style={styles.section}>
            <SectionLabel label="Prioridade" />
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((opt) => {
                const isActive = priority === opt.value;
                return (
                  <TouchableOpacity key={opt.value} onPress={() => setPriority(opt.value)} style={[styles.priorityOption, { backgroundColor: isActive ? opt.color : theme.colors.surface, borderColor: isActive ? opt.color : theme.colors.border, flex: 1 }]} activeOpacity={0.7}>
                    <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                    <Text variant="label" weight={isActive ? 'semibold' : 'regular'} style={{ color: isActive ? '#fff' : theme.colors.textSecondary }}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel label="Data de entrega" />
            <View style={styles.dateGrid}>
              {DATE_SHORTCUTS.map((d) => {
                const isActive = dateShortcut === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    onPress={() => setDateShortcut(d.key)}
                    style={[styles.dateOption, { backgroundColor: isActive ? Colors.primary + '15' : theme.colors.surface, borderColor: isActive ? Colors.primary : theme.colors.border, flex: 1 }]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 18 }}>{d.emoji}</Text>
                    <Text variant="caption" weight={isActive ? 'semibold' : 'regular'} style={{ color: isActive ? Colors.primary : theme.colors.textSecondary }}>{d.label}</Text>
                  </TouchableOpacity>
                );
              })}
              {/* Botão de calendário */}
              <TouchableOpacity
                onPress={() => setShowCalendar(true)}
                style={[styles.dateOption, {
                  backgroundColor: dateShortcut === 'custom' ? Colors.primary + '15' : theme.colors.surface,
                  borderColor: dateShortcut === 'custom' ? Colors.primary : theme.colors.border,
                  flex: 1,
                }]}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 18 }}>🗓️</Text>
                <Text
                  variant="caption"
                  weight={dateShortcut === 'custom' ? 'semibold' : 'regular'}
                  style={{ color: dateShortcut === 'custom' ? Colors.primary : theme.colors.textSecondary }}
                  numberOfLines={1}
                >
                  {dateShortcut === 'custom' && customDate
                    ? customDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                    : 'Escolher'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.section}>
            <SectionLabel label="Horário" />
            <TimeRangePicker
              start={startTime}
              end={endTime}
              onChangeStart={setStartTime}
              onChangeEnd={setEndTime}
            />
          </View>

          <View style={styles.section}>
            <SectionLabel label="Repetir" />
            <RecurrencePicker value={recurrence} onChange={setRecurrence} />
          </View>

          <View style={styles.section}>
            <SectionLabel label="Lembrete" />
            <ReminderPicker
              selected={reminderKey}
              customDate={reminderCustomDate}
              customTime={reminderCustomTime}
              onChange={(key, cd, ct) => {
                setReminderKey(key);
                setReminderCustomDate(cd);
                setReminderCustomTime(ct);
              }}
              baseDueDate={getDueDate(dateShortcut, customDate) ?? null}
              baseTime={startTime}
            />
          </View>

          <View style={[styles.section, { marginTop: Spacing[4] }]}>
            <Button title={isLoading ? 'Criando...' : 'Criar tarefa'} onPress={handleCreate} disabled={!canCreate || isLoading} loading={isLoading} size="lg" />
          </View>
        </ScrollView>

        <CalendarPicker
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          selectedDate={customDate}
          onSelect={(date) => {
            setCustomDate(date);
            setDateShortcut('custom');
            setShowCalendar(false);
          }}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[5] },
  titleContainer: { borderRadius: Radius.lg, borderWidth: 1.5, padding: Spacing[4], minHeight: 80 },
  titleInput: { fontSize: FontSize.xl, fontWeight: FontWeight.semibold, lineHeight: FontSize.xl * 1.4, textAlignVertical: 'top' },
  section: { gap: Spacing[2] },
  chipRow: { flexDirection: 'row', gap: Spacing[2] },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1.5], borderRadius: Radius.full, borderWidth: 1 },
  priorityRow: { flexDirection: 'row', gap: Spacing[2] },
  priorityOption: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing[2], paddingHorizontal: Spacing[1], borderRadius: Radius.md, borderWidth: 1.5, gap: 2 },
  dateGrid: { flexDirection: 'row', gap: Spacing[2], flexWrap: 'wrap' },
  dateOption: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing[3], paddingHorizontal: Spacing[2], borderRadius: Radius.md, borderWidth: 1.5, gap: Spacing[1], minWidth: '22%' },
});
