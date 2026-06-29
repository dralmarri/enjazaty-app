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
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  deleteAchievement,
  getAchievement,
  listAttachments,
  updateAchievementStatus,
} from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, Attachment } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function AchievementDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [achievement, setAchievement] = useState<Achievement | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [ach, atts] = await Promise.all([
        getAchievement(id),
        listAttachments(id),
      ]);
      setAchievement(ach);
      setAttachments(atts);
    } finally {
      setLoading(false);
    }
  }, [id]);

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

  const onSubmit = async () => {
    await updateAchievementStatus(achievement.id, 'submitted');
    await load();
  };

  const onDelete = async () => {
    await deleteAchievement(achievement.id);
    router.back();
  };

  const openAttachment = (att: Attachment) => {
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

      {/* Actions */}
      <View style={styles.actions}>
        {/* Admin can review & evaluate */}
        {isAdmin ? (
          <Button
            title={t('notesAndEvaluation')}
            icon="star-outline"
            onPress={() => router.push(`/notes/${achievement.id}`)}
          />
        ) : null}

        {/* Owner can submit a draft for review */}
        {isOwner && achievement.status === 'draft' ? (
          <Button
            title={t('submitForReview')}
            icon="send-outline"
            variant="secondary"
            onPress={onSubmit}
            style={{ marginTop: spacing.sm }}
          />
        ) : null}

        {/* Owner can delete */}
        {isOwner ? (
          <Pressable onPress={onDelete} style={styles.deleteRow} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
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
  deleteText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
