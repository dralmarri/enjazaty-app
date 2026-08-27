import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme/colors';

export function EmptyState({
  icon = 'file-tray-outline',
  message,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  message: string;
}) {
  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={40} color={colors.mutedText} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
  text: { color: colors.mutedText, fontSize: 14, textAlign: 'center' },
});
