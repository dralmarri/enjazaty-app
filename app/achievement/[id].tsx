/**
 * Screen 7 — Achievement details.
 *
 * Shows the achievement metadata, status, and its attachments. The owner can
 * submit a draft / delete it; an admin can open the notes & evaluation screen.
 */
import React, { useCallback, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Header,
  Loading,
  Screen,
  SectionTitle,
  Select,
  SignatureView,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  deleteAchievement,
  getAchievement,
  getEvaluationByAchievement,
  listAttachments,
  listFolders,
  updateAchievementFolder,
  updateAchievementStatus,
} from '@/lib/api';
import { isEditableDocument } from '@/lib/documents';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, Attachment, Evaluation, Folder } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function AchievementDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ach, atts, evalReport] = await Promise.all([
        getAchievement(id),
        listAttachments(id),
        getEvaluationByAchievement(id),
      ]);
      setAchievement(ach);
      setAttachments(atts);
      setEvaluation(evalReport);
      // Load the owner's folders so they can move this achievement.
      if (ach && ach.owner_id === profile?.id) {
        setFolders(await listFolders(ach.owner_id));
      }
    } finally {
      setLoading(false);
    }
  }, [id, profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Loading />;
  if (!achievement) {
    return (
      <Screen>
        <Header title={t('achievement')} showBack />
        <EmptyState icon="alert-circle-outline" message={t('error')} />
      </Screen>
    );
  }

  const isOwner = profile?.id === achievement.owner_id;
  const isApproved = achievement.status === 'approved';

  const onSubmit = async () => {
    await updateAchievementStatus(achievement.id, 'submitted');
    await load();
  };

  const onDelete = async () => {
    await deleteAchievement(achievement.id);
    router.back();
  };

  const onMoveToFolder = async (value: string) => {
    await updateAchievementFolder(achievement.id, value === '__none__' ? null : value);
    await load();
  };

  const openAttachment = (att: Attachment) => {
    // Editable Office documents open in the embedded in-app editor; the rest
    // keep the platform open/download behavior. Once approved, the content is
    // locked — editable documents fall back to plain open/download too.
    if (isEditableDocument(att) && !isApproved) {
      router.push(`/doc/${att.id}?name=${encodeURIComponent(att.name ?? '')}`);
      return;
    }
    Linking.openURL(att.url).catch(() => {});
  };

  const iconForType = (type: Attachment['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'image':
        return 'image';
      case 'video':
        return 'videocam';
      case 'audio':
        return 'mic';
      case 'link':
        return 'link';
      default:
        return 'document';
    }
  };

  return (
    <Screen>
      <Header title={t('details')} showBack />

      <Card>
        <View style={[styles.titleRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.title}>{achievement.title}</Text>
          <Badge label={t(achievement.status)} tone={statusTone(achievement.status)} />
        </View>
        {achievement.description ? (
          <Text style={styles.description}>{achievement.description}</Text>
        ) : null}
        <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="calendar-outline" size={16} color={colors.mutedText} />
          <Text style={styles.metaText}>
            {formatDate(achievement.date ?? achievement.created_at, language)}
          </Text>
        </View>
      </Card>

      {/* Attachments */}
      <SectionTitle title={t('attachments')} />
      {attachments.length === 0 ? (
        <EmptyState icon="attach-outline" message={t('attachments')} />
      ) : (
        attachments.map((att) => (
          <Card key={att.id} style={styles.attachCard} onPress={() => openAttachment(att)}>
            <View style={[styles.attachRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.attachIcon}>
                <Ionicons name={iconForType(att.type)} size={20} color={colors.primaryDark} />
              </View>
              <Text style={styles.attachName} numberOfLines={1}>
                {att.name ?? att.url}
              </Text>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.mutedText}
              />
            </View>
          </Card>
        ))
      )}

      {/* Evaluation report — locked/final once approved, or supervisor feedback
          the owner still needs to act on while status is 'sent'. */}
      {evaluation ? (
        <>
          <SectionTitle title={t('evaluationReport')} />
          <Card style={styles.evalCard}>
            <View style={[styles.evalTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= evaluation.rating ? 'star' : 'star-outline'}
                    size={18}
                    color={colors.primary}
                  />
                ))}
              </View>
              <Badge
                label={evaluation.status === 'approved' ? t('evaluationLocked') : t('needsRevision')}
                tone={evaluation.status === 'approved' ? 'success' : 'primary'}
              />
            </View>
            {evaluation.comment ? (
              <Text style={styles.evalComment}>{evaluation.comment}</Text>
            ) : null}
            {evaluation.signature ? (
              <SignatureView value={evaluation.signature} height={90} />
            ) : null}
            {evaluation.status === 'sent' ? (
              <Text style={styles.evalComment}>{t('needsRevisionHint')}</Text>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* Move to folder (owner only) — still allowed after approval */}
      {isOwner ? (
        <View style={{ marginTop: spacing.lg }}>
          <Select
            label={t('moveToFolder')}
            value={achievement.folder_id ?? '__none__'}
            options={[
              { label: t('noFolder'), value: '__none__' },
              ...folders.map((f) => ({ label: f.name, value: f.id })),
            ]}
            onChange={onMoveToFolder}
          />
        </View>
      ) : null}

      {/* Once approved, the record is locked: no edits, no deletion. */}
      {isApproved ? (
        <Card style={{ marginTop: spacing.lg }}>
          <View style={[styles.metaRow, { flexDirection: isRTL ? 'row-reverse' : 'row', marginTop: 0 }]}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.mutedText} />
            <Text style={styles.metaText}>{t('approvedLocked')}</Text>
          </View>
        </Card>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        {/* Owner can submit a draft for review, or resubmit after acting on
            supervisor feedback (status 'needs_revision'). */}
        {isOwner &&
        (achievement.status === 'draft' || achievement.status === 'needs_revision') ? (
          <Button
            title={t('submitForReview')}
            icon="send-outline"
            variant="secondary"
            onPress={onSubmit}
            style={{ marginTop: spacing.sm }}
          />
        ) : null}

        {/* Owner can delete, unless the achievement has been approved */}
        {isOwner && !isApproved ? (
          <Pressable onPress={onDelete} style={styles.deleteRow} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.deleteText}>{t('delete')}</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  titleRow: { alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  title: { flex: 1, fontSize: 20, fontWeight: '900', color: colors.textDark },
  description: { fontSize: 15, color: colors.textDark, marginTop: spacing.md, lineHeight: 22 },
  metaRow: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  metaText: { fontSize: 13, color: colors.mutedText },
  evalCard: { gap: spacing.sm },
  evalTop: { alignItems: 'center', justifyContent: 'space-between' },
  starsRow: { flexDirection: 'row', gap: 2 },
  evalComment: { fontSize: 14, color: colors.textDark },
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
  actions: { marginTop: spacing.xl },
  deleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  deleteText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
});
