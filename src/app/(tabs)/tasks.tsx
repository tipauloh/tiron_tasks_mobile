import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { useFilterStore } from '@/store/filter-store';
import { useTheme } from '@/hooks/use-theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { AppIcon } from '@/components/ui/AppIcon';
import { TaskItem } from '@/components/tasks/TaskItem';
import { ListIcon } from '@/components/tasks/ListIcon';
import { buildTaskRows, CompletedSectionHeader, COMPLETED_HEADER_KEY } from '@/components/tasks/CompletedSection';
import { useTasks, useMyDay, useImportantTasks, useUpcomingTasks, useDeleteTask, useToggleTaskStatus, useToggleFavorite, useCreateTask } from '@/hooks/api/use-tasks';
import { toggleTaskCompletion } from '@/lib/complete-task';
import { useTaskLists, useArchiveTaskList } from '@/hooks/api/use-task-lists';
import type { ApiTaskSummary, ApiTaskListFull } from '@/infrastructure/api/types';

type ViewMode = 'all' | 'today' | 'upcoming' | 'overdue' | 'favorites';

function apiTaskToLegacy(t: ApiTaskSummary) {
  return {
    id: String(t.id),
    title: t.title,
    status: t.status as 'not_started' | 'in_progress' | 'completed' | 'cancelled',
    priority: t.priority as 'low' | 'normal' | 'high' | 'critical',
    dueDate: t.due_date ?? undefined,
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

export default function TasksScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { activeListId, viewMode, setActiveListId, setViewMode, showCompleted, toggleShowCompleted } = useFilterStore();

  const { data: taskLists = [] } = useTaskLists();
  const archiveList = useArchiveTaskList();
  const deleteTask = useDeleteTask();
  const toggleStatus = useToggleTaskStatus();
  const toggleFav = useToggleFavorite();
  const createTask = useCreateTask();

  const [quickTitle, setQuickTitle] = useState('');

  const activeListIntId = activeListId ? parseInt(activeListId) : undefined;
  const activeListName = activeListId ? taskLists.find((l) => String(l.id) === activeListId)?.name : undefined;

  const handleQuickAdd = useCallback(() => {
    const title = quickTitle.trim();
    if (!title) return;
    // Lista ativa => cria dentro dela; "Todas" (null) => cria sem lista.
    createTask.mutate({ title, task_list_id: activeListIntId });
    setQuickTitle('');
  }, [quickTitle, activeListIntId, createTask]);

  const allQuery = useTasks({ task_list_id: activeListIntId });
  const myDayQuery = useMyDay();
  const importantQuery = useImportantTasks();
  const upcomingQuery = useUpcomingTasks();

  const isLoading = allQuery.isLoading || myDayQuery.isLoading;

  const apiTasks = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    switch (viewMode as ViewMode) {
      case 'today': return myDayQuery.data ?? [];
      case 'favorites': return importantQuery.data ?? [];
      case 'upcoming': return upcomingQuery.data ?? [];
      case 'overdue':
        return (allQuery.data?.data ?? []).filter(
          (t) => t.due_date && t.due_date < todayStr && t.status !== 'completed' && t.status !== 'cancelled'
        );
      default: return allQuery.data?.data ?? [];
    }
  }, [viewMode, allQuery.data, myDayQuery.data, importantQuery.data, upcomingQuery.data]);

  const tasks = apiTasks.map(apiTaskToLegacy);
  const rows = React.useMemo(() => buildTaskRows(tasks, showCompleted), [tasks, showCompleted]);

  const handleRefresh = () => {
    allQuery.refetch();
    myDayQuery.refetch();
  };

  const handleDelete = useCallback((id: string, title: string) => {
    Alert.alert('Excluir tarefa', `"${title}" será removida permanentemente.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteTask.mutate(id) },
    ]);
  }, [deleteTask]);

  const handleListLongPress = useCallback((list: ApiTaskListFull) => {
    Alert.alert('Excluir lista', `"${list.name}" e todas as suas tarefas serão removidas permanentemente.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          if (activeListId === String(list.id)) setActiveListId(null);
          archiveList.mutate(String(list.id), {
            onError: () => Alert.alert('Erro', 'Não foi possível excluir a lista.'),
          });
        },
      },
    ]);
  }, [archiveList, activeListId, setActiveListId]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ListTabs
        lists={taskLists}
        activeId={activeListId}
        onSelect={setActiveListId}
        onListLongPress={handleListLongPress}
        theme={theme}
      />
      <FilterTabs viewMode={viewMode as ViewMode} onSelect={(m) => setViewMode(m as ViewMode)} theme={theme} />

      <FlatList
        data={rows}
        keyExtractor={(row) => (row.kind === 'completed-header' ? COMPLETED_HEADER_KEY : row.task.id)}
        renderItem={({ item: row }) => {
          if (row.kind === 'completed-header') {
            return <CompletedSectionHeader count={row.count} expanded={showCompleted} onToggle={toggleShowCompleted} />;
          }
          const item = row.task;
          return (
            <TaskItemSwipeable
              task={item}
              onToggle={() => toggleTaskCompletion(item, toggleStatus.mutate)}
              onPress={() => router.push(`/task/${item.id}` as never)}
              onFavorite={() => toggleFav.mutate({ id: item.id, isFavorite: !item.isFavorite })}
              onDelete={() => handleDelete(item.id, item.title)}
            />
          );
        }}
        contentContainerStyle={tasks.length === 0 ? styles.emptyContainer : styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="emptyDone"
            title="Nenhuma tarefa aqui"
            description="Crie sua primeira tarefa para começar"
            actionLabel="+ Nova tarefa"
            onAction={() => router.push('/create-task' as never)}
          />
        }
        refreshing={isLoading}
        onRefresh={handleRefresh}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={styles.bottomBarWrap}
        pointerEvents="box-none"
      >
        <View style={styles.bottomBar} pointerEvents="box-none">
          <View style={[styles.quickAddBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <TextInput
              value={quickTitle}
              onChangeText={setQuickTitle}
              placeholder={activeListName ? `Nova tarefa em ${activeListName}` : 'Nova tarefa (sem lista)'}
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.quickAddInput, { color: theme.colors.text }]}
              returnKeyType="done"
              onSubmitEditing={handleQuickAdd}
              blurOnSubmit={false}
              editable={!createTask.isPending}
            />
            {quickTitle.trim().length > 0 && (
              <TouchableOpacity onPress={handleQuickAdd} disabled={createTask.isPending} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={[styles.quickAddSend, { color: theme.colors.primary }]}>
                  {createTask.isPending ? '...' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.colors.primary }]}
            onPress={() => router.push('/create-task' as never)}
            activeOpacity={0.85}
          >
            <AppIcon name="plus" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── ListTabs ────────────────────────────────────────────────────────────────

