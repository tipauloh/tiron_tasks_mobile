import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import { BottomSheet } from '../ui/BottomSheet';
import { AppIcon } from '../ui/AppIcon';
import { useTaskLists } from '../../hooks/api/use-task-lists';

export interface ListSelectorProps {
  value: string | undefined;
  onChange: (listId: string | undefined) => void;
  visible: boolean;
  onClose: () => void;
}

export function ListSelector({ value, onChange, visible, onClose }: ListSelectorProps) {
  const { theme } = useTheme();
  const { data: lists = [] } = useTaskLists();

  const handleSelect = (id: string | undefined) => {
    onChange(id);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Selecionar lista">
      <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={styles.scroll}>
        <RadioOption
          label="Sem lista"
          sublabel="Tarefa sem categoria"
          color="#9CA3AF"
          isSelected={value === undefined}
          onSelect={() => handleSelect(undefined)}
          theme={theme}
        />
        {lists.map((list) => (
          <RadioOption
            key={list.id}
            label={list.name}
            icon={list.icon ?? undefined}
            color={list.color ?? '#9CA3AF'}
            isSelected={value === String(list.id)}
            onSelect={() => handleSelect(String(list.id))}
            theme={theme}
          />
        ))}
      </ScrollView>
    </BottomSheet>
  );
}

interface RadioOptionProps {
  label: string;
  sublabel?: string;
  icon?: string;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  theme: ReturnType<typeof import('../../hooks/use-theme')['useTheme']>['theme'];
}

function RadioOption({ label, sublabel, icon, color, isSelected, onSelect, theme }: RadioOptionProps) {
  return (
    <TouchableOpacity
      style={[styles.option, { backgroundColor: isSelected ? `${color}14` : 'transparent', borderBottomColor: theme.colors.borderLight }]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={[styles.colorSwatch, { backgroundColor: color }]}>
        {icon ? <Text style={styles.swatchEmoji}>{icon}</Text> : null}
      </View>
      <View style={styles.optionText}>
        <Text style={[styles.optionLabel, { color: theme.colors.text, fontWeight: isSelected ? '600' : '400' }]}>{label}</Text>
        {sublabel && <Text style={[styles.optionSublabel, { color: theme.colors.textSecondary }]}>{sublabel}</Text>}
      </View>
      <View style={[styles.radio, { borderColor: isSelected ? color : theme.colors.border }]}>
        {isSelected && <View style={[styles.radioFill, { backgroundColor: color }]} />}
      </View>
    </TouchableOpacity>
  );
}

export interface ListSelectorTriggerProps {
  value: string | undefined;
  onChange: (listId: string | undefined) => void;
}

export function ListSelectorTrigger({ value, onChange }: ListSelectorTriggerProps) {
  const [open, setOpen] = React.useState(false);
  const { theme } = useTheme();
  const { data: lists = [] } = useTaskLists();
  const selectedList = lists.find((l) => String(l.id) === value);

  return (
    <>
      <TouchableOpacity
        style={[styles.triggerRow, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <View style={[styles.triggerSwatch, { backgroundColor: selectedList?.color ?? '#9CA3AF' }]}>
          {selectedList?.icon ? <Text style={styles.swatchEmoji}>{selectedList.icon}</Text> : null}
        </View>
        <Text style={[styles.triggerLabel, { color: theme.colors.text }]}>
          {selectedList ? selectedList.name : 'Sem lista'}
        </Text>
        <AppIcon name="chevronRight" size={18} color={theme.colors.textTertiary} />
      </TouchableOpacity>

      <ListSelector value={value} onChange={onChange} visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 0 },
  option: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4, borderBottomWidth: StyleSheet.hairlineWidth, gap: 14 },
  colorSwatch: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  swatchEmoji: { fontSize: 16 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: 15 },
  optionSublabel: { fontSize: 12, marginTop: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  radioFill: { width: 10, height: 10, borderRadius: 5 },
  triggerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, gap: 10 },
  triggerSwatch: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  triggerLabel: { flex: 1, fontSize: 15 },
});
