import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Link, router } from 'expo-router';
import { Screen, Header, Input, Button } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

export default function LoginScreen() {
  const { t } = useLanguage();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email || !password) {
      setError(t('fillAllFields'));
      return;
    }
    setLoading(true);
    try {
      await signIn(email, password);
      router.replace('/schools');
    } catch (e) {
      setError(t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title={t('login')} subtitle={t('appName')} />
      <View style={styles.form}>
        <Input label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={t('loginCta')} onPress={onSubmit} loading={loading} />
        <Link href="/role" style={styles.link}>
          <Text style={styles.linkText}>{t('noAccountYet')} {t('signupCta')}</Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md, textAlign: 'center' },
  link: { marginTop: spacing.lg, alignSelf: 'center' },
  linkText: { color: colors.primary, fontWeight: '600' },
});
