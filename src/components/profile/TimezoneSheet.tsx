import React from 'react';
import {
  Modal,
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { useTheme } from '@/hooks/use-theme';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { TIMEZONES, formatOffset } from '@/utils/timezone';

interface TimezoneSheetProps {
  visible: boolean;
  currentTz: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}

export function TimezoneSheet({ visible, currentTz, onSelect, onClose }: TimezoneSheetProps) {
  const { theme } = useTheme();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <SafeAreaView
        edges={['bottom']}
        style={[styles.sheet, { backgroundColor: theme.colors.surface }]}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Text variant="body" weight="semibold" style={{ color: theme.colors.text }}>
            Fuso horário
          </Text>
          <TouchableOpacity onPress={onClose} hitSlop={10}>
            <Text variant="body" style={{ color: Colors.primary }}>Fechar</Text>
          </TouchableOpacity>
        </View>
        <Text variant="caption" secondary style={styles.hint}>
          Os horários das tarefas são exibidos neste fuso. Mudar aqui não altera o
          horário guardado — apenas como ele aparece.
        </Text>
        <ScrollView style={styles.list}>
          {TIMEZONES.map((t) => {
            const selected = t.id === currentTz;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.row, { borderBottomColor: theme.colors.border }]}
                onPress={() => onSelect(t.id)}
                activeOpacity={0.6}
              >
                <View style={styles.rowText}>
                  <Text variant="body" style={{ color: theme.colors.text }}>{t.label}</Text>
                  <Text variant="caption" secondary>{formatOffset(t.id)}</Text>
                </View>
                {selected && <Text style={{ color: Colors.primary, fontSize: 18 }}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    maxHeight: '75%',
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  hint: { paddingHorizontal: Spacing[4], paddingTop: Spacing[3] },
  list: { paddingHorizontal: Spacing[4] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { gap: 2 },
});
