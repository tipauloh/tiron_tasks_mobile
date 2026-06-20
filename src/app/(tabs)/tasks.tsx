import React, { useCallback, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Text,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { useTaskStore } from '../../store/task-store';
import { useFilterStore } from '../../store/filter-store';
import { useTheme } from '../../hooks/use-theme';
import { EmptyState } from '../../components/ui/EmptyState';
import { TaskItem } from '../../components/tasks/TaskItem';
import type { Task, TaskList } from '../../domain/entities';

// ─── Types ────────────────────────────────────────────────────────────────────

type ViewMode = 'all' | 'today' | 'upcoming' | 'overdue' | 'favorites';

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const {
    tasks,
    lists,
    loadAll,
    toggleComplete,
    toggleFavorite,
    deleteTask,
    isLoading,
  } = useTaskStore();
  const { activeListId, viewMode, setActiveListId, setViewMode } =
    useFilterStore();

  React.useEffect(() => {
    loadAll();
  }, []);

  // ── Filtering ──────────────────────────────────────────────────────────────

  const filtered = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return tasks.filter((t) => {
      // List filter
      if (activeListId && t.listId !== activeListId) return false;

      // View-mode filter
      switch (viewMode as ViewMode) {
        case 'all':
          return true;
        case 'favorites':
          return t.isFavorite;
        case 'today':
          return t.dueDate === todayStr && t.status !== 'completed';
        case 'overdue':
          return (
            t.dueDate !== undefined &&
            t.dueDate < todayStr &&
            t.status !== 'completed' &&
            t.status !== 'cancelled'
          );
        case 'upcoming':
          return (
            t.dueDate !== undefined &&
            t.dueDate > todayStr &&
            t.status !== 'completed'
          );
        default:
          return t.status !== 'completed';
      }
    });
  }, [tasks, activeListId, viewMode]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleDelete = useCallback(
    (task: Task) => {
      Alert.alert(
        'Excluir tarefa',
        `"${task.title}" será removida permanentemente.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: () => deleteTask(task.id),
          },
        ],
      );
    },
    [deleteTask],
  );

  const handlePress = useCallback(
    (task: Task) => {
      router.push(`/task/${task.id}` as never);
    },
    [router],
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Lista horizontal de listas */}
      <ListTabs
        lists={lists}
        activeId={activeListId}
        onSelect={setActiveListId}
        theme={theme}
      />

      {/* Filtros rápidos */}
      <FilterTabs
        viewMode={viewMode as ViewMode}
        onSelect={(m) => setViewMode(m as ViewMode)}
        theme={theme}
      />

      {/* FlatList de tarefas */}
      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskItemSwipeable
            task={item}
            onToggle={() => toggleComplete(item.id)}
            onPress={() => handlePress(item)}
            onFavorite={() => toggleFavorite(item.id)}
            onDelete={() => handleDelete(item)}
          />
        )}
        contentContainerStyle={
          filtered.length === 0 ? styles.emptyContainer : styles.list
        }
        ListEmptyComponent={
          <EmptyState
            icon="✅"
            title="Nenhuma tarefa aqui"
            description="Crie sua primeira tarefa para começar"
            actionLabel="+ Nova tarefa"
            onAction={() => router.push('/create-task' as never)}
          />
        }
        refreshing={isLoading}
        onRefresh={loadAll}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => router.push('/create-task' as never)}
        activeOpacity={0.85}
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ─── ListTabs ─────────────────────────────────────────────────────────────────

interface ListTabsProps {
  lists: TaskList[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
  theme: ReturnType<typeof import('../../hooks/use-theme')['useTheme']>['theme'];
}

function ListTabs({ lists, activeId, onSelect, theme }: ListTabsProps) {
  if (lists.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.listTabsScroll}
      contentContainerStyle={styles.listTabsContent}
    >
      {/* "Todas" pill */}
      <Pressable
        style={[
          styles.listTab,
          {
            backgroundColor:
              activeId === null ? theme.colors.primary : theme.colors.surface,
            borderColor:
              activeId === null ? theme.colors.primary : theme.colors.border,
          },
        ]}
        onPress={() => onSelect(null)}
      >
        <Text
          style={[
            styles.listTabText,
            {
              color:
                activeId === null
                  ? theme.colors.textInverse
                  : theme.colors.textSecondary,
            },
          ]}
        >
          Todas
        </Text>
      </Pressable>

      {lists.map((list) => {
        const isActive = activeId === list.id;
        return (
          <Pressable
            key={list.id}
            style={[
              styles.listTab,
              {
                backgroundColor: isActive ? list.color : theme.colors.surface,
                borderColor: isActive ? list.color : theme.colors.border,
              },
            ]}
            onPress={() => onSelect(list.id)}
          >
            {list.icon ? (
              <Text style={styles.listTabIcon}>{list.icon}</Text>
            ) : null}
            <Text
              style={[
                styles.listTabText,
                {
                  color: isActive ? '#FFFFFF' : theme.colors.textSecondary,
                },
              ]}
            >
              {list.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── FilterTabs ───────────────────────────────────────────────────────────────

const FILTER_OPTIONS: Array<{ key: ViewMode; label: string }> = [
  { key: 'all', label: 'Todas' },
  { key: 'today', label: 'Hoje' },
  { key: 'upcoming', label: 'Próximas' },
  { key: 'favorites', label: 'Favoritas' },
  { key: 'overdue', label: 'Atrasadas' },
];

interface FilterTabsProps {
  viewMode: ViewMode;
  onSelect: (mode: ViewMode) => void;
  theme: ReturnType<typeof import('../../hooks/use-theme')['useTheme']>['theme'];
}

function FilterTabs({ viewMode, onSelect, theme }: FilterTabsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterScroll}
      contentContainerStyle={styles.filterContent}
    >
      {FILTER_OPTIONS.map((opt) => {
        const isActive = viewMode === opt.key;
        return (
          <Pressable
            key={opt.key}
            style={[
              styles.filterChip,
              {
                backgroundColor: isActive
                  ? theme.colors.primaryLight
                  : 'transparent',
                borderColor: isActive
                  ? theme.colors.primary
                  : theme.colors.border,
              },
            ]}
            onPress={() => onSelect(opt.key)}
          >
            <Text
              style={[
                styles.filterChipText,
                {
                  color: isActive
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                  fontWeight: isActive ? '600' : '400',
                },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// ─── TaskItemSwipeable ────────────────────────────────────────────────────────

interface TaskItemSwipeableProps {
  task: Task;
  onToggle: () => void;
  onPress: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}

function TaskItemSwipeable({
  task,
  onToggle,
  onPress,
  onFavorite,
  onDelete,
}: TaskItemSwipeableProps) {
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = useCallback(() => {
    return (
      <TouchableOpacity
        style={styles.deleteAction}
        onPress={() => {
          swipeableRef.current?.close();
          onDelete();
        }}
      >
        <Text style={styles.deleteActionText}>Excluir</Text>
      </TouchableOpacity>
    );
  }, [onDelete]);

  // Adapt () => void callbacks to match TaskItem's (id/task) => void signatures
  const handleToggle = useCallback((_id: string) => onToggle(), [onToggle]);
  const handlePress = useCallback((_t: Task) => onPress(), [onPress]);
  const handleFavorite = useCallback((_id: string) => onFavorite(), [onFavorite]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={60}
      friction={2}
    >
      <TaskItem
        task={task}
        onToggle={handleToggle}
        onPress={handlePress}
        onFavorite={handleFavorite}
      />
    </Swipeable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // List tabs
  listTabsScroll: { flexGrow: 0 },
  listTabsContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
  },
  listTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    gap: 4,
  },
  listTabIcon: { fontSize: 13 },
  listTabText: { fontSize: 13, fontWeight: '500' },

  // Filter chips
  filterScroll: { flexGrow: 0 },
  filterContent: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 9999,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13 },

  // Task list
  list: { paddingBottom: 100 },
  emptyContainer: { flex: 1 },

  // Swipe delete action
  deleteAction: {
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginVertical: 0,
  },
  deleteActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: 28,
    lineHeight: 32,
    fontWeight: '400',
  },
});
