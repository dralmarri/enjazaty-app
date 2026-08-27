/**
 * Persistent bottom navigation bar. Labels adapt to role per spec: designers
 * see "سجلاتي" on the visits tab, coordinator/supervisor see "زياراتي".
 */
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing } from '@/theme/colors';
import type { TranslationKey } from '@/i18n/translations';

export function GlobalTabBar() {
  const { t } = useLanguage();
  const { profile } = useAuth();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const isDesigner = profile?.role === 'designer';

  const tabs: {
    key: string;
    href: '/schools' | '/visits' | '/activities' | '/search' | '/account';
    labelKey: TranslationKey;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: 'schools', href: '/schools', labelKey: 'tabHome', icon: 'school-outline' },
    {
      key: 'visits',
      href: '/visits',
      labelKey: isDesigner ? 'tabVisitsDesigner' : 'tabVisitsCoordinator',
      icon: 'calendar-outline',
    },
    { key: 'activities', href: '/activities', labelKey: 'tabActivities', icon: 'sparkles-outline' },
    { key: 'search', href: '/search', labelKey: 'tabSearch', icon: 'search-outline' },
    { key: 'account', href: '/account', labelKey: 'tabAccount', icon: 'person-circle-outline' },
  ];

  return (
    <View
      style={[
        styles.bar,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.md },
      ]}
    >
      {tabs.map((tab) => {
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
