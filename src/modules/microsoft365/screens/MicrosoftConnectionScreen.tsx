import React, { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '../../../hooks/use-theme';
import { Text, Button } from '../../../components/ui';
import { Colors } from '../../../constants/colors';
import { Spacing, Radius } from '../../../constants/spacing';
import { useAuthStore } from '../../../store/auth-store';
import {
  useMicrosoftAccount,
  useMicrosoft365Items,
  useMicrosoftConnect,
  useMicrosoftDisconnect,
  useMicrosoftSync,
} from '../hooks';
import {
  MicrosoftAccountCard,
  MicrosoftConnectButton,
  MicrosoftEmailItem,
  MicrosoftTaskItem,
} from '../components';
import type { SyncStatus } from '../types';

export function MicrosoftConnectionScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);

  const connectionQuery = useMicrosoftAccount();
  const emailsQuery = useMicrosoft365Items('EMAIL');
  const tasksQuery = useMicrosoft365Items('TODO_TASK');

  const connectMutation = useMicrosoftConnect();
  const disconnectMutation = useMicrosoftDisconnect();
  const syncMutation = useMicrosoftSync();

  const state = connectionQuery.data;
  const isConnected = state?.isConnected ?? false;

  const syncStatus: SyncStatus = useMemo(() => {
    if (syncMutation.isPending) return 'syncing';
    if (syncMutation.isError) return 'error';
    if (syncMutation.isSuccess) return 'success';
    return 'idle';
  }, [syncMutation.isPending, syncMutation.isError, syncMutation.isSuccess]);

  function handleConnect() {
    const userId = user ? String(user.id) : 'local';
    connectMutation.mutate(userId, {
      onError: () =>
        Alert.alert('Erro', 'Não foi possível conectar a conta Microsoft. Tente novamente.'),
    });
  }

  function handleSync() {
    syncMutation.mutate(undefined, {
      // syncNow não lança: retorna SyncResult com `error` quando algo falha
      // (inclui o código real do Graph p/ diagnóstico, ex.: HTTP 403).
      onSuccess: (result) => {
        if (result?.error) {
          Alert.alert(
            result.status === 'error' ? 'Falha ao sincronizar' : 'Sincronizado parcialmente',
            result.error,
          );
        }
      },
      onError: () => Alert.alert('Erro', 'Falha ao sincronizar. Tente novamente.'),
    });
  }

  function handleDisconnect() {
    Alert.alert(
      'Desconectar Conta',
      'O que deseja fazer com os dados já sincronizados neste dispositivo?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover dados sincronizados',
          style: 'destructive',
          onPress: () => disconnectMutation.mutate(true),
        },
        {
          text: 'Manter histórico local',
          onPress: () => disconnectMutation.mutate(false),
        },
      ],
    );
  }

  const emails = emailsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: theme.colors.background }]}
      edges={['top']}
    >
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text variant="body" style={{ color: Colors.primary }}>
            ‹ Voltar
          </Text>
        </TouchableOpacity>
        <Text variant="callout" weight="semibold">
          Microsoft 365
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!isConnected ? (
          <View style={styles.disconnected}>
            <Text style={styles.heroIcon}>🔗</Text>
            <Text variant="title" weight="bold" style={styles.heroTitle}>
              Microsoft 365
            </Text>
            <Text variant="body" secondary style={styles.heroText}>
              Conecte sua conta Microsoft para sincronizar tarefas e emails sinalizados.
            </Text>
            <View style={styles.connectBtn}>
              <MicrosoftConnectButton
                onPress={handleConnect}
                loading={connectMutation.isPending}
              />
            </View>
            <Text variant="caption" tertiary style={styles.note}>
              Somente leitura. O app nunca altera dados na sua conta Microsoft.
            </Text>
          </View>
        ) : (
          <View style={styles.connected}>
            {state?.account ? (
              <MicrosoftAccountCard
                account={state.account}
                emailCount={state.emailCount}
                taskCount={state.taskCount}
                status={syncStatus}
              />
            ) : null}

            <View style={styles.actions}>
              <Button
                title="Sincronizar Agora"
                onPress={handleSync}
                loading={syncMutation.isPending}
                size="md"
              />
              <Button
                title="Desconectar Conta"
                onPress={handleDisconnect}
                variant="danger"
                loading={disconnectMutation.isPending}
                size="md"
              />
            </View>

            {emails.length > 0 ? (
              <View style={styles.section}>
                <Text variant="label" secondary style={styles.sectionTitle}>
                  E-MAILS SINALIZADOS
                </Text>
                <View style={styles.list}>
                  {emails.map((item) => (
                    <MicrosoftEmailItem key={item.id} item={item} />
                  ))}
                </View>
              </View>
            ) : null}

            {tasks.length > 0 ? (
              <View style={styles.section}>
                <Text variant="label" secondary style={styles.sectionTitle}>
                  MICROSOFT TO DO
                </Text>
                <View style={styles.list}>
                  {tasks.map((item) => (
                    <MicrosoftTaskItem key={item.id} item={item} />
                  ))}
                </View>
              </View>
            ) : null}

            {emails.length === 0 && tasks.length === 0 ? (
              <Text variant="body" secondary style={styles.empty}>
                Nenhum item sincronizado ainda. Toque em "Sincronizar Agora".
              </Text>
            ) : null}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scroll: { padding: Spacing[4], gap: Spacing[4], paddingBottom: Spacing[12] },
  disconnected: { alignItems: 'center', paddingVertical: Spacing[8], gap: Spacing[2] },
  heroIcon: { fontSize: 56, marginBottom: Spacing[2] },
  heroTitle: { textAlign: 'center' },
  heroText: {
    textAlign: 'center',
    lineHeight: 22,
    marginTop: Spacing[1],
    paddingHorizontal: Spacing[2],
  },
  connectBtn: { alignSelf: 'stretch', marginTop: Spacing[6] },
  note: { textAlign: 'center', marginTop: Spacing[4], paddingHorizontal: Spacing[4] },
  connected: { gap: Spacing[4] },
  actions: { gap: Spacing[3] },
  section: { gap: Spacing[2] },
  sectionTitle: { letterSpacing: 0.6, marginTop: Spacing[2] },
  list: { gap: Spacing[2] },
  empty: { textAlign: 'center', paddingVertical: Spacing[6] },
});
