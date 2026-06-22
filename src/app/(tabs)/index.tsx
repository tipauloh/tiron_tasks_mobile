import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Swipeable, Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReorderableList, {
  reorderItems,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { useFilterStore } from '@/store/filter-store';
import { useTheme } from '@/hooks/use-theme';
import { EmptyState } from '@/components/ui/EmptyState';
import { TaskItem } from '@/components/tasks/TaskItem';
import { buildTaskRows, CompletedSectionHeader, COMPLETED_HEADER_KEY, type TaskRow } from '@/components/tasks/CompletedSection';
import {
  useTasks, useMyDay, useImportantTasks, useUpcomingTasks,
  useDeleteTask, useToggleTaskStatus, useToggleFavorite, useCreateTask, useReorderTasks,
} from '@/hooks/api/use-tasks';
import { partitionTasks } from '@/utils/group-tasks';
import { useTaskLists, useArchiveTaskList } from '@/hooks/api/use-task-lists';
import { useDashboard } from '@/hooks/api/use-dashboard';
import { useAuthStore } from '@/store/auth-store';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import type { ApiTaskSummary, ApiTaskListFull } from '@/infrastructure/api/types';

type ViewMode = 'all' | 'today' | 'upcoming' | 'overdue' | 'favorites' | 'completed';

// Lista virtual fixa "Em Foco": não é uma task_list real — agrupa as tarefas
// marcadas como favoritas (estrela). Sempre aparece primeiro na barra de listas.
const FOCUS_LIST_ID = '__focus__';
const FOCUS_COLOR = '#7B4DFF';

// Animação do item flutuante enquanto é arrastado (react-native-reorderable-list).
// Leve escala + sombra elevam visualmente a linha "pega" pelo dedo. Sobrescrevemos
// também a opacidade para 1 (o padrão da lib reduz a opacidade do item arrastado).
// Item sendo arrastado: destaque por COR de fundo (não listra) + leve escala e
// sombra para parecer "levantado". O TaskItem é transparente, então este fundo
// aparece atrás dele apenas enquanto o item está ativo (a lib reverte ao soltar).
const REORDER_CELL_ANIMATIONS = {
  transform: [{ scale: 1.03 }],
  opacity: 1,
  backgroundColor: Colors.primary + '1A',
  shadowColor: Colors.primary,
  shadowOpacity: 0.22,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 6 },
  elevation: 8,
  zIndex: 999,
} as const;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function apiTaskToLegacy(t: ApiTaskSummary) {
  return {
    id: String(t.id),
    title: t.title,
    status: t.status as 'not_started' | 'in_progress' | 'completed' | 'cancelled',
    priority: t.priority as 'low' | 'normal' | 'high' | 'critical',
    dueDate: t.due_date ?? undefined,
    startTime: t.start_time ?? undefined,
    endTime: t.end_time ?? undefined,
    isRecurring: !!t.recurrence,
    isFavorite: t.is_favorite,
    position: 0,
    completedAt: t.completed_at ?? undefined,
    createdAt: t.created_at ?? '',
    updatedAt: t.updated_at ?? '',
    listId: undefined,
    description: undefined,
    parentId: undefined,
  };
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({
  label, count, color, isActive, onPress,
}: {
  label: string;
  count: number;
  color: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.statCard,
        {
          backgroundColor: isActive ? color + '18' : theme.colors.surfaceElevated,
          borderColor: isActive ? color : theme.colors.border,
          borderWidth: isActive ? 1.5 : StyleSheet.hairlineWidth,
        },
      ]}
    >
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={[styles.statLabel, { color: isActive ? color : theme.colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
}

// ─── TaskItemSwipeable ───────────────────────────────────────────────────────

function TaskItemSwipeable({ task, onToggle, onPress, onFavorite, onDelete, isLast }: {
  task: ReturnType<typeof apiTaskToLegacy>;
  onToggle: () => void;
  onPress: () => void;
  onFavorite: () => void;
  onDelete: () => void;
  isLast?: boolean;
}) {
  const swipeableRef = useRef<Swipeable>(null);
  const renderRightActions = useCallback(() => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => { swipeableRef.current?.close(); onDelete(); }}>
      <Text style={styles.deleteActionText}>Excluir</Text>
    </TouchableOpacity>
  ), [onDelete]);

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} rightThreshold={60} friction={2}>
      <TaskItem task={task} onToggle={onToggle} onPress={onPress} onFavorite={onFavorite} isLast={isLast} />
    </Swipeable>
  );
}

