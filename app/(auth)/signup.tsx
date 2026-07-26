/**
 * Screen 3 — Create account (email + password only).
 * The role was chosen on the previous screen and arrives as a route param.
 * On submit we sign up and move to the OTP verification screen.
 */
import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Button, Header, Input, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { setRememberMe } from '@/lib/supabase';
import type { UserRole } from '@/types/database';
import { colors, spacing } from '@/theme/colors';

export default function SignupScreen() {
  const { t, isRTL } = useLanguage();
  const { signUp } = useAuth();
  const params = useLocalSearchParams<{ role?: string }>();
  const role: UserRole = params.role === 'admin' ? 'admin' : 'employee';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError(t('required'));
      return;
    }
    if (password.length < 6) {
      setError(isRTL ? 'كلمة المرور 6 أحرف على الأقل' : 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirm) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      // Set BEFORE signing up, so the session is written to the right place.
      setRememberMe(remember);
      const { needsVerification } = await signUp(email, password, role);
      if (needsVerification) {
        // Go verify the email via the OTP code.
        router.replace(`/(auth)/verify?email=${encodeURIComponent(email.trim())}`);
      } else {
        // Email confirmation disabled → straight to profile completion.
        router.replace('/(auth)/complete-profile');
      }
    } catch (e: any) {
      // One email = one role: a registered email can never sign up again
      // (promotion to admin requires a NEW email).
      if (e?.message === 'EMAIL_TAKEN') {
        setError(t('emailAlreadyRegistered'));
      } else {
        setError(e?.message ?? t('error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header
        title={t('signup')}
        subtitle={role === 'admin' ? t('admin') : t('employee')}
        showBack
      />

      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Ionicons
            name={role === 'admin' ? 'shield-checkmark' : 'person'}
            size={32}
            color={colors.onPrimary}
          />
        </View>
      </View>

      <Input
        label={t('email')}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        placeholder="name@example.com"
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

      {/* Remember me — web only (a native app is expected to stay signed in). */}
      {Platform.OS === 'web' ? (
        <Pressable
          onPress={() => setRemember((v) => !v)}
          style={[styles.rememberRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
          hitSlop={8}
        >
          <Ionicons
            name={remember ? 'checkbox' : 'square-outline'}
            size={22}
            color={remember ? colors.primary : colors.mutedText}
          />
          <Text style={styles.rememberText}>{t('rememberMe')}</Text>
        </Pressable>
      ) : null}

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
  hero: { alignItems: 'center', marginBottom: spacing.lg },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rememberRow: {
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  rememberText: { fontSize: 14, color: colors.textDark, fontWeight: '600' },
  error: {
    color: colors.danger,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontSize: 14,
  },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: colors.mutedText, fontSize: 14 },
  link: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
});
