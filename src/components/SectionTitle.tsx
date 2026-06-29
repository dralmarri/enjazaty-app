/**
 * Section heading with an optional trailing action (e.g. "See all").
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

interface SectionTitleProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionTitle({ title, actionLabel, onAction }: SectionTitleProps) {
  const { isRTL } = useLanguage();
  return (
    <View
      style={[
        styles.row,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      <Text style={styles.title}>{title}</Text>
      {actionLabel ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.action}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  action: { fontSize: 14, fontWeight: '600', color: colors.primaryDark },
});
