import React, { useState, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Text } from '@/components/ui/Text';
import { AppIcon } from '@/components/ui/AppIcon';
import { Colors } from '@/constants/colors';
import { Spacing, Radius } from '@/constants/spacing';
import { useTheme } from '@/hooks/use-theme';

// BottomSheet has paddingHorizontal: Spacing[6] = 24px each side → 48px total
const SHEET_PAD = Spacing[6] * 2;
const CELL_W = Math.floor((Dimensions.get('window').width - SHEET_PAD) / 7);
const CELL_H = CELL_W;

const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function toLocalMidnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function buildCalendarGrid(year: number, month: number): Array<Date | null> {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Dom
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<Date | null> = [];

  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  // Preenche até múltiplo de 7
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface Props {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: Date) => void;
  selectedDate: Date | null;
}

export function CalendarPicker({ visible, onClose, onSelect, selectedDate }: Props) {
  const { theme } = useTheme();
  const today = toLocalMidnight(new Date());

  const [displayYear, setDisplayYear] = useState(today.getFullYear());
  const [displayMonth, setDisplayMonth] = useState(today.getMonth());

  useEffect(() => {
    if (visible) {
      const base = selectedDate ? toLocalMidnight(selectedDate) : today;
      setDisplayYear(base.getFullYear());
      setDisplayMonth(base.getMonth());
    }
  }, [visible]);

  function prevMonth() {
    if (displayMonth === 0) {
      setDisplayMonth(11);
      setDisplayYear((y) => y - 1);
    } else {
      setDisplayMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (displayMonth === 11) {
      setDisplayMonth(0);
      setDisplayYear((y) => y + 1);
    } else {
      setDisplayMonth((m) => m + 1);
    }
  }

  const cells = buildCalendarGrid(displayYear, displayMonth);

  const selectedMidnight = selectedDate ? toLocalMidnight(selectedDate).getTime() : null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title="Escolher data">
      <ScrollView showsVerticalScrollIndicator={false}>
      {/* Navegação de mês */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <AppIcon name="chevronLeft" size={24} color={Colors.primary} />
        </TouchableOpacity>
        <Text variant="callout" weight="semibold" style={{ color: theme.colors.text }}>
          {MONTH_NAMES[displayMonth]} {displayYear}
        </Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <AppIcon name="chevronRight" size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Labels dos dias da semana */}
      <View style={styles.weekRow}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={i} style={styles.weekCell}>
            <Text variant="label" style={{ color: theme.colors.textTertiary, textAlign: 'center' }}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {/* Grid de dias */}
      <View style={styles.grid}>
        {cells.map((date, i) => {
          if (!date) {
            return <View key={`empty-${i}`} style={styles.dayCell} />;
          }

          const dateMidnight = toLocalMidnight(date).getTime();
          const isPast = dateMidnight < today.getTime();
          const isToday = dateMidnight === today.getTime();
          const isSelected = dateMidnight === selectedMidnight;

          return (
            <TouchableOpacity
              key={date.toISOString()}
              style={[
                styles.dayCell,
                isSelected && { backgroundColor: Colors.primary, borderRadius: Radius.full },
                isToday && !isSelected && {
                  borderWidth: 1.5,
                  borderColor: Colors.primary,
                  borderRadius: Radius.full,
                },
              ]}
              onPress={() => { if (!isPast) onSelect(date); }}
              disabled={isPast}
              activeOpacity={isPast ? 1 : 0.7}
            >
              <Text
                style={{
                  textAlign: 'center',
                  fontSize: 15,
                  lineHeight: CELL_H,
                  color: isSelected ? '#fff' : isPast ? theme.colors.textTertiary : isToday ? Colors.primary : theme.colors.text,
                  opacity: isPast ? 0.35 : 1,
                  fontWeight: isToday || isSelected ? '600' : '400',
                }}
              >
                {date.getDate()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[2],
    marginBottom: Spacing[3],
  },
  navBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: Spacing[1],
  },
  weekCell: {
    width: CELL_W,
    alignItems: 'center',
    paddingVertical: Spacing[1],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: CELL_W,
    height: CELL_H,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
