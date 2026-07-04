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
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
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
  SectionTitle,
  SignatureChooser,
  SignatureView,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  createEvaluation,
  createNotification,
  getAchievement,
  getEvaluationByAchievement,
  listAttachments,
  supervises,
} from '@/lib/api';
import { isEditableDocument } from '@/lib/documents';
import { formatDate } from '@/lib/format';
import type { Achievement, Attachment, Evaluation } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function EvaluateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [canEvaluate, setCanEvaluate] = useState(false);
  const [loading, setLoading] = useState(true);

  // Form state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [signaturePaths, setSignaturePaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setLoading(true);
    try {
      const ach = await getAchievement(id);
      setAchievement(ach);
      const [existing, atts] = await Promise.all([
        getEvaluationByAchievement(id),
        listAttachments(id),
      ]);
      setEvaluation(existing);
      setAttachments(atts);
      if (ach) {
        // You may evaluate only OTHERS' work, and only people inside YOUR
        // administrative chain (any level below you) — never outside it.
        const isOwner = ach.owner_id === profile.id;
        const sup = await supervises(profile.id, ach.owner_id);
        setCanEvaluate(!isOwner && sup);
      }
    } finally {
      setLoading(false);
    }
  }, [id, profile]);

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

  const onSubmit = async () => {
    setError(null);
    if (signaturePaths.length === 0) {
      setError(t('signatureRequired'));
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
        // Store the hand-drawn signature as serialized SVG paths.
        signature: JSON.stringify(signaturePaths),
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

      {/* Files/attachments — the supervisor opens them to review before signing. */}
      {attachments.length > 0 ? (
        <>
          <SectionTitle title={t('attachments')} />
          {attachments.map((att) => (
            <Card key={att.id} style={styles.attachCard}>
              <View style={[styles.attachRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Pressable
                  style={[styles.attachMain, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => {
                    // Editable Office documents open in the embedded editor
                    // (the supervisor can review/edit before signing).
                    if (isEditableDocument(att)) {
                      router.push(`/doc/${att.id}?name=${encodeURIComponent(att.name ?? '')}`);
                      return;
                    }
                    Linking.openURL(att.url).catch(() => {});
                  }}
                >
                  <View style={styles.attachIcon}>
                    <Ionicons
                      name={
                        att.type === 'image'
                          ? 'image'
                          : att.type === 'video'
                          ? 'videocam'
                          : att.type === 'link'
                          ? 'link'
                          : 'document'
                      }
                      size={20}
                      color={colors.primaryDark}
                    />
                  </View>
                  <Text style={styles.attachName} numberOfLines={1}>
                    {att.name ?? att.url}
                  </Text>
                </Pressable>
                {/* Supervisor signs & approves an image directly */}
                {att.type === 'image' && canEvaluate ? (
                  <Pressable
                    style={styles.signBtn}
                    onPress={() =>
                      router.push(
                        `/sign?image=${encodeURIComponent(att.url)}&achievement=${achievement.id}`
                      )
                    }
                    hitSlop={6}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.onPrimary} />
                  </Pressable>
                ) : null}
              </View>
            </Card>
          ))}
        </>
      ) : null}

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
              <SignatureView value={evaluation.signature} />
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

          <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('eSignature')}
          </Text>
          <SignatureChooser onChange={setSignaturePaths} />

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
  attachCard: { marginBottom: spacing.sm, paddingVertical: spacing.md },
  attachRow: { alignItems: 'center', gap: spacing.md },
  attachIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachName: { flex: 1, fontSize: 14, color: colors.textDark },
  attachMain: { flex: 1, alignItems: 'center', gap: spacing.md },
  signBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
