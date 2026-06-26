import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { AppIcon } from '@/components/ui/AppIcon';
import { Button } from '@/components/ui/Button';
import { CalendarPicker } from '@/components/tasks/CalendarPicker';
import { CategoryPicker } from '@/components/metas/CategoryPicker';
import { categoryMeta } from '@/components/metas/categories';
import { useGoal, useUpdateGoal } from '@/hooks/api/use-goals';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import type { GoalCategory } from '@/domain/entities';

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return <Text variant="label" style={{ color: theme.colors.textTertiary, letterSpacing: 0.6 }}>{label.toUpperCase()}</Text>;
}

// Converte 'YYYY-MM-DD' em Date local (meia-noite), evitando shift de fuso.
function parseEndDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parts = value.split('-');
  if (parts.length !== 3) return null;
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  return isNaN(d.getTime()) ? null : d;
}

export default function EditMetaScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: goal, isLoading } = useGoal(id ?? '');
  const updateGoal = useUpdateGoal();

  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [showCategory, setShowCategory] = useState(false);
  const [title, setTitle] = useState('');
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Carrega os valores atuais da meta uma única vez.
  useEffect(() => {
    if (goal && !hydrated) {
      setTitle(goal.title);
      setCategory(goal.category as GoalCategory);
      setEndDate(parseEndDate(goal.end_date));
      setHydrated(true);
    }
  }, [goal, hydrated]);

  const endDateStr = endDate
    ? `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-${String(endDate.getDate()).padStart(2, '0')}`
    : null;

  const canSave = !!id && !!category && title.trim().length > 0;

  async function handleSave() {
    if (!canSave || !category || !id) return;
    try {
      await updateGoal.mutateAsync({
        id,
        data: {
          title: title.trim(),
          category,
          end_date: endDateStr,
        },
      });
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar a meta. Tente novamente.');
    }
  }

  const catMeta = category ? categoryMeta(category) : null;
  const isSaving = updateGoal.isPending;

  if (isLoading || !goal) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.primary }}>Voltar</Text>
          </TouchableOpacity>
          <Text variant="callout" weight="semibold">Editar meta</Text>
          <TouchableOpacity onPress={handleSave} disabled={!canSave || isSaving} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" weight="semibold" style={{ color: canSave && !isSaving ? Colors.primary : theme.colors.textTertiary }}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          {/* Categoria */}
          <View style={styles.section}>
            <SectionLabel label="Categoria" />
            <TouchableOpacity
              style={[styles.selectRow, { backgroundColor: theme.colors.surface, borderColor: category ? Colors.primary : theme.colors.border }]}
              onPress={() => setShowCategory(true)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 20 }}>{catMeta?.emoji ?? '🎯'}</Text>
              <Text variant="body" style={{ flex: 1, color: category ? theme.colors.text : theme.colors.textTertiary }}>
                {category ?? 'Escolha uma categoria'}
              </Text>
              <AppIcon name="chevronRight" size={18} color={theme.colors.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Nome */}
          <View style={styles.section}>
            <SectionLabel label="Nome da meta" />
            <View style={[styles.titleBox, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="Ex.: Correr uma maratona"
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.titleInput, { color: theme.colors.text }]}
                returnKeyType="done"
                maxLength={120}
              />
            </View>
          </View>

          {/* Prazo */}
          <View style={styles.section}>
            <SectionLabel label="Prazo" />
            <TouchableOpacity
              style={[styles.selectRow, { backgroundColor: theme.colors.surface, borderColor: endDate ? Colors.primary : theme.colors.border }]}
              onPress={() => setShowCalendar(true)}
              activeOpacity={0.7}
            >
              <AppIcon name="calendar" size={18} color={theme.colors.textTertiary} />
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

          <View style={{ marginTop: Spacing[4] }}>
            <Button
              title={isSaving ? 'Salvando...' : 'Salvar alterações'}
              onPress={handleSave}
              disabled={!canSave || isSaving}
              loading={isSaving}
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
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[3], borderBottomWidth: StyleSheet.hairlineWidth },
  scroll: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[5] },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[4] },
  section: { gap: Spacing[2] },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], padding: Spacing[3], borderRadius: Radius.md, borderWidth: 1.5 },
  titleBox: { borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Spacing[4], minHeight: 52, justifyContent: 'center' },
  titleInput: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, paddingVertical: Spacing[3] },
});
