import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from '../../../components/ui';
import { useTheme } from '../../../hooks/use-theme';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import type { Microsoft365Item } from '../types';

interface Props {
  item: Microsoft365Item;
}

function priorityColor(priority: string | null): string {
  switch (priority) {
    case 'high':
      return Colors.priorityHigh;
    case 'low':
      return Colors.priorityLow;
    default:
      return Colors.priorityNormal;
  }
}

function statusLabel(status: string | null): string {
  switch (status) {
    case 'completed':
      return 'Concluída';
    case 'inProgress':
      return 'Em andamento';
    case 'notStarted':
      return 'Não iniciada';
    default:
      return status ?? '—';
  }
}

function formatDue(due: string | null): string | null {
  if (!due) return null;
  const d = new Date(due);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Linha de tarefa do Microsoft To Do (read-only). */
export function MicrosoftTaskItem({ item }: Props) {
  const { theme } = useTheme();
  const completed = item.status === 'completed';
  const due = formatDue(item.dueDate);

  return (
    <Card padding={3}>
      <View style={styles.row}>
        <View style={[styles.priorityBar, { backgroundColor: priorityColor(item.priority) }]} />
        <View style={{ flex: 1 }}>
          <Text
            variant="callout"
            numberOfLines={2}
            style={{
              color: completed ? theme.colors.textTertiary : theme.colors.text,
              textDecorationLine: completed ? 'line-through' : 'none',
            }}
          >
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <Text variant="caption" secondary>
              {statusLabel(item.status)}
            </Text>
            {due ? (
              <Text variant="caption" style={{ color: theme.colors.textTertiary }}>
                · Vence {due}
              </Text>
            ) : null}
          </View>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  priorityBar: { width: 4, alignSelf: 'stretch', borderRadius: 2, minHeight: 32 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1], marginTop: Spacing[1] },
});
