/**
 * Screen 2 — Login with email + password.
 */
import React, { useState } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import { Button, Input, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { setRememberMe } from '@/lib/supabase';
import { colors, spacing } from '@/theme/colors';

export default function LoginScreen() {
  const { t, isRTL } = useLanguage();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError(t('required'));
      return;
    }
    setLoading(true);
    try {
      // Set BEFORE signing in, so the session is written to the right place.
      setRememberMe(remember);
      await signIn(email, password);
      router.replace('/(tabs)/workspace');
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.hero}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>{t('login')}</Text>
        <Text style={styles.subtitle}>{t('appName')}</Text>
      </View>

      <Input
        label={t('email')}
        value={email}
        onChangeText={setEmail}
        placeholder="name@example.com"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Input
        label={t('password')}
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
        secureTextEntry
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
        title={loading ? t('loggingIn') : t('login')}
        onPress={onSubmit}
        loading={loading}
        icon="log-in-outline"
      />

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('noAccount')} </Text>
        <Link href="/(auth)/signup" asChild>
          <Pressable hitSlop={8}>
            <Text style={styles.link}>{t('signup')}</Text>
          </Pressable>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xl },
  logo: {
    width: 92,
    height: 92,
    borderRadius: 22,
    marginBottom: spacing.md,
  },
  title: { fontSize: 26, fontWeight: '900', color: colors.textDark },
  subtitle: { fontSize: 14, color: colors.mutedText, marginTop: spacing.xs },
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xl,
  },
  footerText: { color: colors.mutedText, fontSize: 14 },
  link: { color: colors.primaryDark, fontWeight: '800', fontSize: 14 },
});
