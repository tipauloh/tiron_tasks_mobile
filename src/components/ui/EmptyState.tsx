import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Button } from './Button';
import { AppIcon, type AppIconName } from './AppIcon';
import { useTheme } from '@/hooks/use-theme';
import { Spacing } from '../../constants/spacing';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: AppIconName;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, icon, actionLabel, onAction }: EmptyStateProps) {
  const { theme } = useTheme();
  return (
    <View style={styles.container}>
      {icon && (
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <AppIcon name={icon} size={32} color={theme.colors.textTertiary} />
        </View>
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
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing[4],
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
