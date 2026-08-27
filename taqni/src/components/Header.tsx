import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/theme/colors';
import { useLanguage } from '@/context/LanguageContext';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

/** High-emphasis chrome — the one place allowed to use the darker indigo. */
export function Header({ title, subtitle }: HeaderProps) {
  const insets = useSafeAreaInsets();
  const { isRTL } = useLanguage();
  return (
    <View style={[styles.wrap, { paddingTop: insets.top + spacing.md }]}>
      <Text style={[styles.title, { textAlign: isRTL ? 'right' : 'left' }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { textAlign: isRTL ? 'right' : 'left' }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.primaryDark,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  title: { color: colors.white, fontSize: 20, fontWeight: '800' },
  subtitle: { color: '#E4E5FA', fontSize: 13, marginTop: 2 },
});
