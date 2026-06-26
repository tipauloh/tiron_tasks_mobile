import React, { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { AppIcon } from '@/components/ui/AppIcon';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScoreCard } from '@/components/metas/ScoreCard';
import { GoalCard } from '@/components/metas/GoalCard';
import { KpiStat } from '@/components/metas/KpiStat';
import { QuickUpdateSheet } from '@/components/metas/QuickUpdateSheet';
import { useGoalsDashboard } from '@/hooks/api/use-goals';
import { Colors } from '@/constants/colors';
import { Spacing } from '@/constants/spacing';
import type { ApiKeyResultSummary } from '@/infrastructure/api/goal-types';
import type { GoalTrend } from '@/domain/entities';

function SectionTitle({ children }: { children: string }) {
  const { theme } = useTheme();
  return (
    <Text variant="label" weight="semibold" style={[styles.sectionTitle, { color: theme.colors.textTertiary }]}>
      {children.toUpperCase()}
    </Text>
  );
}

export default function MetasScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { data: dashboard, isLoading, refetch, isRefetching } = useGoalsDashboard();

  // KPI selecionado para atualização rápida (QuickUpdateSheet).
  const [quickKr, setQuickKr] = useState<ApiKeyResultSummary | null>(null);

  const hasData =
    !!dashboard &&
    (!!dashboard.primary_goal || dashboard.goals.length > 0 || dashboard.kpis.length > 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: Spacing[4] }]}>
        <Text variant="title" weight="bold">Metas</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: Colors.primary }]}
          onPress={() => router.push('/create-meta' as never)}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <AppIcon name="plus" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {!hasData && !isLoading ? (
        <EmptyState
          icon="emptyGoals"
          title="Nenhuma meta ainda"
          description="Defina uma meta e acompanhe seu progresso em um só lugar."
          actionLabel="+ Criar meta"
          onAction={() => router.push('/create-meta' as never)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        >
          {dashboard && (
            <>
              {/* Score geral */}
              <ScoreCard
                score={dashboard.score}
                statusLabel={dashboard.status_label}
                trend={dashboard.trend as GoalTrend}
              />

              {/* Meta Principal */}
              {dashboard.primary_goal && (
                <View style={styles.section}>
                  <SectionTitle>Meta Principal</SectionTitle>
                  <GoalCard
                    goal={dashboard.primary_goal}
                    primary
                    onPress={() => router.push(`/goal/${dashboard.primary_goal!.id}` as never)}
                  />
                </View>
              )}

              {/* Objetivos Prioritários (até 3) */}
              {dashboard.goals.length > 0 && (
                <View style={styles.section}>
                  <SectionTitle>Objetivos Prioritários</SectionTitle>
                  <View style={styles.goalList}>
                    {dashboard.goals.slice(0, 3).map((goal) => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onPress={() => router.push(`/goal/${goal.id}` as never)}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* KPIs em destaque (até 4) */}
              {dashboard.kpis.length > 0 && (
                <View style={styles.section}>
                  <SectionTitle>KPIs em destaque</SectionTitle>
                  <View style={styles.kpiGrid}>
                    {dashboard.kpis.slice(0, 4).map((kr) => (
                      <KpiStat key={kr.id} kr={kr} onPress={() => setQuickKr(kr)} />
                    ))}
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing[3],
    paddingBottom: Spacing[2],
  },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[5] },
  section: { gap: Spacing[2] },
  sectionTitle: { letterSpacing: 0.6, marginBottom: Spacing[1] },
  goalList: { gap: Spacing[3] },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
});
