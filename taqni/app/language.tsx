import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Button } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

export default function LanguageScreen() {
  const { t, language, setLanguage } = useLanguage();

  return (
    <Screen scroll={false}>
      <View style={styles.center}>
        <Text style={styles.appName}>{t('appName')}</Text>
        <Text style={styles.tagline}>{t('appTagline')}</Text>

        <Text style={styles.label}>{t('chooseLanguage')}</Text>
        <View style={styles.row}>
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

        <Button title={t('continue')} onPress={() => router.push('/role')} style={{ marginTop: spacing.xl, width: '100%' }} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  appName: { fontSize: 32, fontWeight: '800', color: colors.primary },
  tagline: { fontSize: 14, color: colors.mutedText, marginBottom: spacing.xl, textAlign: 'center' },
  label: { fontSize: 15, fontWeight: '600', color: colors.textDark, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.md, width: '100%' },
});
