import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { useKeyResultHistory } from '@/hooks/api/use-goals';
import { formatKpiValue } from '@/utils/kpi-format';
import type { ApiKpiType } from '@/infrastructure/api/goal-types';

interface Props {
  krId: string;
  kpiType: ApiKpiType;
  unit?: string | null;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const date = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const time = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date} ${time}`;
}

export function CheckinHistory({ krId, kpiType, unit }: Props) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading } = useKeyResultHistory(krId, isOpen);

  return (
    <View style={[styles.wrap, { borderTopColor: theme.colors.borderLight }]}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setIsOpen((v) => !v)}
        activeOpacity={0.7}
      >
        <Text variant="caption" weight="semibold" style={{ color: theme.colors.textSecondary, flex: 1 }}>
          Histórico de progresso
        </Text>
        <Text style={{ color: theme.colors.textTertiary, fontSize: 14 }}>
          {isOpen ? '⌃' : '⌄'}
        </Text>
      </TouchableOpacity>

      {isOpen && (
        <View style={styles.body}>
          {isLoading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing[2] }} />
          ) : !data || data.length === 0 ? (
            <Text variant="caption" tertiary>Nenhuma atualização ainda.</Text>
          ) : (
            data.map((checkin) => (
              <View key={checkin.id} style={[styles.item, { borderColor: theme.colors.borderLight }]}>
                <View style={styles.itemRow}>
                  <Text variant="caption" weight="semibold">
                    {formatKpiValue(checkin.value, kpiType, unit)}
                  </Text>
                  <Text variant="caption" tertiary>
                    {formatDateTime(checkin.recorded_at)}
                  </Text>
                </View>
                {checkin.note ? (
                  <Text style={[styles.note, { color: theme.colors.textSecondary }]}>
                    {checkin.note}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing[3], borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing[2] },
  headerRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing[1] },
  body: { marginTop: Spacing[2], gap: Spacing[1.5] },
  item: {
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    gap: Spacing[1],
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  note: {
    fontSize: 12,
    lineHeight: 16,
  },
});
