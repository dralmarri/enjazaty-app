/**
 * Screen 2 — Login with email + password.
 */
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Button, Input, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

export default function LoginScreen() {
  const { t } = useLanguage();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
