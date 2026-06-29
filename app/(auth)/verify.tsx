/**
 * Screen 3b — Email OTP verification.
 * Confirms the email is real by entering the 6-digit code Supabase sent.
 * On success a session is created and we move to profile completion.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Header, Input, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

export default function VerifyScreen() {
  const { t } = useLanguage();
  const { verifyOtp, resendOtp } = useAuth();
  const { email } = useLocalSearchParams<{ email: string }>();

  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onVerify = async () => {
    setError(null);
    setInfo(null);
    if (!email || code.trim().length < 6) {
      setError(t('otpInvalid'));
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(email, code);
      // Session is now active; complete the job profile.
      router.replace('/(auth)/complete-profile');
    } catch (e: any) {
      setError(e?.message ?? t('otpInvalid'));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setInfo(null);
    try {
      if (email) await resendOtp(email);
      setInfo(t('otpSentTo') + ' ' + email);
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    }
  };

  return (
    <Screen>
      <Header title={t('verifyEmail')} showBack />

      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="mail-open-outline" size={36} color={colors.onPrimary} />
        </View>
        <Text style={styles.subtitle}>{t('otpSentTo')}</Text>
        <Text style={styles.email}>{email}</Text>
      </View>

      <Input
        label={t('otpCode')}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="------"
        style={styles.codeInput}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {info ? <Text style={styles.info}>{info}</Text> : null}

      <Button
        title={loading ? t('verifying') : t('verify')}
        onPress={onVerify}
        loading={loading}
        icon="checkmark-circle-outline"
      />

      <Pressable onPress={onResend} style={styles.resend} hitSlop={8}>
        <Text style={styles.resendText}>{t('resendOtp')}</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginVertical: spacing.xl },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  subtitle: { fontSize: 14, color: colors.mutedText },
  email: { fontSize: 16, fontWeight: '800', color: colors.textDark, marginTop: 4 },
  codeInput: { fontSize: 24, letterSpacing: 8, textAlign: 'center', fontWeight: '800' },
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.md },
  info: { color: colors.success, textAlign: 'center', marginBottom: spacing.md },
  resend: { alignSelf: 'center', marginTop: spacing.lg },
  resendText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
