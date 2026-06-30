/**
 * Terms of Use — short, bilingual terms.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Card, Header, Screen } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

export default function TermsScreen() {
  const { t, isRTL } = useLanguage();
  const align = { textAlign: isRTL ? ('right' as const) : ('left' as const) };

  const paragraphs = isRTL
    ? [
        'باستخدامك تطبيق "إنجازاتي" فإنك توافق على هذه الشروط.',
        'التطبيق مخصص لإدارة وتوثيق الإنجازات المهنية للموظفين والمسؤولين.',
        'أنت مسؤول عن دقة البيانات والمرفقات التي ترفعها، وعن سرية بيانات دخولك.',
        'يُمنع رفع أي محتوى مخالف للأنظمة أو ينتهك حقوق الآخرين.',
        'التقييمات والتوقيعات الإلكترونية تُستخدم للأغراض الإدارية فقط.',
        'يحق لإدارة التطبيق تعليق أي حساب يُساء استخدامه.',
        'قد تُحدَّث هذه الشروط من وقت لآخر، ويسري التحديث فور نشره.',
      ]
    : [
        'By using Enjazaty you agree to these terms.',
        'The app is intended for managing and documenting professional achievements.',
        'You are responsible for the accuracy of the data you upload and for keeping your credentials secure.',
        'Uploading unlawful content or content that infringes others’ rights is prohibited.',
        'Evaluations and electronic signatures are used for administrative purposes only.',
        'We may suspend any account that is misused.',
        'These terms may be updated from time to time; updates take effect upon publishing.',
      ];

  return (
    <Screen>
      <Header title={t('termsOfUse')} showBack />
      <Card>
        {paragraphs.map((p, i) => (
          <Text key={i} style={[styles.paragraph, align]}>
            • {p}
          </Text>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    fontSize: 14,
    lineHeight: 24,
    color: colors.textDark,
    marginBottom: spacing.md,
  },
});