// ─── ReorderableTaskCell ─────────────────────────────────────────────────────
// Célula de tarefa PENDENTE arrastável. O long-press do gesture-handler inicia o
// drag (via useReorderableDrag) e CONVIVE com o swipe-to-delete do Swipeable —
// ao contrário do panActivateAfterLongPress da lib, cujo pan próprio compete com
// o Swipeable e impede o arraste de iniciar. O destaque do item flutuante (cor +
// escala + sombra) vem do `cellAnimations`.
function ReorderableTaskCell({ task, onToggle, onPress, onFavorite, onDelete }: {
  task: ReturnType<typeof apiTaskToLegacy>;
  onToggle: () => void;
  onPress: () => void;
  onFavorite: () => void;
  onDelete: () => void;
}) {
  const drag = useReorderableDrag();
  const longPress = useMemo(
    () => Gesture.LongPress().minDuration(180).runOnJS(true).onStart(() => drag()),
    [drag],
  );
  return (
    <GestureDetector gesture={longPress}>
      <TaskItemSwipeable
        task={task}
        onToggle={onToggle}
        onPress={onPress}
        onFavorite={onFavorite}
        onDelete={onDelete}
      />
    </GestureDetector>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function TasksScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuthStore();
  const { activeListId, viewMode, setActiveListId, setViewMode, showCompleted, toggleShowCompleted } = useFilterStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const { data: dashboard, refetch: refetchDashboard } = useDashboard();
  const { data: taskLists = [] } = useTaskLists();
  const archiveList = useArchiveTaskList();
  const deleteTask = useDeleteTask();
  const toggleStatus = useToggleTaskStatus();
  const toggleFav = useToggleFavorite();
  const createTask = useCreateTask();
  const reorderTasks = useReorderTasks();

  const [quickTitle, setQuickTitle] = useState('');

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const isSearching = debouncedSearch.length >= 2;
  const isFocus = activeListId === FOCUS_LIST_ID;
  const activeListIntId = activeListId && !isFocus ? parseInt(activeListId) : undefined;
  const activeListName = activeListIntId ? taskLists.find((l) => String(l.id) === activeListId)?.name : undefined;

  const handleQuickAdd = useCallback(() => {
    const title = quickTitle.trim();
    if (!title) return;
    // Lista ativa => cria dentro dela; "Todas" (null) => cria sem lista.
    createTask.mutate({ title, task_list_id: activeListIntId });
    setQuickTitle('');
  }, [quickTitle, activeListIntId, createTask]);

  const allQuery = useTasks(
    isSearching
      ? { search: debouncedSearch }
      : { task_list_id: activeListIntId }
  );
  const myDayQuery = useMyDay();
  const importantQuery = useImportantTasks();
  const upcomingQuery = useUpcomingTasks();
  // "Em Foco" = tarefas favoritadas (estrela/alvo). Só busca quando o foco está ativo.
  const focusQuery = useTasks({ is_favorite: true });

  const isLoading = allQuery.isLoading || myDayQuery.isLoading;

  const apiTasks = useMemo(() => {
    if (isSearching) return allQuery.data?.data ?? [];
    if (isFocus) return focusQuery.data?.data ?? [];
    const todayStr = new Date().toISOString().split('T')[0];
    const vm = viewMode as ViewMode;
    switch (vm) {
      case 'today': return myDayQuery.data ?? [];
      case 'favorites': return importantQuery.data ?? [];
      case 'upcoming': return upcomingQuery.data ?? [];
      case 'overdue':
        return (allQuery.data?.data ?? []).filter(
          (t) => t.due_date && t.due_date < todayStr && t.status !== 'completed' && t.status !== 'cancelled'
        );
      case 'completed':
        return (allQuery.data?.data ?? []).filter((t) => t.status === 'completed');
      default: return allQuery.data?.data ?? [];
    }
  }, [isSearching, debouncedSearch, isFocus, viewMode, allQuery.data, myDayQuery.data, importantQuery.data, upcomingQuery.data, focusQuery.data]);

  const tasks = apiTasks.map(apiTaskToLegacy);

  // Reordenar (arraste por long-press, sempre ativo) só faz sentido em listas
  // estáveis: "Todas" (sem filtro) ou uma lista específica — não em buscas nem em
  // visões derivadas (hoje/atrasadas/em foco/concluídas).
  const canReorder = !isSearching && !isFocus && (viewMode as ViewMode) === 'all';
  const pendingTasks = useMemo(() => partitionTasks(tasks).pending, [tasks]);
  // Habilita o arraste quando elegível e há mais de uma pendente para reordenar.
  const showReorder = canReorder && pendingTasks.length > 1;

  // No modo "Concluídas" a lista já é só de concluídas — mantém plana. Nos demais,
  // agrupa concluídas numa seção recolhível abaixo das pendentes. As pendentes
  // ficam SEMPRE no topo da lista (índices 0..pendingCount-1), o que torna seguro
  // mapear o índice de arraste de volta para a ordem das pendentes.
  const rows = useMemo<TaskRow<(typeof tasks)[number]>[]>(() => {
    if (!isSearching && (viewMode as ViewMode) === 'completed') {
      return tasks.map((task) => ({ kind: 'task', task }));
    }
    return buildTaskRows(tasks, showCompleted);
  }, [tasks, showCompleted, isSearching, viewMode]);

  // Quantidade de linhas de tarefa pendente no topo de `rows`. O drag só pode
  // soltar dentro dessa faixa; cabeçalho "Concluídas" e itens concluídos ficam fora.
  const pendingCount = pendingTasks.length;

  const handleReorder = useCallback(
    ({ from, to }: ReorderableListReorderEvent) => {
      // Só reordena pendentes: ignora se a origem for o cabeçalho ou uma concluída.
      if (from >= pendingCount) return;
      // Limita o destino à faixa de pendentes (não deixa cair sobre concluídas).
      const clampedTo = Math.min(Math.max(to, 0), pendingCount - 1);
      if (from === clampedTo) return;
      const reordered = reorderItems(pendingTasks, from, clampedTo);
      reorderTasks.mutate(
        reordered.map((t, index) => ({ id: parseInt(t.id), position: index })),
      );
    },
    [pendingTasks, pendingCount, reorderTasks],
  );

  // Realce de destino durante o arraste: um "slot" suave (fundo na cor primária +
  // contorno tracejado), sem a antiga listra fina. Mostra onde o item vai cair.
  const renderDropIndicator = useCallback(() => <View style={styles.dropIndicator} />, []);

  const handleRefresh = () => {
    allQuery.refetch();
    myDayQuery.refetch();
    refetchDashboard();
  };

  const handleDelete = useCallback((id: string, title: string) => {
    Alert.alert('Excluir tarefa', `"${title}" será removida permanentemente.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Excluir', style: 'destructive', onPress: () => deleteTask.mutate(id) },
    ]);
  }, [deleteTask]);

  const handleListLongPress = useCallback((list: ApiTaskListFull) => {
    Alert.alert('Excluir lista', `"${list.name}" e todas as suas tarefas serão removidas.`, [
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

  const counters = dashboard?.counters ?? { pending: 0, completed: 0, overdue: 0, due_today: 0 };
  const firstName = user?.name?.split(' ')[0] ?? '';
  const vm = viewMode as ViewMode;

  // ─── ListHeader ────────────────────────────────────────────────────────────

  const ListHeader = (
    <View>
      {/* Greeting + Search */}
      <View style={[styles.headerRow, { paddingHorizontal: Spacing[4], paddingTop: Spacing[3], paddingBottom: Spacing[2] }]}>
        <View style={styles.greetingBlock}>
          <Text
            style={[styles.greetingText, { color: theme.colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
          </Text>
          <Text style={[styles.greetingSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {counters.due_today > 0
              ? `${counters.due_today} tarefa${counters.due_today !== 1 ? 's' : ''} para hoje`
              : 'Sem tarefas para hoje'}
          </Text>
        </View>
        <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Buscar..."
            placeholderTextColor={theme.colors.textTertiary}
            style={[styles.searchInput, { color: theme.colors.text }]}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Stat cards — full width, clickable */}
      <View style={styles.statsRow}>
        <StatCard label="Hoje" count={counters.due_today} color={Colors.primary} isActive={!isFocus && vm === 'today'} onPress={() => { setActiveListId(null); setViewMode('today'); }} />
        <StatCard label="Atrasadas" count={counters.overdue} color={Colors.danger} isActive={!isFocus && vm === 'overdue'} onPress={() => { setActiveListId(null); setViewMode('overdue'); }} />
        <StatCard label="Pendentes" count={counters.pending} color={Colors.warning} isActive={!isFocus && vm === 'all'} onPress={() => { setActiveListId(null); setViewMode('all'); }} />
        <StatCard label="Concluídas" count={counters.completed} color={Colors.success} isActive={!isFocus && vm === 'completed'} onPress={() => { setActiveListId(null); setViewMode('completed'); }} />
      </View>

      {/* List tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.listTabsScroll} contentContainerStyle={styles.listTabsContent}>
        {/* Lista fixa especial "Em Foco" (tarefas favoritadas) — sempre primeiro */}
        <Pressable
          style={[styles.listTab, styles.focusTab, { backgroundColor: isFocus ? FOCUS_COLOR : theme.colors.surface, borderColor: isFocus ? FOCUS_COLOR : FOCUS_COLOR + '55' }]}
          onPress={() => { setActiveListId(FOCUS_LIST_ID); setViewMode('all'); }}
        >
          <Text style={styles.listTabIcon}>🎯</Text>
          <Text style={[styles.listTabText, { color: isFocus ? '#FFFFFF' : FOCUS_COLOR, fontWeight: '600' }]}>Em Foco</Text>
        </Pressable>

        {taskLists.length > 0 && (
          <Pressable
            style={[styles.listTab, { backgroundColor: activeListId === null ? theme.colors.primary : theme.colors.surface, borderColor: activeListId === null ? theme.colors.primary : theme.colors.border }]}
            onPress={() => setActiveListId(null)}
          >
            <Text style={[styles.listTabText, { color: activeListId === null ? theme.colors.textInverse : theme.colors.textSecondary }]}>Todas</Text>
          </Pressable>
        )}
        {taskLists.map((list) => {
          const isActive = activeListId === String(list.id);
          const color = list.color ?? '#208AEF';
          return (
            <Pressable
              key={list.id}
              style={[styles.listTab, { backgroundColor: isActive ? color : theme.colors.surface, borderColor: isActive ? color : theme.colors.border }]}
              onPress={() => setActiveListId(String(list.id))}
              onLongPress={() => {
                Alert.alert(list.name, undefined, [
                  { text: 'Editar', onPress: () => router.push(`/edit-list/${list.id}` as never) },
                  { text: 'Excluir', style: 'destructive', onPress: () => handleListLongPress(list) },
                  { text: 'Cancelar', style: 'cancel' },
                ]);
              }}
              delayLongPress={400}
            >
              {list.icon ? <Text style={styles.listTabIcon}>{list.icon}</Text> : null}
              <Text style={[styles.listTabText, { color: isActive ? '#FFFFFF' : theme.colors.textSecondary }]}>{list.name}</Text>
            </Pressable>
          );
        })}
        <Pressable
          style={[styles.listTab, styles.actionTab, { borderColor: Colors.primary + '60' }]}
          onPress={() => router.push('/create-list' as never)}
        >
          <Text style={[styles.listTabText, { color: Colors.primary }]}>+ Nova lista</Text>
        </Pressable>
        <Pressable
          style={[styles.listTab, styles.actionTab, { borderColor: theme.colors.border }]}
          onPress={() => router.push('/edit-lists' as never)}
        >
          <Text style={styles.editIcon}>✏️</Text>
          <Text style={[styles.listTabText, { color: theme.colors.textSecondary }]}>Editar listas</Text>
        </Pressable>
      </ScrollView>

      {isSearching && (
        <View style={{ paddingHorizontal: Spacing[4], paddingBottom: Spacing[2] }}>
          <Text style={{ color: theme.colors.textSecondary, fontSize: 13 }}>
            {tasks.length} resultado{tasks.length !== 1 ? 's' : ''} para "{debouncedSearch}"
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ReorderableList
        data={rows}
        keyExtractor={(row) => (row.kind === 'completed-header' ? COMPLETED_HEADER_KEY : row.task.id)}
        ListHeaderComponent={ListHeader}
        // Arraste por long-press (220ms) ativado por célula (ver ReorderableTaskCell)
        // — só nas pendentes. O pan padrão da lib segue o dedo após o long-press.
        dragEnabled={showReorder}
        onReorder={handleReorder}
        // Item arrastado: leve escala + sombra + fundo destacado (cor) — ver REORDER_CELL_ANIMATIONS.
        cellAnimations={REORDER_CELL_ANIMATIONS}
        // Realce de destino: um "slot" suave (sem listra) na posição onde o item cairá.
        renderDropIndicator={renderDropIndicator}
        autoscrollThreshold={0.12}
        renderItem={({ item: row, index }) => {
          if (row.kind === 'completed-header') {
            return <CompletedSectionHeader count={row.count} expanded={showCompleted} onToggle={toggleShowCompleted} />;
          }
          const item = row.task;
          // Sem separador no último item nem na última tarefa antes do cabeçalho
          // "Concluídas".
          const next = rows[index + 1];
          const isLast = !next || next.kind === 'completed-header';
          const onToggle = () => {
            const newStatus = item.status === 'completed' ? 'not_started' : 'completed';
            toggleStatus.mutate({ id: item.id, status: newStatus });
          };
          const onPress = () => router.push(`/task/${item.id}` as never);
          const onFavorite = () => toggleFav.mutate({ id: item.id, isFavorite: !item.isFavorite });
          const onDelete = () => handleDelete(item.id, item.title);

          // Pendentes (índices 0..pendingCount-1) ficam arrastáveis quando elegível.
          // O highlight do item ativo (cor) vem de cellAnimations.
          if (showReorder && item.status !== 'completed' && index < pendingCount) {
            return (
              <ReorderableTaskCell
                task={item}
                onToggle={onToggle}
                onPress={onPress}
                onFavorite={onFavorite}
                onDelete={onDelete}
              />
            );
          }

          return (
            <TaskItemSwipeable
              task={item}
              isLast={isLast}
              onToggle={onToggle}
              onPress={onPress}
              onFavorite={onFavorite}
              onDelete={onDelete}
            />
          );
        }}
        contentContainerStyle={tasks.length === 0 ? styles.emptyOuter : styles.list}
        ListEmptyComponent={
          isLoading ? null : (
            <EmptyState
              icon="✅"
              title="Nenhuma tarefa"
              description={isSearching ? 'Nenhum resultado para a busca' : 'Crie sua primeira tarefa para começar'}
              actionLabel={isSearching ? undefined : '+ Nova tarefa'}
              onAction={isSearching ? undefined : () => router.push('/create-task' as never)}
            />
          )
        }
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
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
                <Text style={[styles.quickAddSend, { color: Colors.primary }]}>
                  {createTask.isPending ? '...' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.fab, { backgroundColor: Colors.primary }]}
            onPress={() => router.push('/create-task' as never)}
            activeOpacity={0.85}
          >
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },

  // Header
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  greetingBlock: { flex: 1 },
  greetingRow: { flexDirection: 'row', alignItems: 'center' },
  greetingText: { fontSize: 18, fontWeight: '700', lineHeight: 24 },
  greetingSubtitle: { fontSize: 13, marginTop: 2 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minWidth: 140,
    maxWidth: 160,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  // Stat cards — fixed row, fills full width
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[1],
    borderRadius: Radius.lg,
    gap: 3,
  },
  statCount: { fontSize: 22, fontWeight: '700', lineHeight: 26 },
  statLabel: { fontSize: 10, fontWeight: '500', textAlign: 'center' },

  // List tabs
  listTabsScroll: { flexGrow: 0 },
  listTabsContent: { paddingHorizontal: Spacing[4], paddingVertical: 10, gap: 8, flexDirection: 'row' },
  listTab: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, gap: 4 },
  focusTab: { borderWidth: 1.5 },
  listTabIcon: { fontSize: 13 },
  listTabText: { fontSize: 13, fontWeight: '500' },
  actionTab: { borderStyle: 'dashed' },
  editIcon: { fontSize: 13 },

  // Reorder (arraste) — "slot" suave (cor + contorno tracejado) no destino.
  dropIndicator: {
    flex: 1,
    marginHorizontal: Spacing[3],
    marginVertical: Spacing[1],
    borderRadius: 12,
    backgroundColor: Colors.primary + '12',
    borderWidth: 1.5,
    borderColor: Colors.primary + '55',
    borderStyle: 'dashed',
  },

  // Task list
  list: { paddingBottom: 96 },
  emptyOuter: { flexGrow: 1 },
  deleteAction: { backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', width: 80 },
  deleteActionText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  // Quick-add bottom bar + FAB
  bottomBarWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  quickAddBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, borderRadius: 24, borderWidth: 1, paddingHorizontal: 16, elevation: 4, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 6 },
  quickAddInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  quickAddSend: { fontSize: 14, fontWeight: '600' },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  fabIcon: { color: '#FFFFFF', fontSize: 28, lineHeight: 32, fontWeight: '400' },
});
