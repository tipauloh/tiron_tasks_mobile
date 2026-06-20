import React, { ReactNode, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../../hooks/use-theme';
import { Text } from './Text';
import { Colors } from '../../constants/colors';
import { FontSize } from '../../constants/typography';
import { Radius, Spacing } from '../../constants/spacing';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  containerStyle?: ViewStyle;
}

export function Input({
  label,
  error,
  leftIcon,
  containerStyle,
  style,
  multiline,
  ...props
}: InputProps) {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? Colors.danger
    : focused
    ? Colors.primary
    : theme.colors.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text variant="label" style={styles.label} secondary>
          {label}
        </Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            borderColor,
            backgroundColor: theme.colors.surface,
            borderRadius: Radius.md,
            minHeight: multiline ? 80 : 44,
          },
        ]}
      >
        {leftIcon && (
          <View style={styles.leftIcon}>{leftIcon}</View>
        )}
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text,
              fontSize: FontSize.base,
              paddingLeft: leftIcon ? 0 : Spacing[3],
              textAlignVertical: multiline ? 'top' : 'center',
              paddingTop: multiline ? Spacing[3] : 0,
            },
            style,
          ]}
          placeholderTextColor={theme.colors.textTertiary}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          {...props}
        />
      </View>
      {error && (
        <Text variant="caption" style={[styles.errorText, { color: Colors.danger }]}>
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  leftIcon: {
    paddingHorizontal: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    paddingRight: Spacing[3],
    paddingVertical: Spacing[2],
  },
  errorText: {
    marginTop: 2,
  },
});
