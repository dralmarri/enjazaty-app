/**
 * Privacy screen — short, bilingual privacy notice.
 */
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { Card, Header, Screen } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';

export default function PrivacyScreen() {
  const { t, isRTL } = useLanguage();
  const align = { textAlign: isRTL ? ('right' as const) : ('left' as const) };

  const paragraphs = isRTL
    ? [
        'نحن في تطبيق "إنجازاتي" نحترم خصوصيتك ونحمي بياناتك.',
        'تُخزَّن بياناتك (الملف الشخصي، الإنجازات، المرفقات) بشكل آمن في خوادم Supabase وتُحمى بسياسات الوصول (Row Level Security).',
        'لا يطّلع على ملفاتك إلا أنت والمسؤولون المصرّح لهم (الأعضاء) الذين تتم إضافتهم عبر معرّف المستخدم.',
        'التقييمات والتوقيعات الإلكترونية تُسجَّل لأغراض المتابعة الإدارية فقط.',
        'لا نشارك بياناتك مع أي طرف ثالث لأغراض تسويقية.',
        'يمكنك حذف حسابك أو طلب حذف بياناتك في أي وقت.',
      ]
    : [
        'Enjazaty respects your privacy and protects your data.',
        'Your data (profile, achievements, attachments) is stored securely on Supabase and protected by Row Level Security policies.',
        'Only you and authorized supervisors (members) added via your User ID can view your files.',
        'Evaluations and electronic signatures are recorded for administrative tracking only.',
        'We never share your data with third parties for marketing.',
        'You can delete your account or request data deletion at any time.',
      ];

  return (
    <Screen>
      <Header title={t('privacy')} showBack />
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
