import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/colors';
import { Radius, Spacing } from '@/constants/spacing';
import { FontSize, FontWeight } from '@/constants/typography';
import { formatKpiValue } from '@/utils/kpi-format';
import { useUpdateKeyResultValue } from '@/hooks/api/use-goals';
import type { ApiKeyResultSummary } from '@/infrastructure/api/goal-types';

interface QuickUpdateSheetProps {
  visible: boolean;
  onClose: () => void;
  keyResult: ApiKeyResultSummary | null;
}

// Atualização rápida do valor de um KPI em ≤3 toques:
//  1) abrir (botão "Atualizar"), 2) digitar o número, 3) Salvar.
// Input pré-preenchido com o valor atual + autofocus + teclado numérico.
export function QuickUpdateSheet({ visible, onClose, keyResult }: QuickUpdateSheetProps) {
  const { theme } = useTheme();
  const [value, setValue] = useState('');
  const [note, setNote] = useState('');
  const inputRef = useRef<TextInput>(null);
  const updateValue = useUpdateKeyResultValue();

  useEffect(() => {
    if (visible && keyResult) {
      setValue(String(keyResult.current_value));
      setNote('');
      // Autofocus logo após a animação de abertura do sheet.
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [visible, keyResult?.id]);

  if (!keyResult) {
    return (
      <BottomSheet visible={visible} onClose={onClose} title="Atualizar KPI">
        <View />
      </BottomSheet>
    );
  }

  const parsed = parseFloat(value.replace(',', '.'));
  const valid = !isNaN(parsed);

  async function handleSave() {
    if (!keyResult || !valid) return;
    const trimmedNote = note.trim();
    try {
      await updateValue.mutateAsync({
        id: String(keyResult.id),
        value: parsed,
        note: trimmedNote ? trimmedNote : undefined,
      });
      setNote('');
      onClose();
    } catch {
      // mantém o sheet aberto; o usuário pode tentar novamente
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={keyResult.title}>
      <View style={styles.container}>
        <View style={styles.summary}>
          <Text variant="caption" secondary>Meta</Text>
          <Text variant="callout" weight="semibold">
            {formatKpiValue(keyResult.target_value, keyResult.kpi_type, keyResult.unit)}
          </Text>
        </View>
        <ProgressBar value={keyResult.progress} height={8} />

        <View style={styles.field}>
          <Text variant="label" secondary>VALOR ATUAL</Text>
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={setValue}
            keyboardType="numeric"
            returnKeyType="done"
            onSubmitEditing={valid ? handleSave : undefined}
            selectTextOnFocus
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              styles.input,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: Colors.primary,
              },
            ]}
          />
        </View>

        <View style={styles.field}>
          <Text variant="label" secondary>OBSERVAÇÃO</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="O que você fez para evoluir? (opcional)"
            placeholderTextColor={theme.colors.textTertiary}
            style={[
              styles.noteInput,
              {
                color: theme.colors.text,
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.borderLight,
              },
            ]}
          />
        </View>

        <Button
          title={updateValue.isPending ? 'Salvando...' : 'Salvar'}
          onPress={handleSave}
          disabled={!valid || updateValue.isPending}
          loading={updateValue.isPending}
          size="lg"
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing[4], paddingTop: Spacing[2] },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  field: { gap: Spacing[1.5] },
  input: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    height: 56,
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
  },
  noteInput: {
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    minHeight: 72,
    fontSize: FontSize.base,
    textAlignVertical: 'top',
  },
});
