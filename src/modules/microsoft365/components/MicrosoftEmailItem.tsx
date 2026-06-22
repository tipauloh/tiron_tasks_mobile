import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text } from '../../../components/ui';
import { useTheme } from '../../../hooks/use-theme';
import { Colors } from '../../../constants/colors';
import { Spacing } from '../../../constants/spacing';
import type { Microsoft365Item } from '../types';

interface Props {
  item: Microsoft365Item;
}

/** Linha de e-mail sinalizado (read-only). Mostra remetente, assunto e resumo local. */
export function MicrosoftEmailItem({ item }: Props) {
  const { theme } = useTheme();
  const unread = item.emailIsRead === false;

  return (
    <Card padding={3}>
      <View style={styles.headerRow}>
        <Text style={styles.flag}>🚩</Text>
        <Text variant="caption" secondary numberOfLines={1} style={{ flex: 1 }}>
          {item.emailFrom ?? 'Remetente desconhecido'}
        </Text>
        {unread && <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} />}
      </View>
      <Text
        variant="callout"
        weight={unread ? 'semibold' : 'regular'}
        numberOfLines={2}
        style={{ color: theme.colors.text, marginTop: Spacing[1] }}
      >
        {item.title}
      </Text>
      {item.summary ? (
        <Text variant="caption" secondary numberOfLines={3} style={{ marginTop: Spacing[1] }}>
          {item.summary}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2] },
  flag: { fontSize: 14 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
