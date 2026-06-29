/**
 * Friendly empty-state placeholder with an icon and message.
 */
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme/colors';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
  hint?: string;
}

export function EmptyState({ icon = 'sparkles-outline', message, hint }: EmptyStateProps) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={36} color={colors.primaryDark} />
      </View>
      <Text style={styles.message}>{message}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingVertical: spacing.xxl },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textDark,
    textAlign: 'center',
  },
  hint: {
    fontSize: 13,
    color: colors.mutedText,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
