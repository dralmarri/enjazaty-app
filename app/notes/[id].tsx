/**
 * Screen 10 — Notes & evaluation.
 *
 * Works in two modes based on the route param:
 *  - achievement mode (default): [id] is an achievement id. Shows notes on the
 *    achievement and (for admins) an evaluation form (rating + comment).
 *  - employee mode (?employee=1): [id] is a user id. Shows notes about the
 *    employee and lets an admin add encouraging text/sticker notes.
 *
 * Notes support text, encouragement stickers, and images. Images are uploaded
 * to Supabase Storage.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Avatar,
  Button,
  Card,
  EmptyState,
  Header,
  Input,
  Loading,
  Screen,
  SectionTitle,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  createEvaluation,
  createNote,
  createNotification,
  getAchievement,
  listEvaluations,
  listNotes,
} from '@/lib/api';
import { uploadFile } from '@/lib/storage';
import { formatDate } from '@/lib/format';
import type { Evaluation, Note } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

// A small palette of encouragement stickers (emoji).
const STICKERS = ['🌟', '🏆', '👏', '💯', '🔥', '🎉', '👍', '❤️'];

export default function NotesEvaluationScreen() {
  const params = useLocalSearchParams<{ id: string; employee?: string }>();
  const id = params.id;
  const isEmployeeMode = params.employee === '1';
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [notes, setNotes] = useState<Note[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);

  // Note composer state
  const [noteText, setNoteText] = useState('');

  // Evaluation form state (achievement mode, admins only)
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      if (isEmployeeMode) {
        const [n, e] = await Promise.all([
          listNotes({ targetUserId: id }),
          listEvaluations(id),
        ]);
        setNotes(n);
        setEvaluations(e);
        setEmployeeId(id);
      } else {
        const [n, ach] = await Promise.all([
          listNotes({ achievementId: id }),
          getAchievement(id),
        ]);
        setNotes(n);
        if (ach) {
          setEmployeeId(ach.owner_id);
          setEvaluations(await listEvaluations(ach.owner_id));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, isEmployeeMode]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Loading />;

  /* ------------------------------- Notes --------------------------------- */

  const addTextNote = async () => {
    if (!profile || !noteText.trim()) return;
    await createNote({
      content: noteText.trim(),
      type: 'text',
      author_id: profile.id,
      achievement_id: isEmployeeMode ? null : id,
      target_user_id: isEmployeeMode ? id : null,
    });
    setNoteText('');
    await load();
  };

  const addSticker = async (sticker: string) => {
    if (!profile) return;
    await createNote({
      content: sticker,
      type: 'sticker',
      author_id: profile.id,
      achievement_id: isEmployeeMode ? null : id,
      target_user_id: isEmployeeMode ? id : null,
    });
    await load();
  };

  const addImageNote = async () => {
    if (!profile) return;
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (res.canceled || !res.assets[0]) return;
    const uploaded = await uploadFile({
      uri: res.assets[0].uri,
      userId: profile.id,
      fileName: res.assets[0].fileName ?? 'note-image',
      contentType: res.assets[0].mimeType,
    });
    await createNote({
      type: 'image',
      media_url: uploaded.url,
      author_id: profile.id,
      achievement_id: isEmployeeMode ? null : id,
      target_user_id: isEmployeeMode ? id : null,
    });
    await load();
  };

  /* ---------------------------- Evaluation ------------------------------- */

  const submitEvaluation = async () => {
    if (!profile || !employeeId) return;
    setSubmitting(true);
    try {
      await createEvaluation({
        achievement_id: isEmployeeMode ? employeeId : id,
        employee_id: employeeId,
        evaluator_id: profile.id,
        rating,
        comment: comment.trim() || null,
      });
      // Notify the employee of the new evaluation.
      await createNotification({
        user_id: employeeId,
        title: t('evaluation'),
        body: `${t('rating')}: ${rating}/5`,
        type: 'evaluation',
        related_id: isEmployeeMode ? null : id,
      });
      setComment('');
      setRating(5);
      await load();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Header title={t('notesAndEvaluation')} showBack />

      {/* Note composer */}
      <Card>
        <Input
          label={t('addNote')}
          value={noteText}
          onChangeText={setNoteText}
          placeholder={t('textNote')}
          multiline
        />
        <View style={[styles.composerRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Button title={t('add')} icon="send-outline" onPress={addTextNote} fullWidth={false} />
          <Pressable style={styles.iconAction} onPress={addImageNote}>
            <Ionicons name="image-outline" size={22} color={colors.primaryDark} />
          </Pressable>
        </View>

        {/* Encouragement stickers */}
        <Text style={[styles.stickerLabel, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('sticker')}
        </Text>
        <View style={styles.stickerRow}>
          {STICKERS.map((s) => (
            <Pressable key={s} style={styles.sticker} onPress={() => addSticker(s)}>
              <Text style={styles.stickerEmoji}>{s}</Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Evaluation (admins only) */}
      {isAdmin ? (
        <>
          <SectionTitle title={t('evaluation')} />
          <Card>
            <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('rating')}
            </Text>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((n) => (
                <Pressable key={n} onPress={() => setRating(n)} hitSlop={6}>
                  <Ionicons
                    name={n <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color={colors.primary}
                  />
                </Pressable>
              ))}
            </View>
            <Input
              label={t('comment')}
              value={comment}
              onChangeText={setComment}
              multiline
            />
            <Button
              title={submitting ? t('saving') : t('submitEvaluation')}
              icon="checkmark-done-outline"
              onPress={submitEvaluation}
              loading={submitting}
            />
          </Card>
        </>
      ) : null}

      {/* Past evaluations */}
      {evaluations.length > 0 ? (
        <>
          <SectionTitle title={t('evaluation')} />
          {evaluations.map((ev) => (
            <Card key={ev.id} style={styles.evalCard}>
              <View style={styles.starsRowSmall}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= ev.rating ? 'star' : 'star-outline'}
                    size={16}
                    color={colors.primary}
                  />
                ))}
              </View>
              {ev.comment ? <Text style={styles.evalComment}>{ev.comment}</Text> : null}
              <Text style={styles.date}>{formatDate(ev.created_at, language)}</Text>
            </Card>
          ))}
        </>
      ) : null}

      {/* Notes list */}
      <SectionTitle title={t('notes')} />
      {notes.length === 0 ? (
        <EmptyState icon="chatbubble-ellipses-outline" message={t('noNotes')} />
      ) : (
        notes.map((note) => (
          <Card key={note.id} style={styles.noteCard}>
            {note.type === 'sticker' ? (
              <Text style={styles.bigSticker}>{note.content}</Text>
            ) : note.type === 'image' && note.media_url ? (
              <Text style={styles.noteImage}>🖼️ {note.media_url}</Text>
            ) : (
              <Text style={styles.noteText}>{note.content}</Text>
            )}
            <Text style={styles.date}>{formatDate(note.created_at, language)}</Text>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  composerRow: { alignItems: 'center', gap: spacing.md },
  iconAction: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerLabel: { fontSize: 13, fontWeight: '700', color: colors.textDark, marginTop: spacing.md, marginBottom: spacing.sm },
  stickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  sticker: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerEmoji: { fontSize: 22 },
  label: { fontSize: 14, fontWeight: '600', color: colors.textDark, marginBottom: spacing.sm },
  starsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg, justifyContent: 'center' },
  starsRowSmall: { flexDirection: 'row', gap: 2 },
  evalCard: { marginBottom: spacing.md, gap: spacing.sm },
  evalComment: { fontSize: 14, color: colors.textDark },
  noteCard: { marginBottom: spacing.md, gap: spacing.sm },
  noteText: { fontSize: 15, color: colors.textDark, lineHeight: 22 },
  bigSticker: { fontSize: 40 },
  noteImage: { fontSize: 13, color: colors.primaryDark },
  date: { fontSize: 11, color: colors.mutedText },
});
