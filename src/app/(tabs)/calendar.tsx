import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Text,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { useTheme } from '@/hooks/use-theme';
import { TaskItem } from '@/components/tasks/TaskItem';
import { buildTaskRows, CompletedSectionHeader, COMPLETED_HEADER_KEY } from '@/components/tasks/CompletedSection';
import { useFilterStore } from '@/store/filter-store';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { useAllTasksForCalendar, useDeleteTask, useToggleTaskStatus, useToggleFavorite } from '@/hooks/api/use-tasks';
import type { ApiTaskSummary } from '@/infrastructure/api/types';
import { expandRecurrence } from '@/utils/recurrence';
import { useTimezone } from '@/hooks/use-timezone';
import { displaySchedule, SYSTEM_TZ } from '@/utils/timezone';

// ─── Calendar constants ───────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');
const GRID_PAD = Spacing[2]; // 8px
const CELL_W = Math.floor((SCREEN_W - GRID_PAD * 2) / 7);
const CELL_H = CELL_W + 8; // extra room for badge

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildCalendarGrid(year: number, month: number): Array<Date | null> {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function apiTaskToLegacy(t: ApiTaskSummary, tz: string = SYSTEM_TZ) {
  const sched = displaySchedule(
    {
      dueDate: t.due_date ?? undefined,
      startTime: t.start_time ?? undefined,
      endTime: t.end_time ?? undefined,
    },
    tz,
  );
  return {
    id: String(t.id),
    title: t.title,
    status: t.status as 'not_started' | 'in_progress' | 'completed' | 'cancelled',
    priority: t.priority as 'low' | 'normal' | 'high' | 'critical',
    dueDate: sched.dueDate,
    startTime: sched.startTime,
    endTime: sched.endTime,
    isRecurring: !!t.recurrence,
    isFavorite: t.is_favorite,
    position: 0,
    completedAt: t.completed_at ?? undefined,
    createdAt: t.created_at ?? '',
    updatedAt: t.updated_at ?? '',
    listId: undefined,
    description: undefined,
    parentId: undefined,
    isEmailLinked: t.external_provider === 'microsoft' && !!t.external_email_id,
  };
}

function TaskItemSwipeable({ task, onToggle, onPress, onFavorite, onDelete }: {
  task: ReturnType<typeof apiTaskToLegacy>;
  onToggle: () => void;
  onPress: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const renderRightActions = useCallback(() => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => { swipeableRef.current?.close(); onDelete(); }}>
      <Text style={styles.deleteActionText}>Excluir</Text>
    </TouchableOpacity>
  ), [onDelete]);

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} rightThreshold={60} friction={2}>
      <TaskItem task={task} onToggle={onToggle} onPress={onPress} onFavorite={onFavorite} />
    </Swipeable>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const today = toLocalMidnight(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

  const { data: allTasks = [], isLoading, refetch } = useAllTasksForCalendar();
  const { showCompleted, toggleShowCompleted } = useFilterStore();
  const deleteTask = useDeleteTask();
  const toggleStatus = useToggleTaskStatus();
  const toggleFav = useToggleFavorite();

  // Map dateStr → tasks[]. Tarefas com recorrência são EXPANDIDAS no cliente para
  // todas as datas geradas dentro do mês visível (a mesma tarefa aparece em vários
  // dias). Tarefas sem recorrência aparecem só na due_date.
  const tasksByDate = useMemo(() => {
    const map = new Map<string, ApiTaskSummary[]>();
    // Range = mês inteiro exibido (1º dia ao último).
    const rangeStart = toDateStr(new Date(displayYear, displayMonth, 1));
    const rangeEnd = toDateStr(new Date(displayYear, displayMonth + 1, 0));

    const add = (dateStr: string, task: ApiTaskSummary) => {
      const existing = map.get(dateStr) ?? [];
      map.set(dateStr, [...existing, task]);
    };

    for (const task of allTasks) {
      if (!task.due_date) continue;
      if (task.recurrence) {
        const occurrences = expandRecurrence(
          { due_date: task.due_date.slice(0, 10), recurrence: task.recurrence },
          rangeStart,
          rangeEnd,
        );
        for (const dateStr of occurrences) add(dateStr, task);
      } else {
        // slice(0,10) handles 'YYYY-MM-DD' e formatos com hora/ISO.
        add(task.due_date.slice(0, 10), task);
      }
    }
    return map;
  }, [allTasks, displayYear, displayMonth]);

  const selectedDateStr = toDateStr(selectedDate);
  const tz = useTimezone();
  const selectedTasks = (tasksByDate.get(selectedDateStr) ?? []).map((t) => apiTaskToLegacy(t, tz));
  const rows = useMemo(() => buildTaskRows(selectedTasks, showCompleted), [selectedTasks, showCompleted]);

  function prevMonth() {
    if (displayMonth === 0) { setDisplayMonth(11); setDisplayYear((y) => y - 1); }
    else setDisplayMonth((m) => m - 1);
  }

  function nextMonth() {
    if (displayMonth === 11) { setDisplayMonth(0); setDisplayYear((y) => y + 1); }
    else setDisplayMonth((m) => m + 1);
  }

  const cells = buildCalendarGrid(displayYear, displayMonth);
  const todayStr = toDateStr(today);
  const selectedMidnight = toLocalMidnight(selectedDate).getTime();

  const handleDelete = useCallback((id: string, title: string) => {
    Alert.alert('Excluir tarefa', `"${title}" será removida permanentemente.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteTask.mutate(id) },
    ]);
  }, [deleteTask]);

  function formatSelectedDate(d: Date): string {
    const isToday = toDateStr(d) === todayStr;
    if (isToday) return 'Hoje';
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  const CalendarHeader = (
    <View>
      {/* Month navigation */}
      <View style={[styles.monthNav, { paddingHorizontal: Spacing[4], paddingTop: Spacing[3] }]}>
        <TouchableOpacity onPress={prevMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.navArrow, { color: Colors.primary }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[styles.monthTitle, { color: theme.colors.text }]}>
          {MONTH_NAMES[displayMonth]} {displayYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={[styles.navArrow, { color: Colors.primary }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Weekday labels — match cell widths exactly */}
      <View style={[styles.weekRow, { paddingHorizontal: GRID_PAD }]}>
        {WEEKDAY_LABELS.map((label) => (
          <View key={label} style={[styles.weekCell, { width: CELL_W }]}>
            <Text style={[styles.weekLabel, { color: theme.colors.textTertiary }]}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={[styles.grid, { paddingHorizontal: GRID_PAD }]}>
        {cells.map((date, i) => {
          if (!date) {
            return <View key={`empty-${i}`} style={{ width: CELL_W, height: CELL_H }} />;
          }

          const dateStr = toDateStr(date);
          const dateMidnight = toLocalMidnight(date).getTime();
          const isToday = dateStr === todayStr;
          const isSelected = dateMidnight === selectedMidnight;
          const taskCount = tasksByDate.get(dateStr)?.length ?? 0;

          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                styles.dayCell,
                { width: CELL_W, height: CELL_H },
                isSelected && {
                  backgroundColor: Colors.primary,
                  borderRadius: Radius.full,
                },
                isToday && !isSelected && {
                  borderWidth: 1.5,
                  borderColor: Colors.primary,
                  borderRadius: Radius.full,
                },
              ]}
              onPress={() => setSelectedDate(toLocalMidnight(date))}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.dayNumber,
                { color: isSelected ? '#fff' : isToday ? Colors.primary : theme.colors.text },
                { fontWeight: isToday || isSelected ? '700' : '400' },
              ]}>
                {date.getDate()}
              </Text>
              {taskCount > 0 && (
                <View style={[
                  styles.taskBadge,
                  { backgroundColor: isSelected ? 'rgba(255,255,255,0.85)' : Colors.primary },
                ]}>
                  <Text style={[
                    styles.taskBadgeText,
                    { color: isSelected ? Colors.primary : '#fff' },
                  ]}>
                    {taskCount > 9 ? '9+' : taskCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Selected date header */}
      <View style={[styles.dateHeader, { borderTopColor: theme.colors.border }]}>
        <Text style={[styles.dateHeaderText, { color: theme.colors.text }]}>
          {formatSelectedDate(selectedDate)}
        </Text>
        <View style={[styles.taskCountBadge, { backgroundColor: Colors.primary + '20' }]}>
          <Text style={[styles.taskCountText, { color: Colors.primary }]}>{selectedTasks.length}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === 'completed-header' ? COMPLETED_HEADER_KEY : row.task.id)}
        ListHeaderComponent={CalendarHeader}
        renderItem={({ item: row }) => {
          if (row.kind === 'completed-header') {
            return <CompletedSectionHeader count={row.count} expanded={showCompleted} onToggle={toggleShowCompleted} />;
          }
          const item = row.task;
          return (
            <TaskItemSwipeable
              task={item}
              onToggle={() => {
                const newStatus = item.status === 'completed' ? 'not_started' : 'completed';
                toggleStatus.mutate({ id: item.id, status: newStatus });
              }}
              onPress={() => router.push(`/task/${item.id}` as never)}
              onFavorite={() => toggleFav.mutate({ id: item.id, isFavorite: !item.isFavorite })}
              onDelete={() => handleDelete(item.id, item.title)}
            />
          );
        }}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="📅"
              title="Sem tarefas"
              description="Nenhuma tarefa agendada para este dia"
              actionLabel="+ Nova tarefa"
              onAction={() => router.push({ pathname: '/create-task', params: { date: selectedDateStr } } as never)}
            />
          )
        }
        contentContainerStyle={selectedTasks.length === 0 ? styles.emptyOuter : styles.list}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={Colors.primary} colors={[Colors.primary]} />}
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors.primary }]}
        onPress={() => router.push({ pathname: '/create-task', params: { date: selectedDateStr } } as never)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: Spacing[3] },
  navArrow: { fontSize: 30, lineHeight: 34, width: 36, textAlign: 'center' },
  monthTitle: { fontSize: 17, fontWeight: '700' },

  weekRow: { flexDirection: 'row' },
  weekCell: { alignItems: 'center', paddingVertical: Spacing[1] },
  weekLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.2 },

  // Grid: fixed-pixel cells
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing[1] },
  dayCell: { alignItems: 'center', justifyContent: 'center', paddingBottom: 6 },
  dayNumber: { fontSize: 15, lineHeight: 20 },
  taskBadge: {
    position: 'absolute',
    bottom: 5,
    minWidth: 16,
    height: 13,
    paddingHorizontal: 3,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskBadgeText: { fontSize: 9, fontWeight: '700', lineHeight: 13 },

  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing[2],
  },
  dateHeaderText: { fontSize: 15, fontWeight: '600', textTransform: 'capitalize' },
  taskCountBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 },
  taskCountText: { fontSize: 13, fontWeight: '700' },

  list: { paddingBottom: 100 },
  emptyOuter: { flexGrow: 1 },
  deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 },
  deleteActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabIcon: { color: '#FFFFFF', fontSize: 28, lineHeight: 32, fontWeight: '400' },
});
