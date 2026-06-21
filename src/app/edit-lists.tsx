import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { useTaskLists, useUpdateTaskList, useArchiveTaskList } from '@/hooks/api/use-task-lists';
import { useFilterStore } from '@/store/filter-store';
import type { ApiTaskListFull } from '@/infrastructure/api/types';

export default function EditListsScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: remoteLists = [], refetch } = useTaskLists();
  const updateList = useUpdateTaskList();
  const archiveList = useArchiveTaskList();
  const { activeListId, setActiveListId } = useFilterStore();

  // Local copy for reordering before saving
  const [localLists, setLocalLists] = useState<ApiTaskListFull[]>([]);
  const [orderDirty, setOrderDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (remoteLists.length > 0) {
      setLocalLists([...remoteLists].sort((a, b) => a.position - b.position));
    }
  }, [remoteLists]);

  function moveUp(index: number) {
    if (index === 0) return;
    const next = [...localLists];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    setLocalLists(next);
    setOrderDirty(true);
  }

  function moveDown(index: number) {
    if (index === localLists.length - 1) return;
    const next = [...localLists];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    setLocalLists(next);
    setOrderDirty(true);
  }

  async function saveOrder() {
    setSaving(true);
    try {
      await Promise.all(
        localLists.map((list, idx) => {
          const original = remoteLists.find((r) => r.id === list.id);
          if (!original || original.position === idx) return Promise.resolve();
          return updateList.mutateAsync({ id: String(list.id), data: { position: idx } });
        })
      );
      setOrderDirty(false);
      await refetch();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a ordem.');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(list: ApiTaskListFull) {
    Alert.alert(
      'Excluir lista',
      `"${list.name}" e todas as suas tarefas serão removidas permanentemente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            if (activeListId === String(list.id)) setActiveListId(null);
            try {
              await archiveList.mutateAsync(String(list.id));
              setLocalLists((prev) => prev.filter((l) => l.id !== list.id));
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir a lista.');
            }
          },
        },
      ]
    );
  }

  const canSave = orderDirty && !saving;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text variant="body" style={{ color: Colors.primary }}>Voltar</Text>
        </TouchableOpacity>
        <Text variant="callout" weight="semibold">Gerenciar listas</Text>
        <TouchableOpacity
          onPress={saveOrder}
          disabled={!canSave}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text
            variant="body"
            weight="semibold"
            style={{ color: canSave ? Colors.primary : theme.colors.textTertiary }}
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </Text>
        </TouchableOpacity>
      </View>

      {orderDirty && (
        <View style={[styles.dirtyBanner, { backgroundColor: Colors.primary + '15' }]}>
          <Text variant="caption" style={{ color: Colors.primary }}>
            Ordem alterada. Toque "Salvar" para confirmar.
          </Text>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {localLists.length === 0 && (
          <View style={styles.empty}>
            <Text variant="body" secondary style={{ textAlign: 'center' }}>
              Nenhuma lista criada ainda.{'\n'}Crie sua primeira lista para organizar tarefas.
            </Text>
            <TouchableOpacity
              onPress={() => { router.back(); setTimeout(() => router.push('/create-list' as never), 100); }}
              style={[styles.createBtn, { backgroundColor: Colors.primary }]}
            >
              <Text variant="body" weight="semibold" style={{ color: '#fff' }}>+ Criar lista</Text>
            </TouchableOpacity>
          </View>
        )}

        {localLists.map((list, index) => (
          <View
            key={list.id}
            style={[styles.row, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}
          >
            {/* Color dot */}
            <View style={[styles.colorDot, { backgroundColor: list.color ?? Colors.primary }]}>
              {list.icon ? (
                <Text style={{ fontSize: 14 }}>{list.icon}</Text>
              ) : (
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>
                  {list.name.charAt(0).toUpperCase()}
                </Text>
              )}
            </View>

            {/* Name */}
            <Text variant="body" weight="semibold" style={{ flex: 1, color: theme.colors.text }} numberOfLines={1}>
              {list.name}
            </Text>

            {/* Actions */}
            <View style={styles.actions}>
              {/* Reorder arrows */}
              <View style={styles.reorderBtns}>
                <TouchableOpacity
                  onPress={() => moveUp(index)}
                  disabled={index === 0}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={styles.arrowBtn}
                >
                  <Text style={[styles.arrow, { color: index === 0 ? theme.colors.border : theme.colors.textSecondary }]}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => moveDown(index)}
                  disabled={index === localLists.length - 1}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  style={styles.arrowBtn}
                >
                  <Text style={[styles.arrow, { color: index === localLists.length - 1 ? theme.colors.border : theme.colors.textSecondary }]}>↓</Text>
                </TouchableOpacity>
              </View>

              {/* Edit */}
              <TouchableOpacity
                onPress={() => router.push(`/edit-list/${list.id}` as never)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[styles.actionBtn, { borderColor: theme.colors.border }]}
              >
                <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>Editar</Text>
              </TouchableOpacity>

              {/* Delete */}
              <TouchableOpacity
                onPress={() => handleDelete(list)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                style={[styles.actionBtn, { borderColor: Colors.danger + '40' }]}
              >
                <Text style={{ color: Colors.danger, fontSize: 13, fontWeight: '600' }}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
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
  dirtyBanner: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    alignItems: 'center',
  },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[8], gap: Spacing[2] },
  empty: { alignItems: 'center', gap: Spacing[4], paddingTop: Spacing[10] },
  createBtn: { paddingHorizontal: Spacing[6], paddingVertical: Spacing[3], borderRadius: Radius.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  reorderBtns: { flexDirection: 'column', alignItems: 'center', gap: 0 },
  arrowBtn: { paddingHorizontal: 4 },
  arrow: { fontSize: 16, fontWeight: '700', lineHeight: 20 },
  actionBtn: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 5,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
});
