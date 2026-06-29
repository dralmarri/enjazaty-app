/**
 * Screen 12 — Account & settings.
 * Shows the profile card (with the unique User ID), language switcher,
 * account info rows, and logout.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Avatar, Badge, Button, Card, Header, Screen, SectionTitle } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import type { Language } from '@/i18n/translations';
import { colors, radius, spacing } from '@/theme/colors';

export default function AccountScreen() {
  const { profile, isAdmin, signOut } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/language');
    } finally {
      setLoggingOut(false);
    }
  };

  const langs: { code: Language; label: string }[] = [
    { code: 'ar', label: t('arabic') },
    { code: 'en', label: t('english') },
  ];

  const infoRows = [
    { icon: 'mail-outline' as const, label: t('email'), value: profile?.email },
    { icon: 'id-card-outline' as const, label: t('yourUserId'), value: profile?.user_code },
    { icon: 'briefcase-outline' as const, label: t('jobTitle'), value: profile?.job_title || '—' },
    { icon: 'call-outline' as const, label: t('phone'), value: profile?.phone || '—' },
  ];

  return (
    <Screen>
      <Header title={t('account')} />

      {/* Profile card */}
      <Card style={styles.profileCard}>
        <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={72} />
        <Text style={styles.name}>{profile?.full_name}</Text>
        <Badge label={isAdmin ? t('admin') : t('employee')} tone="primary" />
      </Card>

      {/* Account info */}
      <SectionTitle title={t('darkInfo')} />
      <Card>
        {infoRows.map((row, idx) => (
          <View
            key={row.label}
            style={[
              styles.infoRow,
              { flexDirection: isRTL ? 'row-reverse' : 'row' },
              idx < infoRows.length - 1 && styles.infoBorder,
            ]}
          >
            <View style={[styles.infoLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Ionicons name={row.icon} size={18} color={colors.primaryDark} />
              <Text style={styles.infoLabel}>{row.label}</Text>
            </View>
            <Text style={styles.infoValue} numberOfLines={1}>
              {row.value}
            </Text>
          </View>
        ))}
      </Card>

      {/* Language switcher */}
      <SectionTitle title={t('language')} />
      <View style={styles.langRow}>
        {langs.map((l) => {
          const active = language === l.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              style={[styles.langChip, active && styles.langChipActive]}
            >
              <Ionicons
                name="globe-outline"
                size={18}
                color={active ? colors.primaryDark : colors.mutedText}
              />
              <Text style={[styles.langText, active && styles.langTextActive]}>
                {l.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title={t('logout')}
        variant="danger"
        icon="log-out-outline"
        onPress={onLogout}
        loading={loggingOut}
        style={{ marginTop: spacing.xl }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 20, fontWeight: '900', color: colors.textDark, marginTop: spacing.sm },
  infoRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLeft: { alignItems: 'center', gap: spacing.sm },
  infoLabel: { fontSize: 14, color: colors.mutedText },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.textDark, maxWidth: '55%' },
  langRow: { flexDirection: 'row', gap: spacing.md },
  langChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  langChipActive: { borderColor: colors.primary, backgroundColor: colors.softBackground },
  langText: { fontSize: 14, fontWeight: '700', color: colors.mutedText },
  langTextActive: { color: colors.primaryDark },
});
