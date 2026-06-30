/**
 * Contact us — feedback form (matches the requested design):
 * a header card, an email field, a message field, and a Send button.
 * Submissions are stored in the contact_messages table.
 */
import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button, Card, Header, Input, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { createContactMessage } from '@/lib/api';
import { colors, radius, spacing } from '@/theme/colors';

export default function ContactScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [email, setEmail] = useState(profile?.email ?? '');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSend = async () => {
    setError(null);
    if (!email.trim() || !message.trim()) {
      setError(t('required'));
      return;
    }
    setSending(true);
    try {
      await createContactMessage({
        user_id: profile?.id ?? '',
        email: email.trim(),
        message: message.trim(),
      });
      setMessage('');
      setSent(true);
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setSending(false);
    }
  };

  const align = { textAlign: isRTL ? ('right' as const) : ('left' as const) };

  return (
    <Screen>
      <Header title={t('contactUs')} showBack />

      {/* Intro card */}
      <Card style={styles.introCard}>
        <Text style={[styles.introTitle, align]}>{t('contactHeader')}</Text>
        <Text style={[styles.introDesc, align]}>{t('contactDesc')}</Text>
      </Card>

      {/* Form card */}
      <Card style={styles.formCard}>
        {sent ? (
          <View style={styles.success}>
            <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            <Text style={styles.successText}>{t('messageSent')}</Text>
            <Button
              title={t('close')}
              variant="outline"
              onPress={() => setSent(false)}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : (
          <>
            <Input
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="name@example.com"
            />
            <Input
              label={t('yourSuggestion')}
              value={message}
              onChangeText={setMessage}
              placeholder={t('writeMessageHere')}
              multiline
              numberOfLines={6}
              style={styles.textArea}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
              <Button
                title={sending ? t('saving') : t('send')}
                icon="send-outline"
                onPress={onSend}
                loading={sending}
                fullWidth={false}
                style={styles.sendBtn}
              />
            </View>
          </>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  introCard: { backgroundColor: colors.softBackground, gap: spacing.sm },
  introTitle: { fontSize: 20, fontWeight: '900', color: colors.textDark },
  introDesc: { fontSize: 14, color: colors.mutedText, lineHeight: 22 },
  formCard: { marginTop: spacing.lg },
  textArea: { minHeight: 130, textAlignVertical: 'top' },
  sendBtn: { paddingHorizontal: spacing.xxl, borderRadius: radius.pill },
  error: { color: colors.danger, marginBottom: spacing.md, textAlign: 'center' },
  success: { alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm },
  successText: { fontSize: 16, fontWeight: '700', color: colors.textDark, textAlign: 'center' },
});
