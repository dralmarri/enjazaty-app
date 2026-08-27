import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { colors, spacing } from '@/theme/colors';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.wrap}>
        <Text style={styles.title}>404</Text>
        <Link href="/" style={styles.link}>
          <Text style={styles.linkText}>الرئيسية</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.background },
  title: { fontSize: 32, fontWeight: '800', color: colors.textDark },
  link: { marginTop: spacing.md },
  linkText: { color: colors.primary, fontWeight: '700' },
});
