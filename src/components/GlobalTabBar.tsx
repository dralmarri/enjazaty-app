/**
 * Persistent bottom navigation bar — rendered once at the root layout so it
 * stays fixed on every authenticated screen (workspace, employee profile,
 * achievement details, folders, notes, …), not just the four tab routes.
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

const TABS: {
  key: string;
  href: '/workspace' | '/my-achievements' | '/activity' | '/search' | '/account';
  labelKey: 'workspace' | 'myAchievements' | 'activity' | 'search' | 'account';
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'workspace', href: '/workspace', labelKey: 'workspace', icon: 'home-outline' },
  {
    key: 'my-achievements',
    href: '/my-achievements',
    labelKey: 'myAchievements',
    icon: 'documents-outline',
  },
  { key: 'activity', href: '/activity', labelKey: 'activity', icon: 'pulse-outline' },
  { key: 'search', href: '/search', labelKey: 'search', icon: 'search-outline' },
  { key: 'account', href: '/account', labelKey: 'account', icon: 'person-circle-outline' },
];

export function GlobalTabBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bar,
        // Lift the row off the very bottom edge: always add a base gap on top
        // of the device safe-area inset (home indicator), so labels never hug
        // the bottom of the screen.
        { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.md },
      ]}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const color = active ? colors.primaryDark : colors.mutedText;
        return (
          <Pressable
            key={tab.key}
            style={styles.item}
            onPress={() => router.push(tab.href)}
            hitSlop={4}
          >
            <Ionicons name={tab.icon} size={24} color={color} />
            <Text style={[styles.label, { color }]}>{t(tab.labelKey)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  item: { flex: 1, alignItems: 'center', gap: 2 },
  label: { fontSize: 11, fontWeight: '600' },
});
