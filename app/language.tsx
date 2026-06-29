/**
 * Screen 1 — Language selection (Arabic / English).
 * RTL-first: Arabic is preselected.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Button, Screen } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import type { Language } from '@/i18n/translations';
import { colors, radius, spacing } from '@/theme/colors';

export default function LanguageScreen() {
  const { language, setLanguage, t } = useLanguage();
  const [selected, setSelected] = useState<Language>(language);

  const options: { code: Language; label: string; native: string }[] = [
    { code: 'ar', label: t('arabic'), native: 'العربية' },
    { code: 'en', label: t('english'), native: 'English' },
  ];

  const onContinue = async () => {
    await setLanguage(selected);
    router.replace('/(auth)/login');
  };

  return (
    <Screen padded>
      <View style={styles.hero}>
        <View style={styles.logoCircle}>
          <Ionicons name="ribbon" size={44} color={colors.onPrimary} />
        </View>
        <Text style={styles.appName}>{t('appName')}</Text>
        <Text style={styles.tagline}>{t('tagline')}</Text>
      </View>

      <Text style={styles.heading}>{t('chooseLanguage')}</Text>

      <View style={styles.options}>
        {options.map((opt) => {
          const active = selected === opt.code;
          return (
            <Pressable
              key={opt.code}
              onPress={() => setSelected(opt.code)}
              style={[styles.option, active && styles.optionActive]}
            >
              <View>
                <Text style={[styles.optionNative, active && styles.optionTextActive]}>
                  {opt.native}
                </Text>
                <Text style={styles.optionLabel}>{opt.label}</Text>
              </View>
              <Ionicons
                name={active ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={active ? colors.primary : colors.mutedText}
              />
            </Pressable>
          );
        })}
      </View>

      <Button title={t('continue')} icon="arrow-forward" onPress={onContinue} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xxl },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  appName: { fontSize: 30, fontWeight: '900', color: colors.textDark },
  tagline: {
    fontSize: 15,
    color: colors.mutedText,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  heading: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  options: { gap: spacing.md, marginBottom: spacing.xl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.softBackground,
  },
  optionNative: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  optionTextActive: { color: colors.primaryDark },
  optionLabel: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
});
