import React from 'react';
import { StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { Colors } from '../../constants/colors';

interface DueDateLabelProps {
  dueDate?: string;
}

function parseDateParts(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split('-').map(Number);
  return { year, month, day };
}

function toMidnight(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

function formatDate(isoDate: string): string {
  const { year, month, day } = parseDateParts(isoDate);
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  return `${d}/${m}/${year}`;
}

function getDateLabel(isoDate: string): { label: string; color: string } {
  const { year, month, day } = parseDateParts(isoDate);
  const due = toMidnight(year, month, day);

  const now = new Date();
  const today = toMidnight(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (due.getTime() < today.getTime()) {
    return { label: formatDate(isoDate), color: Colors.danger };
  }
  if (due.getTime() === today.getTime()) {
    return { label: 'Hoje', color: Colors.success };
  }
  if (due.getTime() === tomorrow.getTime()) {
    return { label: 'Amanhã', color: Colors.info };
  }
  return { label: formatDate(isoDate), color: Colors.priorityLow };
}

export function DueDateLabel({ dueDate }: DueDateLabelProps) {
  if (!dueDate) return null;

  const { label, color } = getDateLabel(dueDate);

  return (
    <Text variant="caption" style={[styles.text, { color }]}>
      {label}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontWeight: '500',
  },
});
