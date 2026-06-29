/**
 * Fallback screen for unmatched routes.
 */
import React from 'react';
import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme/colors';

export default function NotFound() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View style={styles.container}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.subtitle}>الصفحة غير موجودة / Page not found</Text>
        <Link href="/" style={styles.link}>
          العودة للرئيسية / Go home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  title: { fontSize: 48, fontWeight: '900', color: colors.primary },
  subtitle: { fontSize: 16, color: colors.textDark, marginTop: spacing.md },
  link: { marginTop: spacing.xl, color: colors.primaryDark, fontWeight: '700' },
});