function ListTabs({
  lists, activeId, onSelect, onListLongPress, theme,
}: {
  lists: ApiTaskListFull[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  onListLongPress: (list: ApiTaskListFull) => void;
  theme: ReturnType<typeof import('../../hooks/use-theme')['useTheme']>['theme'];
}) {
  const router = useRouter();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listTabsScroll} contentContainerStyle={styles.listTabsContent}>
      {lists.length > 0 && (
        <Pressable
          style={[styles.listTab, { backgroundColor: activeId === null ? theme.colors.primary : theme.colors.surface, borderColor: activeId === null ? theme.colors.primary : theme.colors.border }]}
          onPress={() => onSelect(null)}
        >
          <Text style={[styles.listTabText, { color: activeId === null ? theme.colors.textInverse : theme.colors.textSecondary }]}>Todas</Text>
        </Pressable>
      )}
      {lists.map((list) => {
        const isActive = activeId === String(list.id);
        return (
          <Pressable
            key={list.id}
            style={[styles.listTab, { backgroundColor: isActive ? (list.color ?? '#208AEF') : theme.colors.surface, borderColor: isActive ? (list.color ?? '#208AEF') : theme.colors.border }]}
            onPress={() => onSelect(String(list.id))}
            onLongPress={() => {
              Alert.alert(list.name, undefined, [
                { text: 'Editar', onPress: () => router.push(`/edit-list/${list.id}` as never) },
                { text: 'Excluir', style: 'destructive', onPress: () => onListLongPress(list) },
                { text: 'Cancelar', style: 'cancel' },
              ]);
            }}
            delayLongPress={400}
          >
            {list.is_system || list.icon ? <ListIcon icon={list.is_system ? 'flag' : list.icon!} size={15} color={isActive ? '#FFFFFF' : (list.color ?? theme.colors.textSecondary)} /> : null}
            <Text style={[styles.listTabText, { color: isActive ? '#FFFFFF' : theme.colors.textSecondary }]}>{list.name}</Text>
          </Pressable>
        );
      })}
      <Pressable
        style={[styles.listTab, styles.newListTab, { borderColor: theme.colors.border }]}
        onPress={() => router.push('/create-list' as never)}
      >
        <Text style={[styles.listTabText, { color: theme.colors.primary }]}>+ Nova lista</Text>
      </Pressable>
    </ScrollView>
  );
}

