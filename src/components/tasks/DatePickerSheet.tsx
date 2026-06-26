import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import { BottomSheet } from '../ui/BottomSheet';
import { AppIcon, type AppIconName } from '../ui/AppIcon';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DatePickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string | undefined) => void;
  currentDate?: string;
}

// ─── Date options ─────────────────────────────────────────────────────────────

interface DateOption {
  key: string;
  label: string;
  sublabel: string;
  icon: AppIconName;
  date: string | undefined;
}

function buildDateOptions(): DateOption[] {
  const now = new Date();

  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);

  const nextWeekDate = new Date(now);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);

  const weekdayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const monthNames = [
    'jan', 'fev', 'mar', 'abr', 'mai', 'jun',
    'jul', 'ago', 'set', 'out', 'nov', 'dez',
  ];

  function toISODate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  function formatShort(d: Date): string {
    return `${weekdayNames[d.getDay()]}, ${d.getDate()} ${monthNames[d.getMonth()]}`;
  }

  return [
    {
      key: 'today',
      label: 'Hoje',
      sublabel: formatShort(now),
      icon: 'sun',
      date: toISODate(now),
    },
    {
      key: 'tomorrow',
      label: 'Amanhã',
      sublabel: formatShort(tomorrowDate),
      icon: 'sunrise',
      date: toISODate(tomorrowDate),
    },
    {
      key: 'next_week',
      label: 'Próxima semana',
      sublabel: formatShort(nextWeekDate),
      icon: 'calendar',
      date: toISODate(nextWeekDate),
    },
    {
      key: 'no_date',
      label: 'Sem data',
      sublabel: 'Remover prazo',
      icon: 'close',
      date: undefined,
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DatePickerSheet({
  visible,
  onClose,
  onSelect,
  currentDate,
}: DatePickerSheetProps) {
  const { theme } = useTheme();
  const options = buildDateOptions();

  const handleSelect = (date: string | undefined) => {
    onSelect(date);
    onClose();
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Prazo da tarefa">
      <View style={styles.optionList}>
        {options.map((opt) => {
          const isSelected = currentDate === opt.date;
          const isDestructive = opt.key === 'no_date';

          return (
            <TouchableOpacity
              key={opt.key}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected
                    ? theme.colors.primaryLight
                    : 'transparent',
                  borderBottomColor: theme.colors.borderLight,
                },
              ]}
              onPress={() => handleSelect(opt.date)}
              activeOpacity={0.7}
            >
              <View style={styles.optionIcon}>
                <AppIcon
                  name={opt.icon}
                  size={20}
                  color={isDestructive ? theme.colors.danger : theme.colors.textSecondary}
                />
              </View>

              <View style={styles.optionText}>
                <Text
                  style={[
                    styles.optionLabel,
                    {
                      color: isDestructive
                        ? theme.colors.danger
                        : theme.colors.text,
                      fontWeight: isSelected ? '600' : '400',
                    },
                  ]}
                >
                  {opt.label}
                </Text>
                <Text
                  style={[
                    styles.optionSublabel,
                    { color: theme.colors.textSecondary },
                  ]}
                >
                  {opt.sublabel}
                </Text>
              </View>

              {isSelected && (
                <AppIcon name="check" size={16} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </BottomSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  optionList: {
    gap: 0,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  optionIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
  },
  optionSublabel: {
    fontSize: 13,
    marginTop: 2,
  },
});
