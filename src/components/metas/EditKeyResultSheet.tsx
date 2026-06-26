import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { AppIcon } from '@/components/ui/AppIcon';
import { KpiTypePicker, kpiTypeMeta } from '@/components/metas/KpiTypePicker';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { FontSize } from '@/constants/typography';
import { useUpdateKeyResult, useDeleteKeyResult } from '@/hooks/api/use-goals';
import type { ApiKeyResultSummary, ApiKpiType } from '@/infrastructure/api/goal-types';

interface Props {
  visible: boolean;
  onClose: () => void;
  keyResult: ApiKeyResultSummary | null;
}

/** Edição completa de um resultado-chave: título, tipo de KPI, alvo, valor
 * inicial e unidade. Também permite excluir. */
export function EditKeyResultSheet({ visible, onClose, keyResult }: Props) {
  const { theme } = useTheme();
  const update = useUpdateKeyResult();
  const remove = useDeleteKeyResult();

  const [title, setTitle] = useState('');
  const [kpiType, setKpiType] = useState<ApiKpiType>('number');
  const [unit, setUnit] = useState('');
  const [startValue, setStartValue] = useState('0');
  const [targetValue, setTargetValue] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);

  useEffect(() => {
    if (visible && keyResult) {
      setTitle(keyResult.title);
      setKpiType(keyResult.kpi_type);
      setUnit(keyResult.unit ?? '');
      setStartValue(String(keyResult.start_value));
      setTargetValue(String(keyResult.target_value));
    }
  }, [visible, keyResult?.id]);

  if (!keyResult) {
    return (
      <BottomSheet visible={visible} onClose={onClose} title="Editar resultado-chave">
        <View />
      </BottomSheet>
    );
  }

  const target = parseFloat(targetValue.replace(',', '.'));
  const start = parseFloat(startValue.replace(',', '.'));
  const valid = title.trim().length > 0 && !isNaN(target);
  const typeMeta = kpiTypeMeta(kpiType);

  async function handleSave() {
    if (!keyResult || !valid) return;
    try {
      await update.mutateAsync({
        id: String(keyResult.id),
        data: {
          title: title.trim(),
          kpi_type: kpiType,
          unit: kpiType === 'custom' ? unit.trim() || null : null,
          start_value: isNaN(start) ? 0 : start,
          target_value: target,
        },
      });
      onClose();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar. Tente novamente.');
    }
  }

  function handleDelete() {
    if (!keyResult) return;
    Alert.alert(
      'Excluir resultado-chave',
      `"${keyResult.title}" e seu histórico serão removidos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              await remove.mutateAsync(String(keyResult.id));
              onClose();
            } catch {
              Alert.alert('Erro', 'Não foi possível excluir.');
            }
          },
        },
      ],
    );
  }

  const inputStyle = [
    styles.input,
    { color: theme.colors.text, backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
  ];

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Editar resultado-chave">
      <View style={styles.container}>
        <View style={styles.field}>
          <Text variant="label" secondary>TÍTULO</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Ex.: Visitar 10 clientes"
            placeholderTextColor={theme.colors.textTertiary}
            style={inputStyle}
          />
        </View>

        <View style={styles.field}>
          <Text variant="label" secondary>TIPO DE KPI</Text>
          <TouchableOpacity
            style={[styles.typeBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
            onPress={() => setShowTypePicker(true)}
            activeOpacity={0.7}
          >
            <AppIcon name={typeMeta.icon} size={18} color={theme.colors.textSecondary} />
            <Text variant="body" style={{ flex: 1, color: theme.colors.text }}>{typeMeta.label}</Text>
            <AppIcon name="chevronRight" size={16} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        </View>

        {kpiType === 'custom' && (
          <View style={styles.field}>
            <Text variant="label" secondary>UNIDADE</Text>
            <TextInput
              value={unit}
              onChangeText={setUnit}
              placeholder="Ex.: páginas, km…"
              placeholderTextColor={theme.colors.textTertiary}
              style={inputStyle}
            />
          </View>
        )}

        <View style={styles.row}>
          <View style={[styles.field, { flex: 1 }]}>
            <Text variant="label" secondary>VALOR INICIAL</Text>
            <TextInput
              value={startValue}
              onChangeText={setStartValue}
              keyboardType="numeric"
              placeholderTextColor={theme.colors.textTertiary}
              style={inputStyle}
            />
          </View>
          <View style={[styles.field, { flex: 1 }]}>
            <Text variant="label" secondary>ALVO</Text>
            <TextInput
              value={targetValue}
              onChangeText={setTargetValue}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={theme.colors.textTertiary}
              style={inputStyle}
            />
          </View>
        </View>

        <Button
          title={update.isPending ? 'Salvando...' : 'Salvar'}
          onPress={handleSave}
          disabled={!valid || update.isPending}
          loading={update.isPending}
          size="lg"
        />

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} activeOpacity={0.7}>
          <AppIcon name="trash" size={16} color={Colors.danger} />
          <Text variant="body" weight="semibold" style={{ color: Colors.danger }}>
            Excluir resultado-chave
          </Text>
        </TouchableOpacity>
      </View>

      <KpiTypePicker
        visible={showTypePicker}
        onClose={() => setShowTypePicker(false)}
        selected={kpiType}
        onSelect={(t) => setKpiType(t)}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing[4], paddingTop: Spacing[2] },
  field: { gap: Spacing[1.5] },
  row: { flexDirection: 'row', gap: Spacing[3] },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    height: 52,
    fontSize: FontSize.base,
  },
  typeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    height: 52,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2],
  },
});