// ─── FilterTabs ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS: Array<{ key: ViewMode; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'today', label: 'Hoje' },
  { key: 'upcoming', label: 'Próximas' },
  { key: 'favorites', label: 'Favoritas' },
  { key: 'overdue', label: 'Atrasadas' },
];

function FilterTabs({ viewMode, onSelect, theme }: { viewMode: ViewMode; onSelect: (m: ViewMode) => void; theme: ReturnType<typeof import('../../hooks/use-theme')['useTheme']>['theme'] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
      {FILTER_OPTIONS.map((opt) => {
        const isActive = viewMode === opt.key;
        return (
          <Pressable key={opt.key} style={[styles.filterChip, { backgroundColor: isActive ? theme.colors.primaryLight : 'transparent', borderColor: isActive ? theme.colors.primary : theme.colors.border }]} onPress={() => onSelect(opt.key)}>
            <Text style={[styles.filterChipText, { color: isActive ? theme.colors.primary : theme.colors.textSecondary, fontWeight: isActive ? '600' : '400' }]}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── TaskItemSwipeable ───────────────────────────────────────────────────────

function TaskItemSwipeable({ task, onToggle, onPress, onFavorite, onDelete }: { task: ReturnType<typeof apiTaskToLegacy>; onToggle: () => void; onPress: () => void; onFavorite: () => void; onDelete: () => void }) {
  const swipeableRef = useRef<Swipeable>(null);
  const renderRightActions = useCallback(() => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => { swipeableRef.current?.close(); onDelete(); }}>
      <Text style={styles.deleteActionText}>Excluir</Text>
    </TouchableOpacity>
  ), [onDelete]);

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} rightThreshold={60} friction={2}>
      <TaskItem
        task={task}
        onToggle={() => onToggle()}
        onPress={() => onPress()}
        onFavorite={() => onFavorite()}
      />
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  listTabsScroll: { flexGrow: 0 },
  listTabsContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8, flexDirection: 'row' },
  listTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, gap: 4 },
  listTabText: { fontSize: 13, fontWeight: '500' },
  newListTab: { borderStyle: 'dashed' },
  filterScroll: { flexGrow: 0 },
  filterContent: { paddingHorizontal: 16, paddingBottom: 8, gap: 8, flexDirection: 'row' },
  filterChip: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 9999, borderWidth: 1 },
  filterChipText: { fontSize: 13 },
  list: { paddingBottom: 96 },
  emptyContainer: { flex: 1 },
  deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 },
  deleteActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  bottomBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  quickAddBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, elevation: 4, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
  quickAddInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  quickAddSend: { fontSize: 14, fontWeight: '600' },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
});
