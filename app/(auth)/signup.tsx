/**
 * Screen 3 — Create account + complete the job profile.
 * Includes user-type selection (admin / employee) and job details.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Button, Input, Screen, Header } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import type { UserRole } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function SignupScreen() {
  const { t, isRTL } = useLanguage();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!fullName || !email || !password) {
      setError(t('required'));
      return;
    }
    if (password !== confirm) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await signUp({ email, password, fullName, role, jobTitle, phone });
      router.replace('/(tabs)/workspace');
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setLoading(false);
    }
  };

  const roles: { value: UserRole; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { value: 'employee', label: t('employee'), icon: 'person-outline' },
    { value: 'admin', label: t('admin'), icon: 'shield-checkmark-outline' },
  ];

  return (
    <Screen>
      <Header title={t('signup')} subtitle={t('completeProfile')} showBack />

      <Input label={t('fullName')} value={fullName} onChangeText={setFullName} />
      <Input
        label={t('email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="name@example.com"
      />

      {/* User type selection */}
      <Text style={styles.label}>{t('userType')}</Text>
      <View style={styles.roleRow}>
        {roles.map((r) => {
          const active = role === r.value;
          return (
            <Pressable
              key={r.value}
              onPress={() => setRole(r.value)}
              style={[styles.roleCard, active && styles.roleCardActive]}
            >
              <Ionicons
                name={r.icon}
                size={26}
                color={active ? colors.primaryDark : colors.mutedText}
              />
              <Text style={[styles.roleText, active && styles.roleTextActive]}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Input label={t('jobTitle')} value={jobTitle} onChangeText={setJobTitle} />
      <Input
        label={t('phone')}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
      />
      <Input
        label={t('password')}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="••••••••"
      />
      <Input
        label={t('confirmPassword')}
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        placeholder="••••••••"
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={loading ? t('creatingAccount') : t('signup')}
        onPress={onSubmit}
        loading={loading}
        icon="person-add-outline"
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
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
  roleRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  roleCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  roleCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.softBackground,
  },
  roleText: { fontSize: 14, fontWeight: '700', color: colors.mutedText },
  roleTextActive: { color: colors.primaryDark },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontSize: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: { color: colors.mutedText, fontSize: 14 },
  link: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
});
