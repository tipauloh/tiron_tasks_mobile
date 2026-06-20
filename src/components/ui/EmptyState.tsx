import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { Spacing } from '../../constants/spacing';
import { FontSize } from '../../constants/typography';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon && (
        <Text style={styles.icon}>{icon}</Text>
      )}
      <Text variant="headline" weight="semibold" style={styles.title}>
        {title}
      </Text>
      {description && (
        <Text variant="body" secondary style={styles.description}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} size="md" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing[8],
    paddingVertical: Spacing[10],
  },
  icon: {
    fontSize: FontSize['3xl'] * 1.5,
    marginBottom: Spacing[4],
    textAlign: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: Spacing[2],
  },
  description: {
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing[6],
  },
  action: {
    marginTop: Spacing[2],
  },
});
