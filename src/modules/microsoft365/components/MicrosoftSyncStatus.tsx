import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from '../../../components/ui';
import { useTheme } from '../../../hooks/use-theme';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import type { SyncStatus } from '../types';

interface Props {
  status: SyncStatus;
  lastSyncAt: number | null;
}

function statusColor(status: SyncStatus): string {
  switch (status) {
    case 'syncing':
      return Colors.info;
    case 'success':
      return Colors.success;
    case 'error':
      return Colors.danger;
    default:
      return Colors.priorityLow;
  }
}

function statusLabel(status: SyncStatus): string {
  switch (status) {
    case 'syncing':
      return 'Sincronizando…';
    case 'success':
      return 'Sincronizado';
    case 'error':
      return 'Erro na sincronização';
    default:
      return 'Aguardando';
  }
}

function formatLastSync(ts: number | null): string {
  if (!ts) return 'Nunca sincronizado';
  const d = new Date(ts);
  return `Última sincronização: ${d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Pílula de status + texto "última sincronização". */
export function MicrosoftSyncStatus({ status, lastSyncAt }: Props) {
  const { theme } = useTheme();
  const color = statusColor(status);
  return (
    <View style={styles.container}>
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: color }]} />
        <Text variant="caption" weight="medium" style={{ color }}>
          {statusLabel(status)}
        </Text>
      </View>
      <Text variant="caption" style={{ color: theme.colors.textTertiary }}>
        {formatLastSync(lastSyncAt)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing[1] },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
