import React, { useEffect } from 'react';
import {
  ScrollView,
  View,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '@/store/task-store';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import type { Task } from '@/domain/entities';

// ─── Greeting ──────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ─── StatCard ──────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  count: number;
  color: string;
}

function StatCard({ label, count, color }: StatCardProps) {
  const { theme } = useTheme();
  return (
    <Card style={[styles.statCard, { flex: 1 }]}>
      <Text
        style={[styles.statCount, { color }]}
      >
        {count}
      </Text>
      <Text variant="label" secondary style={styles.statLabel}>
        {label}
      </Text>
    </Card>
  );
}

// ─── TaskRow ───────────────────────────────────────────────────────────────

interface TaskRowProps {
  task: Task;
  onPress: (id: string) => void;
  onToggle: (id: string) => void;
}

function TaskRow({ task, onPress, onToggle }: TaskRowProps) {
  const { theme } = useTheme();

  const priorityColor: Record<string, string> = {
    low: Colors.priorityLow,
    normal: Colors.priorityNormal,
    high: Colors.priorityHigh,
    critical: Colors.priorityCritical,
  };

  const isCompleted = task.status === 'completed';

  return (
    <TouchableOpacity
      onPress={() => onPress(task.id)}
      activeOpacity={0.7}
      style={[
        styles.taskRow,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
      ]}
    >
      {/* Priority dot */}
      <View
        style={[
          styles.priorityDot,
          { backgroundColor: priorityColor[task.priority] ?? Colors.priorityNormal },
        ]}
      />

      <View style={styles.taskInfo}>
        <Text
          variant="body"
          style={[
            isCompleted && styles.strikethrough,
            { color: isCompleted ? theme.colors.textTertiary : theme.colors.text },
          ]}
          numberOfLines={1}
        >
          {task.title}
        </Text>
        {task.dueDate && (
          <Text variant="caption" secondary style={{ marginTop: 2 }}>
            {formatDate(task.dueDate)}
          </Text>
        )}
      </View>

      <TouchableOpacity
        onPress={() => onToggle(task.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={[
          styles.toggleBtn,
          {
            borderColor: isCompleted ? Colors.success : theme.colors.border,
            backgroundColor: isCompleted ? Colors.success : 'transparent',
          },
        ]}
      >
        {isCompleted && (
          <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
        )}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── TaskSection ───────────────────────────────────────────────────────────

interface TaskSectionProps {
  title: string;
  tasks: Task[];
  accentColor?: string;
  onTaskPress: (id: string) => void;
  onToggle: (id: string) => void;
  emptyMessage?: string;
}

function TaskSection({
  title,
  tasks,
  accentColor,
  onTaskPress,
  onToggle,
  emptyMessage,
}: TaskSectionProps) {
  const { theme } = useTheme();

  if (tasks.length === 0 && !emptyMessage) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        {accentColor && (
          <View style={[styles.sectionAccent, { backgroundColor: accentColor }]} />
        )}
        <Text variant="headline" weight="semibold">
          {title}
        </Text>
        <View
          style={[
            styles.sectionCount,
            { backgroundColor: accentColor ?? theme.colors.surface },
          ]}
        >
          <Text
            variant="label"
            style={{ color: accentColor ? '#fff' : theme.colors.textSecondary }}
          >
            {tasks.length}
          </Text>
        </View>
      </View>

      {tasks.length === 0 && emptyMessage ? (
        <Text variant="body" secondary style={styles.emptyMessage}>
          {emptyMessage}
        </Text>
      ) : (
        <View style={styles.taskList}>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onPress={onTaskPress}
              onToggle={onToggle}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Utils ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / 86400000);

  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff < -1) return `${Math.abs(diff)} dias atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

// ─── DashboardScreen ───────────────────────────────────────────────────────

export default function DashboardScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { tasks, isLoading, loadAll, toggleComplete } = useTaskStore();

  useEffect(() => {
    loadAll();
  }, []);

  // Derived task lists
  const todayStr = new Date().toISOString().split('T')[0];

  const todayTasks = tasks.filter(
    (t) => t.dueDate === todayStr && t.status !== 'completed'
  );
  const overdueTasks = tasks.filter(
    (t) => t.dueDate && t.dueDate < todayStr && t.status !== 'completed'
  );
  const completedToday = tasks.filter(
    (t) => t.completedAt?.startsWith(todayStr)
  );
  const upcomingTasks = tasks
    .filter((t) => t.dueDate && t.dueDate > todayStr && t.status !== 'completed')
    .slice(0, 5);

  function handleTaskPress(id: string) {
    router.push(`/task/${id}`);
  }

  function handleToggle(id: string) {
    toggleComplete(id);
  }

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadAll}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text variant="headline" weight="semibold">
              {getGreeting()} 👋
            </Text>
            <Text variant="caption" secondary style={{ marginTop: 2 }}>
              {todayTasks.length > 0
                ? `${todayTasks.length} tarefa${todayTasks.length !== 1 ? 's' : ''} para hoje`
                : 'Sem tarefas para hoje'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => router.push('/create-task')}
            style={[styles.fab, { backgroundColor: Colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.fabIcon}>+</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stat cards ── */}
        <View style={styles.statsRow}>
          <StatCard label="Hoje" count={todayTasks.length} color={Colors.primary} />
          <StatCard label="Atrasadas" count={overdueTasks.length} color={Colors.danger} />
          <StatCard label="Concluídas" count={completedToday.length} color={Colors.success} />
          <StatCard label="Próximas" count={upcomingTasks.length} color={Colors.warning} />
        </View>

        {/* ── Overdue (highlighted) ── */}
        {overdueTasks.length > 0 && (
          <TaskSection
            title="Atrasadas"
            tasks={overdueTasks}
            accentColor={Colors.danger}
            onTaskPress={handleTaskPress}
            onToggle={handleToggle}
          />
        )}

        {/* ── Today ── */}
        <TaskSection
          title="Hoje"
          tasks={todayTasks}
          accentColor={Colors.primary}
          onTaskPress={handleTaskPress}
          onToggle={handleToggle}
          emptyMessage="Nenhuma tarefa para hoje. Aproveite o dia! 🎉"
        />

        {/* ── Upcoming ── */}
        {upcomingTasks.length > 0 && (
          <TaskSection
            title="Próximas"
            tasks={upcomingTasks}
            onTaskPress={handleTaskPress}
            onToggle={handleToggle}
          />
        )}

        {/* ── All empty state ── */}
        {tasks.length === 0 && !isLoading && (
          <EmptyState
            title="Comece agora!"
            description="Você não tem nenhuma tarefa ainda. Crie sua primeira tarefa e seja produtivo."
            icon="✨"
            actionLabel="Criar tarefa"
            onAction={() => router.push('/create-task')}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  scroll: {
    padding: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[6],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  fabIcon: {
    color: '#FFFFFF',
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    lineHeight: FontSize.xl + 2,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  statCard: {
    alignItems: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    gap: Spacing[1],
  },
  statCount: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    lineHeight: FontSize['2xl'] + 4,
  },
  statLabel: {
    textAlign: 'center',
  },
  section: {
    gap: Spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  sectionAccent: {
    width: 4,
    height: 18,
    borderRadius: 2,
  },
  sectionCount: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    marginLeft: 'auto',
  },
  taskList: {
    gap: Spacing[2],
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing[3],
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  taskInfo: {
    flex: 1,
  },
  strikethrough: {
    textDecorationLine: 'line-through',
  },
  toggleBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyMessage: {
    paddingVertical: Spacing[4],
    textAlign: 'center',
  },
});
