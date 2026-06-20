import React, { useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '@/store/task-store';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import type { Task } from '@/domain/entities';

const PRIORITY_COLORS: Record<Task['priority'], string> = {
  low: Colors.priorityLow,
  normal: Colors.priorityNormal,
  high: Colors.priorityHigh,
  critical: Colors.priorityCritical,
};

function formatDueDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  if (dateStr === today) return 'Hoje';
  if (dateStr === tomorrow) return 'Amanhã';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}`;
}

interface SearchResultItemProps {
  task: Task;
  query: string;
  onPress: (id: string) => void;
}

function SearchResultItem({ task, query, onPress }: SearchResultItemProps) {
  const { theme } = useTheme();
  const isCompleted = task.status === 'completed';

  // Highlight matched text
  function highlight(text: string): React.ReactNode {
    if (!query) return <Text variant="body">{text}</Text>;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return <Text variant="body">{text}</Text>;

    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);

    return (
      <Text variant="body">
        {before}
        <Text variant="body" style={{ backgroundColor: Colors.primaryLight, color: Colors.primaryDark }}>
          {match}
        </Text>
        {after}
      </Text>
    );
  }

  return (
    <Pressable
      onPress={() => onPress(task.id)}
      style={[
        styles.resultItem,
        {
          backgroundColor: theme.colors.surfaceElevated,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.priorityBar,
          { backgroundColor: PRIORITY_COLORS[task.priority] },
        ]}
      />

      <View style={styles.resultContent}>
        <View style={styles.titleRow}>
          {highlight(task.title)}
          {isCompleted && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: Colors.success },
              ]}
            >
              <Text variant="label" style={{ color: '#fff' }}>
                Concluída
              </Text>
            </View>
          )}
        </View>

        {task.description ? (
          <Text
            variant="caption"
            secondary
            numberOfLines={1}
            style={{ marginTop: 2 }}
          >
            {task.description}
          </Text>
        ) : null}

        {task.dueDate && (
          <Text
            variant="caption"
            style={{
              marginTop: 4,
              color:
                task.dueDate < new Date().toISOString().split('T')[0] && !isCompleted
                  ? Colors.danger
                  : theme.colors.textTertiary,
            }}
          >
            {formatDueDate(task.dueDate)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

export default function SearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { tasks } = useTaskStore();
  const [query, setQuery] = useState('');

  const results = useCallback(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description?.toLowerCase().includes(q) ?? false)
    );
  }, [tasks, query])();

  const hasQuery = query.trim().length > 0;

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <Text variant="title" weight="bold">
          Busca
        </Text>
      </View>

      {/* Search input */}
      <View style={styles.searchContainer}>
        <Input
          placeholder="Buscar tarefas..."
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
          leftIcon={
            <Text style={{ fontSize: 16 }}>🔍</Text>
          }
          containerStyle={{ flex: 1 }}
        />
        {hasQuery && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            style={styles.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="caption" style={{ color: Colors.primary }}>
              Limpar
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Results */}
      {!hasQuery ? (
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderEmoji}>🔍</Text>
          <Text variant="headline" weight="semibold" style={styles.placeholderTitle}>
            Buscar tarefas
          </Text>
          <Text variant="body" secondary style={styles.placeholderSub}>
            Digite para buscar por título ou descrição
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(t) => t.id}
          renderItem={({ item }) => (
            <SearchResultItem
              task={item}
              query={query}
              onPress={(id) => router.push(`/task/${id}`)}
            />
          )}
          contentContainerStyle={
            results.length === 0 ? styles.emptyContainer : styles.listContent
          }
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <EmptyState
              title="Nenhum resultado"
              description={`Não encontramos tarefas com "${query}"`}
              icon="😕"
            />
          }
          ListHeaderComponent={
            results.length > 0 ? (
              <Text variant="caption" secondary style={styles.resultCount}>
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  clearBtn: {
    paddingHorizontal: Spacing[2],
  },
  listContent: {
    padding: Spacing[4],
    paddingBottom: Spacing[8],
    gap: Spacing[2],
  },
  emptyContainer: {
    flex: 1,
  },
  resultCount: {
    marginBottom: Spacing[3],
  },
  resultItem: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    marginBottom: Spacing[2],
  },
  priorityBar: {
    width: 4,
    flexShrink: 0,
  },
  resultContent: {
    flex: 1,
    padding: Spacing[3],
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: Spacing[1.5],
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  placeholderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    gap: Spacing[2],
  },
  placeholderEmoji: {
    fontSize: 48,
    marginBottom: Spacing[2],
  },
  placeholderTitle: {
    textAlign: 'center',
  },
  placeholderSub: {
    textAlign: 'center',
    lineHeight: 22,
  },
});
