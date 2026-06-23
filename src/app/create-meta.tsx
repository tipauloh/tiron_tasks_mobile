import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { CalendarPicker } from '@/components/tasks/CalendarPicker';
import { CategoryPicker } from '@/components/metas/CategoryPicker';
import { KpiTypePicker, kpiTypeMeta } from '@/components/metas/KpiTypePicker';
import { categoryMeta } from '@/components/metas/categories';
import { useCreateGoal } from '@/hooks/api/use-goals';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import type { GoalCategory, KpiType } from '@/domain/entities';
import type { ApiKeyResultCreateRequest } from '@/infrastructure/api/goal-types';

type DraftKr = {
  title: string;
  kpiType: KpiType;
  unit: string;
  startValue: string;
  targetValue: string;
};

function emptyKr(): DraftKr {
  return { title: '', kpiType: 'number', unit: '', startValue: '0', targetValue: '' };
}

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text variant="label" style={{ color: theme.colors.textTertiary, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>;
}

const MAX_KR = 5;

export default function CreateMetaScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const createGoal = useCreateGoal();

  // Etapa 1: categoria
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [showCategory, setShowCategory] = useState(false);
  // Etapa 2: nome
  const [title, setTitle] = useState('');
  // Etapa 3: prazo
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  // Etapas 4 e 5: resultados-chave + KPI por KR
  const [krs, setKrs] = useState<DraftKr[]>([emptyKr()]);
  const [kpiPickerIndex, setKpiPickerIndex] = useState<number | null>(null);

  function updateKr(index: number, patch: Partial<DraftKr>) {
    setKrs((prev) => prev.map((kr, i) => (i === index ? { ...kr, ...patch } : kr)));
  }
  function addKr() {
    setKrs((prev) => (prev.length >= MAX_KR ? prev : [...prev, emptyKr()]));
  }
  function removeKr(index: number) {
    setKrs((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  const validKrs = krs.filter((kr) => kr.title.trim() && kr.targetValue.trim() !== '' && !isNaN(parseFloat(kr.targetValue.replace(',', '.'))));
  const canCreate = !!category && title.trim().length > 0 && validKrs.length > 0;

  const endDateStr = endDate
    ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    : null;

  async function handleCreate() {
    if (!canCreate || !category) return;
    const key_results: ApiKeyResultCreateRequest[] = validKrs.map((kr, i) => ({
      title: kr.title.trim(),
      kpi_type: kr.kpiType,
      unit: kr.kpiType === 'custom' ? kr.unit.trim() || null : null,
      start_value: parseFloat(kr.startValue.replace(',', '.')) || 0,
      target_value: parseFloat(kr.targetValue.replace(',', '.')),
      is_highlight: i === 0, // destaca o primeiro KR por padrão
    }));
    try {
      await createGoal.mutateAsync({
        title: title.trim(),
        category,
        end_date: endDateStr,
        key_results,
      });
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a meta. Tente novamente.');
    }
  }

  const catMeta = category ? categoryMeta(category) : null;
  const isLoading = createGoal.isPending;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.primary }}>Cancelar</Text>
          </TouchableOpacity>
          <Text variant="callout" weight="semibold">Nova meta</Text>
          <TouchableOpacity onPress={handleCreate} disabled={!canCreate || isLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" weight="semibold" style={{ color: canCreate && !isLoading ? Colors.primary : theme.colors.textTertiary }}>
              {isLoading ? 'Criando...' : 'Criar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          {/* 1 — Categoria */}
          <View style={styles.section}>
            <SectionLabel label="1 · Categoria" />
            <TouchableOpacity
              style={[styles.selectRow, { backgroundColor: theme.colors.surface, borderColor: category ? Colors.primary : theme.colors.border }]}
              onPress={() => setShowCategory(true)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 20 }}>{catMeta?.emoji ?? '🎯'}</Text>
              <Text variant="body" style={{ flex: 1, color: category ? theme.colors.text : theme.colors.textTertiary }}>
                {category ?? 'Escolha uma categoria'}
              </Text>
              <Text style={{ color: theme.colors.textTertiary }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* 2 — Nome */}
          <View style={styles.section}>
            <SectionLabel label="2 · Nome da meta" />
            <View style={[styles.titleBox, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ex.: Correr uma maratona"
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.titleInput, { color: theme.colors.text }]}
                returnKeyType="next"
                maxLength={120}
              />
            </View>
          </View>

          {/* 3 — Prazo */}
          <View style={styles.section}>
            <SectionLabel label="3 · Prazo" />
            <TouchableOpacity
              style={[styles.selectRow, { backgroundColor: theme.colors.surface, borderColor: endDate ? Colors.primary : theme.colors.border }]}
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18 }}>🗓️</Text>
              <Text variant="body" style={{ flex: 1, color: endDate ? theme.colors.text : theme.colors.textTertiary }}>
                {endDate
                  ? endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                  : 'Sem prazo definido'}
              </Text>
              {endDate && (
                <TouchableOpacity onPress={() => setEndDate(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={{ color: Colors.danger, fontSize: 13 }}>Remover</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          </View>

          {/* 4 e 5 — Resultados-chave + KPI */}
          <View style={styles.section}>
            <SectionLabel label="4 · Resultados-chave" />
            <Text variant="caption" tertiary>O que indica que a meta está avançando? (até {MAX_KR})</Text>
            <View style={{ gap: Spacing[3], marginTop: Spacing[1] }}>
              {krs.map((kr, index) => {
                const typeMeta = kpiTypeMeta(kr.kpiType);
                return (
                  <View key={index} style={[styles.krCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                    <View style={styles.krHead}>
                      <Text variant="caption" weight="semibold" secondary>Resultado {index + 1}</Text>
                      {krs.length > 1 && (
                        <TouchableOpacity onPress={() => removeKr(index)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                          <Text style={{ color: Colors.danger, fontSize: 13 }}>Remover</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    <TextInput
                      value={kr.title}
                      onChangeText={(t) => updateKr(index, { title: t })}
                      placeholder="Ex.: Quilômetros corridos por semana"
                      placeholderTextColor={theme.colors.textTertiary}
                      style={[styles.krInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                      maxLength={120}
                    />

                    {/* 5 — Tipo de KPI + alvo */}
                    <View style={styles.kpiRow}>
                      <TouchableOpacity
                        style={[styles.kpiTypeBtn, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceElevated }]}
                        onPress={() => setKpiPickerIndex(index)}
                        activeOpacity={0.7}
                      >
                        <Text style={{ fontSize: 15 }}>{typeMeta.emoji}</Text>
                        <Text variant="caption" weight="semibold">{typeMeta.label}</Text>
                      </TouchableOpacity>

                      <TextInput
                        value={kr.targetValue}
                        onChangeText={(t) => updateKr(index, { targetValue: t })}
                        placeholder="Alvo"
                        placeholderTextColor={theme.colors.textTertiary}
                        keyboardType="numeric"
                        style={[styles.kpiValueInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                      />
                    </View>

                    {kr.kpiType === 'custom' && (
                      <TextInput
                        value={kr.unit}
                        onChangeText={(t) => updateKr(index, { unit: t })}
                        placeholder="Unidade (ex.: páginas)"
                        placeholderTextColor={theme.colors.textTertiary}
                        style={[styles.krInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
                        maxLength={20}
                      />
                    )}
                  </View>
                );
              })}

              {krs.length < MAX_KR && (
                <TouchableOpacity
                  style={[styles.addKr, { borderColor: Colors.primary + '60' }]}
                  onPress={addKr}
                  activeOpacity={0.7}
                >
                  <Text variant="body" weight="semibold" style={{ color: Colors.primary }}>+ Adicionar resultado-chave</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={{ marginTop: Spacing[4] }}>
            <Button
              title={isLoading ? 'Criando...' : 'Criar meta'}
              onPress={handleCreate}
              disabled={!canCreate || isLoading}
              loading={isLoading}
              size="lg"
            />
          </View>
        </ScrollView>

        <CategoryPicker
          visible={showCategory}
          onClose={() => setShowCategory(false)}
          selected={category}
          onSelect={setCategory}
        />
        <CalendarPicker
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          selectedDate={endDate}
          onSelect={(d) => { setEndDate(d); setShowCalendar(false); }}
        />
        <KpiTypePicker
          visible={kpiPickerIndex !== null}
          onClose={() => setKpiPickerIndex(null)}
          selected={kpiPickerIndex !== null ? krs[kpiPickerIndex].kpiType : null}
          onSelect={(type) => { if (kpiPickerIndex !== null) updateKr(kpiPickerIndex, { kpiType: type }); }}
        />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[5] },
  section: { gap: Spacing[2] },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.md, borderWidth: 1.5 },
  titleBox: { borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Spacing[4], minHeight: 52, justifyContent: 'center' },
  titleInput: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, paddingVertical: Spacing[3] },
  krCard: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing[3], gap: Spacing[2] },
  krHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  krInput: { borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing[3], height: 44, fontSize: FontSize.base },
  kpiRow: { flexDirection: 'row', gap: Spacing[2] },
  kpiTypeBtn: { flexDirection: 'row', alignItems: 'center', gap: Spacing[1.5], paddingHorizontal: Spacing[3], borderWidth: 1, borderRadius: Radius.md, height: 44, flex: 1.2 },
  kpiValueInput: { flex: 1, borderWidth: 1, borderRadius: Radius.md, paddingHorizontal: Spacing[3], height: 44, fontSize: FontSize.base, textAlign: 'center' },
  addKr: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: Radius.md, paddingVertical: Spacing[3], alignItems: 'center' },
});
