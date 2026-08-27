/**
 * "حسابي" — profile summary, language toggle, about, logout.
 */
import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { Screen, Header, Card, Button } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

export default function AccountScreen() {
  const { t, language, setLanguage } = useLanguage();
  const { profile, signOut } = useAuth();

  const roleLabel =
    profile?.role === 'designer'
      ? t('roleDesigner')
      : profile?.role === 'coordinator'
        ? t('roleCoordinator')
        : profile?.role === 'supervisor'
          ? t('roleSupervisor')
          : profile?.role ?? '';

  return (
    <Screen>
      <Header title={t('tabAccount')} />
      <View style={styles.body}>
        <Card style={styles.card}>
          <Text style={styles.name}>{profile?.full_name}</Text>
          <Text style={styles.sub}>{roleLabel}</Text>
          <Text style={styles.sub}>{profile?.email}</Text>
          {profile?.role === 'designer' ? (
            <Text style={styles.status}>
              {profile.status === 'pending' ? t('statusPending') : t('statusActive')}
            </Text>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('accountLanguage')}</Text>
          <View style={styles.langRow}>
            <Button
              title={t('arabic')}
              variant={language === 'ar' ? 'primary' : 'outline'}
              onPress={() => setLanguage('ar')}
              style={{ flex: 1 }}
            />
            <Button
              title={t('english')}
              variant={language === 'en' ? 'primary' : 'outline'}
              onPress={() => setLanguage('en')}
              style={{ flex: 1 }}
            />
          </View>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{t('accountAbout')}</Text>
          <Text style={styles.sub}>{t('appName')} — {t('appTagline')}</Text>
        </Card>

        <Button
          title={t('accountLogout')}
          variant="outline"
          onPress={() => Alert.alert(t('accountLogout'), '', [
            { text: t('cancel'), style: 'cancel' },
            { text: t('confirm'), onPress: () => signOut() },
          ])}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.xs },
  name: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  sub: { fontSize: 13, color: colors.mutedText },
  status: { fontSize: 12, color: colors.primary, fontWeight: '700', marginTop: spacing.xs },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: colors.textDark, marginBottom: spacing.sm },
  langRow: { flexDirection: 'row', gap: spacing.sm },
});
