import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from '../../../components/ui';
import { useTheme } from '../../../hooks/use-theme';
import { Colors } from '../../../constants/colors';
import { Spacing, Radius } from '../../../constants/spacing';
import { MicrosoftSyncStatus } from './MicrosoftSyncStatus';
import type { MicrosoftAccount, SyncStatus } from '../types';

interface Props {
  account: MicrosoftAccount;
  emailCount: number;
  status: SyncStatus;
}

function Stat({ value, label }: { value: number; label: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.stat}>
      <Text variant="title" weight="bold" style={{ color: theme.colors.text }}>
        {value}
      </Text>
      <Text variant="caption" secondary>
        {label}
      </Text>
    </View>
  );
}

/** Card com identidade da conta, contadores e status de sincronização. */
export function MicrosoftAccountCard({ account, emailCount, status }: Props) {
  const { theme } = useTheme();
  const initials = account.displayName
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials || 'M'}</Text>
        </View>
        <View style={styles.identity}>
          <Text variant="callout" weight="semibold" numberOfLines={1}>
            {account.displayName}
          </Text>
          <Text variant="caption" secondary numberOfLines={1}>
            {account.email}
          </Text>
        </View>
      </View>

      <View style={[styles.statsRow, { borderColor: theme.colors.border }]}>
        <Stat value={emailCount} label="E-mails sinalizados" />
      </View>

      <MicrosoftSyncStatus status={status} lastSyncAt={account.lastSyncAt} />
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  identity: { flex: 1, gap: 2 },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: Spacing[4],
    paddingVertical: Spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  stat: { alignItems: 'center', flex: 1, gap: 2 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});
