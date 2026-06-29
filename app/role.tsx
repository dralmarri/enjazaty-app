/**
 * Screen 2 — Choose user type (Employee / Admin) BEFORE registration.
 * The chosen role is carried to the signup screen as a route param.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Button, Header, Screen } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import type { UserRole } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function RoleScreen() {
  const { t } = useLanguage();
  const [role, setRole] = useState<UserRole>('employee');

  const options: {
    value: UserRole;
    label: string;
    desc: string;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      value: 'employee',
      label: t('employee'),
      desc: t('employeeDesc'),
      icon: 'person-outline',
    },
    {
      value: 'admin',
      label: t('admin'),
      desc: t('adminDesc'),
      icon: 'shield-checkmark-outline',
    },
  ];

  return (
    <Screen>
      <Header title={t('chooseUserType')} subtitle={t('chooseUserTypeHint')} showBack />

      <View style={styles.list}>
        {options.map((opt) => {
          const active = role === opt.value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => setRole(opt.value)}
              style={[styles.card, active && styles.cardActive]}
            >
              <View style={[styles.iconCircle, active && styles.iconCircleActive]}>
                <Ionicons
                  name={opt.icon}
                  size={28}
                  color={active ? colors.onPrimary : colors.primaryDark}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, active && styles.labelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.desc}>{opt.desc}</Text>
              </View>
              <Ionicons
                name={active ? 'radio-button-on' : 'radio-button-off'}
                size={24}
                color={active ? colors.primary : colors.mutedText}
              />
            </Pressable>
          );
        })}
      </View>

      <Button
        title={t('continue')}
        icon="arrow-forward"
        onPress={() => router.push(`/(auth)/signup?role=${role}`)}
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('haveAccount')} </Text>
        <Link href="/(auth)/login" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.link}>{t('login')}</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, marginTop: spacing.lg, marginBottom: spacing.xl },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  cardActive: { borderColor: colors.primary, backgroundColor: colors.softBackground },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleActive: { backgroundColor: colors.primary },
  label: { fontSize: 17, fontWeight: '800', color: colors.textDark },
  labelActive: { color: colors.primaryDark },
  desc: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.mutedText, fontSize: 14 },
  link: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
});
