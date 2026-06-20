import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  KeyboardAvoidingView,
  TextInput,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTaskStore } from '@/store/task-store';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import type { TaskPriority, TaskList } from '@/domain/entities';

// ─── Date picker shortcuts ──────────────────────────────────────────────────

type DateShortcut = 'today' | 'tomorrow' | 'next_week' | 'none';

function dateFromShortcut(key: DateShortcut): string | undefined {
  const now = new Date();
  switch (key) {
    case 'today':
      return now.toISOString().split('T')[0];
    case 'tomorrow': {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      return d.toISOString().split('T')[0];
    }
    case 'next_week': {
      const d = new Date(now);
      d.setDate(d.getDate() + 7);
      return d.toISOString().split('T')[0];
    }
    case 'none':
    default:
      return undefined;
  }
}

const DATE_SHORTCUTS: Array<{ key: DateShortcut; label: string; emoji: string }> = [
  { key: 'none', label: 'Sem data', emoji: '—' },
  { key: 'today', label: 'Hoje', emoji: '📅' },
  { key: 'tomorrow', label: 'Amanhã', emoji: '🌅' },
  { key: 'next_week', label: 'Próx. semana', emoji: '📆' },
];

// ─── Priority options ───────────────────────────────────────────────────────

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string; color: string; emoji: string }> = [
  { value: 'low', label: 'Baixa', color: Colors.priorityLow, emoji: '🔽' },
  { value: 'normal', label: 'Normal', color: Colors.priorityNormal, emoji: '➡️' },
  { value: 'high', label: 'Alta', color: Colors.priorityHigh, emoji: '🔼' },
  { value: 'critical', label: 'Crítica', color: Colors.priorityCritical, emoji: '🚨' },
];

// ─── Section label ──────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  const { theme } = useTheme();
  return (
    <Text
      variant="label"
      style={{ color: theme.colors.textTertiary, letterSpacing: 0.6 }}
    >
      {label.toUpperCase()}
    </Text>
  );
}

// ─── Create Task Screen ─────────────────────────────────────────────────────

export default function CreateTaskScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { lists, createTask, isLoading } = useTaskStore();

  // Form state
  const [title, setTitle] = useState('');
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [dateShortcut, setDateShortcut] = useState<DateShortcut>('none');

  const titleRef = useRef<TextInput>(null);

  // Auto-focus title on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      titleRef.current?.focus();
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  const canCreate = title.trim().length > 0;

  async function handleCreate() {
    if (!canCreate) return;
    try {
      await createTask({
        title: title.trim(),
        status: 'not_started',
        priority,
        dueDate: dateFromShortcut(dateShortcut),
        listId: selectedListId ?? undefined,
        isFavorite: false,
        position: 0,
      });
      router.back();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível criar a tarefa. Tente novamente.');
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView
        style={[styles.safe, { backgroundColor: theme.colors.background }]}
        edges={['top', 'bottom']}
      >
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text variant="body" style={{ color: Colors.primary }}>
              Cancelar
            </Text>
          </TouchableOpacity>

          <Text variant="callout" weight="semibold">
            Nova tarefa
          </Text>

          <TouchableOpacity
            onPress={handleCreate}
            disabled={!canCreate || isLoading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              variant="body"
              weight="semibold"
              style={{
                color: canCreate && !isLoading ? Colors.primary : theme.colors.textTertiary,
              }}
            >
              Criar
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
        >
          {/* Title input */}
          <View
            style={[
              styles.titleContainer,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <TextInput
              ref={titleRef}
              value={title}
              onChangeText={setTitle}
              placeholder="O que precisa ser feito?"
              placeholderTextColor={theme.colors.textTertiary}
              style={[styles.titleInput, { color: theme.colors.text }]}
              multiline
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={canCreate ? handleCreate : undefined}
              maxLength={200}
            />
          </View>

          {/* List selector */}
          {lists.length > 0 && (
            <View style={styles.section}>
              <SectionLabel label="Lista" />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {/* "Sem lista" chip */}
                <TouchableOpacity
                  onPress={() => setSelectedListId(null)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        selectedListId === null ? Colors.primary : theme.colors.surface,
                      borderColor:
                        selectedListId === null ? Colors.primary : theme.colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text
                    variant="caption"
                    weight="semibold"
                    style={{
                      color: selectedListId === null ? '#fff' : theme.colors.textSecondary,
                    }}
                  >
                    Sem lista
                  </Text>
                </TouchableOpacity>

                {lists.map((list) => {
                  const isActive = selectedListId === list.id;
                  return (
                    <TouchableOpacity
                      key={list.id}
                      onPress={() => setSelectedListId(list.id)}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: isActive ? list.color : theme.colors.surface,
                          borderColor: isActive ? list.color : theme.colors.border,
                        },
                      ]}
                      activeOpacity={0.7}
                    >
                      {list.icon ? (
                        <Text style={{ fontSize: 13 }}>{list.icon}</Text>
                      ) : null}
                      <Text
                        variant="caption"
                        weight="semibold"
                        style={{ color: isActive ? '#fff' : theme.colors.textSecondary }}
                      >
                        {list.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Priority selector */}
          <View style={styles.section}>
            <SectionLabel label="Prioridade" />
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((opt) => {
                const isActive = priority === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setPriority(opt.value)}
                    style={[
                      styles.priorityOption,
                      {
                        backgroundColor: isActive ? opt.color : theme.colors.surface,
                        borderColor: isActive ? opt.color : theme.colors.border,
                        flex: 1,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                    <Text
                      variant="label"
                      weight={isActive ? 'semibold' : 'regular'}
                      style={{ color: isActive ? '#fff' : theme.colors.textSecondary }}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Date selector */}
          <View style={styles.section}>
            <SectionLabel label="Data de entrega" />
            <View style={styles.dateGrid}>
              {DATE_SHORTCUTS.map((d) => {
                const isActive = dateShortcut === d.key;
                return (
                  <TouchableOpacity
                    key={d.key}
                    onPress={() => setDateShortcut(d.key)}
                    style={[
                      styles.dateOption,
                      {
                        backgroundColor: isActive
                          ? Colors.primary + '15'
                          : theme.colors.surface,
                        borderColor: isActive ? Colors.primary : theme.colors.border,
                        flex: 1,
                      },
                    ]}
                    activeOpacity={0.7}
                  >
                    <Text style={{ fontSize: 18 }}>{d.emoji}</Text>
                    <Text
                      variant="caption"
                      weight={isActive ? 'semibold' : 'regular'}
                      style={{ color: isActive ? Colors.primary : theme.colors.textSecondary }}
                    >
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Create button (bottom of form) */}
          <View style={[styles.section, { marginTop: Spacing[4] }]}>
            <Button
              title={isLoading ? 'Criando...' : 'Criar tarefa'}
              onPress={handleCreate}
              disabled={!canCreate || isLoading}
              loading={isLoading}
              size="lg"
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

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
  scroll: {
    padding: Spacing[4],
    paddingBottom: Spacing[12],
    gap: Spacing[5],
  },
  titleContainer: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    padding: Spacing[4],
    minHeight: 80,
  },
  titleInput: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    lineHeight: FontSize.xl * 1.4,
    textAlignVertical: 'top',
  },
  section: {
    gap: Spacing[2],
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1.5],
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: Spacing[2],
  },
  priorityOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[1],
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: 2,
  },
  dateGrid: {
    flexDirection: 'row',
    gap: Spacing[2],
    flexWrap: 'wrap',
  },
  dateOption: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1.5,
    gap: Spacing[1],
    minWidth: '22%',
  },
});
