import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/hooks/use-theme';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import { useCreateTaskList } from '@/hooks/api/use-task-lists';

const PRESET_COLORS = [
  '#208AEF', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
  '#F97316', '#6B7280',
];

const PRESET_ICONS = [
  '📋', '🏠', '💼', '🎯', '⭐', '📚', '🛒',
  '💪', '🎨', '🌱', '🔧', '✈️', '❤️', '🎵',
];

export default function CreateListScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const createList = useCreateTaskList();

  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(Colors.primary);
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    const timer = setTimeout(() => { nameRef.current?.focus(); }, 150);
    return () => clearTimeout(timer);
  }, []);

  const canCreate = name.trim().length > 0;
  const isLoading = createList.isPending;

  async function handleCreate() {
    if (!canCreate) return;
    try {
      await createList.mutateAsync({
        name: name.trim(),
        color: selectedColor,
        icon: selectedIcon ?? undefined,
        position: 0,
      });
      router.back();
    } catch {
      Alert.alert('Erro', 'Não foi possível criar a lista. Tente novamente.');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" style={{ color: Colors.primary }}>Cancelar</Text>
          </TouchableOpacity>
          <Text variant="callout" weight="semibold">Nova lista</Text>
          <TouchableOpacity onPress={handleCreate} disabled={!canCreate || isLoading} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text variant="body" weight="semibold" style={{ color: canCreate && !isLoading ? Colors.primary : theme.colors.textTertiary }}>Criar</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardDismissMode="interactive" showsVerticalScrollIndicator={false}>
          {/* Preview */}
          <View style={[styles.preview, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
            <View style={[styles.previewIcon, { backgroundColor: selectedColor }]}>
              {selectedIcon ? (
                <Text style={{ fontSize: 24 }}>{selectedIcon}</Text>
              ) : (
                <Text style={{ fontSize: 18, color: '#fff', fontWeight: '700' }}>
                  {name.trim().charAt(0).toUpperCase() || 'L'}
                </Text>
              )}
            </View>
            <Text variant="body" weight="semibold" style={{ color: name.trim() ? theme.colors.text : theme.colors.textTertiary }}>
              {name.trim() || 'Nome da lista'}
            </Text>
          </View>

          {/* Name */}
          <View style={styles.section}>
            <Text variant="label" style={styles.sectionLabel}>NOME</Text>
            <View style={[styles.inputWrapper, { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border }]}>
              <TextInput
                ref={nameRef}
                value={name}
                onChangeText={setName}
                placeholder="Ex: Trabalho, Pessoal, Compras..."
                placeholderTextColor={theme.colors.textTertiary}
                style={[styles.input, { color: theme.colors.text }]}
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={canCreate ? handleCreate : undefined}
              />
            </View>
          </View>

          {/* Color */}
          <View style={styles.section}>
            <Text variant="label" style={styles.sectionLabel}>COR</Text>
            <View style={styles.colorGrid}>
              {PRESET_COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => setSelectedColor(color)}
                  style={[
                    styles.colorDot,
                    { backgroundColor: color },
                    selectedColor === color && styles.colorDotSelected,
                  ]}
                  activeOpacity={0.7}
                >
                  {selectedColor === color && (
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Icon (optional) */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text variant="label" style={styles.sectionLabel}>ÍCONE (OPCIONAL)</Text>
              {selectedIcon && (
                <TouchableOpacity onPress={() => setSelectedIcon(null)}>
                  <Text variant="caption" style={{ color: Colors.danger }}>Remover</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.iconGrid}>
              {PRESET_ICONS.map((icon) => (
                <TouchableOpacity
                  key={icon}
                  onPress={() => setSelectedIcon(selectedIcon === icon ? null : icon)}
                  style={[
                    styles.iconOption,
                    {
                      backgroundColor: selectedIcon === icon ? selectedColor + '20' : theme.colors.surfaceElevated,
                      borderColor: selectedIcon === icon ? selectedColor : theme.colors.border,
                    },
                  ]}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 22 }}>{icon}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.section, { marginTop: Spacing[4] }]}>
            <Button
              title={isLoading ? 'Criando...' : 'Criar lista'}
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
  scroll: { padding: Spacing[4], paddingBottom: Spacing[12], gap: Spacing[5] },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[4],
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: { gap: Spacing[2] },
  sectionLabel: {
    fontSize: FontSize.xs,
    letterSpacing: 0.6,
    color: '#9CA3AF',
    fontWeight: FontWeight.medium as '500',
  },
  inputWrapper: {
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Spacing[4],
  },
  input: {
    fontSize: FontSize.base,
    paddingVertical: Spacing[3],
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorDotSelected: {
    borderWidth: 3,
    borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  iconOption: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
