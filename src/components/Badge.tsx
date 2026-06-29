/**
 * Small status/label badge with semantic color tones.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/theme/colors';

type Tone = 'primary' | 'success' | 'danger' | 'muted';

interface BadgeProps {
  label: string;
  tone?: Tone;
}

export function Badge({ label, tone = 'primary' }: BadgeProps) {
  const palette: Record<Tone, { bg: string; fg: string }> = {
    primary: { bg: colors.softBackground, fg: colors.primaryDark },
    success: { bg: '#DCFCE7', fg: colors.success },
    danger: { bg: '#FEE2E2', fg: colors.danger },
    muted: { bg: '#F3F4F6', fg: colors.mutedText },
  };
  const { bg, fg } = palette[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  text: { fontSize: 12, fontWeight: '700' },
});
