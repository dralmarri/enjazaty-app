/**
 * Supervisor evaluation of a subordinate's achievement.
 * [id] = achievement id. Opened from the employee profile page.
 *
 * Rules:
 *  - Only a supervisor (or admin) who is NOT the owner can evaluate.
 *  - Requires a star rating + an electronic signature (typed full name).
 *  - One evaluation per file: once submitted it is LOCKED and shown read-only
 *    (it never reopens). The report appears in the subordinate's Activity.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  Header,
  Input,
  Loading,
  Screen,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  createEvaluation,
  createNotification,
  getAchievement,
  getEvaluationByAchievement,
  supervises,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Achievement, Evaluation } from '@/types/database';
import { colors, spacing } from '@/theme/colors';

export default function EvaluateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [canEvaluate, setCanEvaluate] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [signature, setSignature] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setLoading(true);
    try {
      const ach = await getAchievement(id);
      setAchievement(ach);
      const existing = await getEvaluationByAchievement(id);
      setEvaluation(existing);
      if (ach) {
        // You may evaluate only OTHERS' work, and only if you supervise them
        // (admins may evaluate any subordinate's work too).
        const isOwner = ach.owner_id === profile.id;
        const sup = await supervises(profile.id, ach.owner_id);
        setCanEvaluate(!isOwner && (sup || isAdmin));
      }
    } finally {
      setLoading(false);
    }
  }, [id, profile, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Loading />;
  if (!achievement || !profile) {
    return (
      <Screen>
        <Header title={t('evaluation')} showBack />
      </Screen>
    );
  }

  // Pre-fill the signature with the supervisor's full name as a convenience.
  const onSubmit = async () => {
    setError(null);
    if (!signature.trim()) {
      setError(t('signHint'));
      return;
    }
    setSubmitting(true);
    try {
      await createEvaluation({
        achievement_id: achievement.id,
        employee_id: achievement.owner_id,
        evaluator_id: profile.id,
        rating,
        comment: comment.trim() || null,
        signature: signature.trim(),
      });
      // Notify the subordinate that their work was evaluated/approved.
      await createNotification({
        user_id: achievement.owner_id,
        title: t('evaluationReport'),
        body: `${t('rating')}: ${rating}/5`,
        type: 'evaluation',
        related_id: achievement.id,
      });
      await load(); // reloads into the locked state
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Header title={t('evaluation')} showBack />

      {/* Achievement summary */}
      <Card>
        <Text style={styles.achTitle}>{achievement.title}</Text>
        {achievement.description ? (
          <Text style={styles.achDesc}>{achievement.description}</Text>
        ) : null}
      </Card>

      {evaluation ? (
        /* ---------------- Locked, approved report ---------------- */
        <Card style={styles.section}>
          <View style={[styles.lockRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="lock-closed" size={18} color={colors.success} />
            <Badge label={t('evaluationLocked')} tone="success" />
          </View>
          <Text style={styles.lockHint}>{t('evaluationLockedHint')}</Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Ionicons
                key={n}
                name={n <= evaluation.rating ? 'star' : 'star-outline'}
                size={28}
                color={colors.primary}
              />
            ))}
          </View>
          {evaluation.comment ? (
            <Text style={styles.comment}>{evaluation.comment}</Text>
          ) : null}
          {evaluation.signature ? (
            <View style={styles.signBox}>
              <Text style={styles.signLabel}>{t('eSignature')}</Text>
              <Text style={styles.signValue}>✍️ {evaluation.signature}</Text>
            </View>
          ) : null}
          <Text style={styles.date}>{formatDate(evaluation.created_at, language)}</Text>
        </Card>
      ) : canEvaluate ? (
        /* ---------------- Evaluation form ---------------- */
        <Card style={styles.section}>
          <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('rating')}
          </Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
                <Ionicons
                  name={n <= rating ? 'star' : 'star-outline'}
                  size={34}
                  color={colors.primary}
                />
              </Pressable>
            ))}
          </View>

          <Input label={t('comment')} value={comment} onChangeText={setComment} multiline />

          <Input
            label={t('eSignature')}
            value={signature}
            onChangeText={setSignature}
            placeholder={t('signHint')}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title={submitting ? t('saving') : t('submitEvaluation')}
            icon="checkmark-done-outline"
            onPress={onSubmit}
            loading={submitting}
          />
        </Card>
      ) : (
        /* ---------------- Not allowed (own file) ---------------- */
        <Card style={styles.section}>
          <View style={styles.notAllowed}>
            <Ionicons name="information-circle-outline" size={28} color={colors.mutedText} />
            <Text style={styles.notAllowedText}>{t('cannotEvaluateOwn')}</Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  achTitle: { fontSize: 18, fontWeight: '900', color: colors.textDark },
  achDesc: { fontSize: 14, color: colors.mutedText, marginTop: spacing.sm, lineHeight: 20 },
  section: { marginTop: spacing.lg, gap: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  starsRow: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  comment: { fontSize: 15, color: colors.textDark, textAlign: 'center' },
  lockRow: { alignItems: 'center', gap: spacing.sm },
  lockHint: { fontSize: 13, color: colors.mutedText, textAlign: 'center' },
  signBox: {
    backgroundColor: colors.softBackground,
    borderRadius: 12,
    padding: spacing.md,
    alignItems: 'center',
  },
  signLabel: { fontSize: 12, color: colors.mutedText },
  signValue: { fontSize: 18, fontWeight: '800', color: colors.primaryDark, marginTop: 2 },
  date: { fontSize: 11, color: colors.mutedText, textAlign: 'center' },
  error: { color: colors.danger, textAlign: 'center' },
  notAllowed: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.lg },
  notAllowedText: { fontSize: 14, color: colors.mutedText, textAlign: 'center' },
});
