import React from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: InputProps) {
  const { isRTL } = useLanguage();
  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{label}</Text> : null}
      <TextInput
        placeholderTextColor={colors.mutedText}
        style={[
          styles.input,
          { textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
          error ? { borderColor: colors.danger } : null,
          style,
        ]}
        {...rest}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: colors.textDark, marginBottom: spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.textDark,
    backgroundColor: colors.white,
  },
  error: { color: colors.danger, fontSize: 12, marginTop: spacing.xs },
});
