import React, { useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import { useAuthStore } from '@/store/auth-store';
import { useProfile, useUpdateProfile } from '@/hooks/api/use-profile';
import { useTimezone } from '@/hooks/use-timezone';
import { timezoneLabel, formatOffset } from '@/utils/timezone';
import { TimezoneSheet } from '@/components/profile/TimezoneSheet';
import { APP_VERSION } from '@/lib/config';
import { checkAndApplyUpdate, getUpdateInfo } from '@/lib/updates';

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{initials || '?'}</Text>
    </View>
  );
}

function RowItem({
  icon,
  label,
  value,
  onPress,
  danger,
}: {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  danger?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: theme.colors.border }]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowContent}>
        <Text
          variant="body"
          style={{ color: danger ? Colors.danger : theme.colors.text }}
        >
          {label}
        </Text>
        {value ? (
          <Text variant="caption" secondary numberOfLines={1}>{value}</Text>
        ) : null}
      </View>
      {onPress && !danger ? (
        <Text style={{ color: theme.colors.textTertiary, fontSize: 18 }}>›</Text>
      ) : null}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { data: profile } = useProfile();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [showTzSheet, setShowTzSheet] = useState(false);
  const currentTz = useTimezone();
  const updateProfile = useUpdateProfile();

  function handleSelectTz(id: string) {
    setShowTzSheet(false);
    if (id !== currentTz) {
      updateProfile.mutate(
        { timezone: id },
        { onError: () => Alert.alert('Erro', 'Não foi possível alterar o fuso horário.') },
      );
    }
  }

  const updateInfo = getUpdateInfo();
  const shortBuild = updateInfo.updateId ? updateInfo.updateId.slice(0, 7) : null;
  const versionLabel = shortBuild && !updateInfo.isEmbedded
    ? `v${APP_VERSION} • build ${shortBuild}`
    : `v${APP_VERSION}`;

  async function handleCheckUpdate() {
    setCheckingUpdate(true);
    const result = await checkAndApplyUpdate();
    setCheckingUpdate(false);
    if (result.status === 'up-to-date') {
      Alert.alert('Atualizado', 'Você já está usando a versão mais recente.');
    } else if (result.status === 'error') {
      Alert.alert('Erro', 'Não foi possível verificar atualizações. Tente novamente.');
    } else if (result.status === 'skipped') {
      Alert.alert('Desenvolvimento', 'Atualizações OTA são aplicadas apenas em produção.');
    }
  }

  const displayName = profile?.name ?? user?.name ?? '';
  const displayEmail = profile?.email ?? user?.email ?? '';

  function handleLogout() {
    Alert.alert('Sair', 'Deseja encerrar sua sessão?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: logout },
    ]);
  }

  function formatDate(iso: string | null | undefined) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headline" weight="semibold">Perfil</Text>
        </View>

        {/* Avatar + nome */}
        <View style={styles.heroSection}>
          <Avatar name={displayName} />
          <Text variant="title" weight="bold" style={{ marginTop: Spacing[3] }}>
            {displayName || '—'}
          </Text>
          <Text variant="callout" secondary style={{ marginTop: Spacing[1] }}>
            {displayEmail}
          </Text>
          {profile?.created_at && (
            <Text variant="caption" secondary style={{ marginTop: Spacing[1] }}>
              Membro desde {formatDate(profile.created_at)}
            </Text>
          )}
        </View>

        {/* Conta */}
        <Card style={styles.section}>
          <Text variant="label" secondary style={styles.sectionTitle}>CONTA</Text>
          <RowItem
            icon="✏️"
            label="Editar perfil"
            value="Nome e e-mail"
            onPress={() => router.push('/edit-profile' as never)}
          />
          <RowItem
            icon="🔒"
            label="Alterar senha"
            onPress={() => router.push('/change-password' as never)}
          />
        </Card>

        {/* Preferências */}
        <Card style={styles.section}>
          <Text variant="label" secondary style={styles.sectionTitle}>PREFERÊNCIAS</Text>
          <RowItem
            icon="🌎"
            label="Fuso horário"
            value={`${timezoneLabel(currentTz)} (${formatOffset(currentTz)})`}
            onPress={() => setShowTzSheet(true)}
          />
        </Card>

        {/* Integrações */}
        <Card style={styles.section}>
          <Text variant="label" secondary style={styles.sectionTitle}>INTEGRAÇÕES</Text>
          <RowItem
            icon="🪟"
            label="Microsoft 365"
            value="Tarefas e e-mails sinalizados"
            onPress={() => router.push('/microsoft365' as never)}
          />
          <RowItem
            icon="📆"
            label="CalDAV"
            value="Calendário e Lembretes (iPhone, Android)"
            onPress={() => router.push('/caldav' as never)}
          />
        </Card>

        {/* Info */}
        <Card style={styles.section}>
          <Text variant="label" secondary style={styles.sectionTitle}>INFORMAÇÕES</Text>
          <RowItem icon="📧" label="E-mail" value={displayEmail} />
          <RowItem icon="🆔" label="ID do usuário" value={`#${profile?.id ?? user?.id ?? '—'}`} />
        </Card>

        {/* Sair */}
        <Card style={styles.section}>
          <RowItem
            icon="🚪"
            label="Sair da conta"
            onPress={handleLogout}
            danger
          />
        </Card>

        {/* Versão */}
        <Card style={[styles.section, { marginBottom: Spacing[8] }]}>
          <Text variant="label" secondary style={styles.sectionTitle}>VERSÃO DO APP</Text>
          <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
            <Text style={styles.rowIcon}>📱</Text>
            <View style={styles.rowContent}>
              <Text variant="body" style={{ color: theme.colors.text }}>Versão atual</Text>
              <Text variant="caption" secondary>{versionLabel}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: theme.colors.border }]}
            onPress={handleCheckUpdate}
            disabled={checkingUpdate}
            activeOpacity={0.6}
          >
            <Text style={styles.rowIcon}>🔄</Text>
            <View style={styles.rowContent}>
              <Text variant="body" style={{ color: Colors.primary }}>
                Verificar atualização
              </Text>
            </View>
            {checkingUpdate
              ? <ActivityIndicator size="small" color={Colors.primary} />
              : <Text style={{ color: theme.colors.textTertiary, fontSize: 18 }}>›</Text>
            }
          </TouchableOpacity>
        </Card>
      </ScrollView>
      <TimezoneSheet
        visible={showTzSheet}
        currentTz={currentTz}
        onSelect={handleSelectTz}
        onClose={() => setShowTzSheet(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing[4], gap: Spacing[4] },
  header: { paddingVertical: Spacing[2] },
  heroSection: {
    alignItems: 'center',
    paddingVertical: Spacing[6],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  avatarText: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold as '700',
    color: '#fff',
  },
  section: { gap: 0, padding: 0, overflow: 'hidden' },
  sectionTitle: {
    fontSize: FontSize.xs,
    letterSpacing: 0.6,
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    gap: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  rowContent: { flex: 1, gap: 2 },
});
