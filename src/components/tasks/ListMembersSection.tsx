import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useTheme } from '@/hooks/use-theme';
import { useListMembers, useAddMember, useRemoveMember } from '@/hooks/api/use-task-lists';
import { ApiError } from '@/infrastructure/api/client';
import type { TaskListRole } from '@/infrastructure/api/types';

interface Props {
  listId: number;
  /** Papel do usuário atual nesta lista. Só admin pode convidar/remover. */
  currentUserRole: TaskListRole;
}

function friendlyAddError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 404) return 'Não encontramos um usuário com esse e-mail.';
    if (e.status === 422) return 'Esse usuário já é membro da lista.';
    return e.detail || 'Não foi possível convidar esse usuário.';
  }
  return 'Não foi possível convidar esse usuário.';
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ListMembersSection({ listId, currentUserRole }: Props) {
  const { theme } = useTheme();
  const { data: members = [], isLoading } = useListMembers(listId);
  const addMember = useAddMember(listId);
  const removeMember = useRemoveMember(listId);

  const [email, setEmail] = useState('');
  const isAdmin = currentUserRole === 'admin';
  const canInvite = isAdmin && EMAIL_RE.test(email.trim());

  async function handleInvite() {
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) return;
    try {
      await addMember.mutateAsync(value);
      setEmail('');
    } catch (e) {
      Alert.alert('Não foi possível convidar', friendlyAddError(e));
    }
  }

  function handleRemove(mobileUserId: number, name: string) {
    Alert.alert('Remover membro', `Remover ${name} desta lista?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeMember.mutateAsync(mobileUserId);
          } catch {
            Alert.alert('Erro', 'Não foi possível remover o membro.');
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text variant="label" style={styles.sectionLabel}>COMPARTILHAR / MEMBROS</Text>
        {members.length > 0 && (
          <Text variant="caption" secondary>👥 {members.length}</Text>
        )}
      </View>

      {isAdmin && (
        <View style={styles.inviteRow}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="E-mail do usuário"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.input, { color: theme.colors.text }]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={canInvite ? handleInvite : undefined}
            />
          </View>
          <Button
            title={addMember.isPending ? '...' : 'Convidar'}
            onPress={handleInvite}
            disabled={!canInvite || addMember.isPending}
            size="md"
          />
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing[3] }} />
      ) : members.length === 0 ? (
        <Text variant="caption" secondary>
          {isAdmin ? 'Convide alguém pelo e-mail para compartilhar esta lista.' : 'Nenhum outro membro.'}
        </Text>
      ) : (
        <View style={{ gap: Spacing[2] }}>
          {members.map((m) => (
            <View
              key={m.mobile_user_id}
              style={[styles.memberRow, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: Colors.primary }]}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>
                  {(m.name || m.email).charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="body" weight="semibold" numberOfLines={1}>{m.name || m.email}</Text>
                <Text variant="caption" secondary numberOfLines={1}>{m.email}</Text>
              </View>
              <View style={[styles.roleBadge, { backgroundColor: m.role === 'admin' ? Colors.primary + '20' : theme.colors.surface }]}>
                <Text variant="caption" style={{ color: m.role === 'admin' ? Colors.primary : theme.colors.textSecondary }}>
                  {m.role === 'admin' ? 'Admin' : 'Membro'}
                </Text>
              </View>
              {isAdmin && m.role !== 'admin' && (
                <TouchableOpacity
                  onPress={() => handleRemove(m.mobile_user_id, m.name || m.email)}
                  disabled={removeMember.isPending}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={{ color: Colors.danger, fontSize: 13 }}>Remover</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing[2] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionLabel: { fontSize: FontSize.xs, letterSpacing: 0.6, color: '#9CA3AF', fontWeight: '500' },
  inviteRow: { flexDirection: 'row', gap: Spacing[2], alignItems: 'stretch' },
  inputWrapper: { flex: 1, borderRadius: Radius.md, borderWidth: 1.5, paddingHorizontal: Spacing[3], justifyContent: 'center' },
  input: { fontSize: FontSize.base, paddingVertical: Spacing[2.5] },
  memberRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.md, borderWidth: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  roleBadge: { paddingHorizontal: Spacing[2], paddingVertical: 2, borderRadius: Radius.full },
});
