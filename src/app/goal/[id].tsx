import React, { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CircularProgress } from '@/components/ui/CircularProgress';
import { QuickUpdateSheet } from '@/components/metas/QuickUpdateSheet';
import { CheckinHistory } from '@/components/metas/CheckinHistory';
import { categoryMeta } from '@/components/metas/categories';
import {
  useGoal,
  useDeleteGoal,
  useSetPrimaryGoal,
} from '@/hooks/api/use-goals';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { formatKpiValue, formatProgressPercent } from '@/utils/kpi-format';
import { progressColor } from '@/utils/progress-color';
import type { ApiKeyResultSummary } from '@/infrastructure/api/goal-types';

function formatPrazo(endDate: string | null): string {
  if (!endDate) return 'Sem prazo';
  const parts = endDate.split('-');
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  if (isNaN(d.getTime())) return 'Sem prazo';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function KeyResultRow({ kr, onUpdate }: { kr: ApiKeyResultSummary; onUpdate: () => void }) {
  const { theme } = useTheme();
  const color = progressColor(kr.progress);
  return (
    <Card padding={4}>
      <View style={styles.krHead}>
        <Text variant="callout" weight="semibold" style={{ flex: 1 }} numberOfLines={2}>
          {kr.title}
        </Text>
        <Text variant="callout" weight="bold" style={{ color }}>
          {formatProgressPercent(kr.progress)}
        </Text>
      </View>

      <View style={styles.krValues}>
        <Text variant="body" weight="semibold" style={{ color }}>
          {formatKpiValue(kr.current_value, kr.kpi_type, kr.unit)}
        </Text>
        <Text variant="caption" tertiary>
          / {formatKpiValue(kr.target_value, kr.kpi_type, kr.unit)}
        </Text>
      </View>

      <ProgressBar value={kr.progress} color={color} height={8} style={{ marginTop: Spacing[2] }} />

      <CheckinHistory krId={String(kr.id)} kpiType={kr.kpi_type} unit={kr.unit} />

      <TouchableOpacity
        style={[styles.updateBtn, { backgroundColor: Colors.primary + '14' }]}
        onPress={onUpdate}
        activeOpacity={0.7}
      >
        <Text variant="caption" weight="semibold" style={{ color: Colors.primary }}>Atualizar</Text>
      </TouchableOpacity>
    </Card>
  );
}

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useTheme();

  const { data: goal, isLoading } = useGoal(id ?? '');
  const deleteGoal = useDeleteGoal();
  const setPrimary = useSetPrimaryGoal();

  const [quickKr, setQuickKr] = useState<ApiKeyResultSummary | null>(null);

  function handleDelete() {
    if (!goal) return;
    Alert.alert('Excluir meta', `"${goal.title}" será removida permanentemente.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => { await deleteGoal.mutateAsync(String(goal.id)); router.back(); },
      },
    ]);
  }

  function handleTogglePrimary() {
    if (!goal || goal.is_primary) return;
    setPrimary.mutate(String(goal.id));
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!goal) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <Text style={{ fontSize: 48 }}>🔍</Text>
          <Text variant="headline" weight="semibold">Meta não encontrada</Text>
          <Button title="Voltar" onPress={() => router.back()} variant="ghost" />
        </View>
      </SafeAreaView>
    );
  }

  const color = progressColor(goal.progress);
  const cat = categoryMeta(goal.category);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text variant="body" style={{ color: Colors.primary }}>Voltar</Text>
        </TouchableOpacity>
        <Text variant="callout" weight="semibold">Meta</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => router.push(`/edit-meta?id=${id}`)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.primary }}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.danger }}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Cabeçalho da meta */}
        <Card padding={5} style={styles.goalHeadCard}>
          <CircularProgress value={goal.progress} size={104} stroke={10} color={color}>
            <Text variant="title" weight="bold" style={{ color }}>{formatProgressPercent(goal.progress)}</Text>
          </CircularProgress>
          <View style={styles.goalHeadInfo}>
            <Text style={{ fontSize: 18 }}>{cat.emoji} {goal.category}</Text>
            <Text variant="headline" weight="bold" numberOfLines={3}>{goal.title}</Text>
            <Text variant="caption" tertiary>🗓️ {formatPrazo(goal.end_date)}</Text>
          </View>
        </Card>

        {/* Tornar Meta Principal */}
        <TouchableOpacity
          style={[
            styles.primaryToggle,
            {
              backgroundColor: goal.is_primary ? Colors.primary : theme.colors.surface,
              borderColor: goal.is_primary ? Colors.primary : theme.colors.border,
            },
          ]}
          onPress={handleTogglePrimary}
          disabled={goal.is_primary || setPrimary.isPending}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 16 }}>⭐</Text>
          <Text
            variant="body"
            weight="semibold"
            style={{ color: goal.is_primary ? '#FFFFFF' : theme.colors.text }}
          >
            {goal.is_primary ? 'Esta é a sua Meta Principal' : 'Tornar Meta Principal'}
          </Text>
        </TouchableOpacity>

        {/* Resultados-chave */}
        <View style={styles.section}>
          <Text variant="label" weight="semibold" style={{ color: theme.colors.textTertiary, letterSpacing: 0.6 }}>
            RESULTADOS-CHAVE
          </Text>
          <View style={{ gap: Spacing[3] }}>
            {goal.key_results.length === 0 ? (
              <Text variant="body" secondary>Nenhum resultado-chave cadastrado.</Text>
            ) : (
              goal.key_results.map((kr) => (
                <KeyResultRow key={kr.id} kr={kr} onUpdate={() => setQuickKr(kr)} />
              ))
            )}
          </View>
        </View>
      </ScrollView>

      <QuickUpdateSheet
        visible={!!quickKr}
        onClose={() => setQuickKr(null)}
        keyResult={quickKr}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[5] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[4] },
  goalHeadCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing[4] },
  goalHeadInfo: { flex: 1, gap: Spacing[1] },
  primaryToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing[2], paddingVertical: Spacing[3], borderRadius: Radius.lg, borderWidth: 1.5 },
  section: { gap: Spacing[2] },
  krHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2] },
  krValues: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing[1], marginTop: Spacing[1] },
  updateBtn: { alignSelf: 'flex-start', marginTop: Spacing[3], paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full },
});
