/**
 * Labeled text input that auto-aligns for RTL/LTR.
 */
import React from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { colors, radius, spacing } from '@/theme/colors';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.mutedText}
        style={[
          styles.input,
          { textAlign: isRTL ? 'right' : 'left' },
          error ? styles.inputError : null,
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: spacing.lg },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.softBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.textDark,
    minHeight: 50,
  },
  inputError: { borderColor: colors.danger },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
