/**
 * Activity tab — the user's activity hub. Shows:
 *  - achievement counters (total / approved / under review)
 *  - admin analytics (subordinates count) merged in
 *  - evaluation reports received from supervisors
 *  - the full achievements feed with status filtering
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  AchievementRow,
  Badge,
  Card,
  EmptyState,
  Header,
  Screen,
  SectionTitle,
  SignatureView,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listAchievements, listEvaluations, listNotesAboutMe, listSupervisions } from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, Evaluation, Note } from '@/types/database';
import { colors, radius, shadow, spacing } from '@/theme/colors';

type Filter = 'all' | Achievement['status'];
type NoteWithAuthor = Note & { author: { full_name: string } | null };

export default function ActivityScreen() {
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [notes, setNotes] = useState<NoteWithAuthor[]>([]);
  const [subordinates, setSubordinates] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [evalsOpen, setEvalsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [achievementsExpanded, setAchievementsExpanded] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      const [achs, evals, nts] = await Promise.all([
        listAchievements(profile.id),
        listEvaluations(profile.id), // evaluations about me
        listNotesAboutMe(profile.id), // follow-up notes about me
      ]);
      setAchievements(achs);
      setEvaluations(evals);
      setNotes(nts);
      if (isAdmin) {
        const subs = await listSupervisions(profile.id);
        setSubordinates(subs.length);
      }
    } catch {
      // keep previous data
    } finally {
      setRefreshing(false);
    }
  }, [profile, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = {
    total: achievements.length,
    approved: achievements.filter((a) => a.status === 'approved').length,
    pending: achievements.filter((a) => a.status === 'submitted').length,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('total') },
    { key: 'submitted', label: t('pending') },
    { key: 'approved', label: t('approved') },
  ];

  const visible = useMemo(
    () =>
      filter === 'all'
        ? achievements
        : achievements.filter((a) => a.status === filter),
    [achievements, filter]
  );
  const displayed = achievementsExpanded ? visible : visible.slice(0, 3);

  const onFilterChange = (key: Filter) => {
    setFilter(key);
    setAchievementsExpanded(false);
  };

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header title={t('activity')} />

      {/* Counters */}
      <View style={styles.statsRow}>
        <Stat label={t('total')} value={stats.total} icon="documents-outline" />
        <Stat
          label={t('approved')}
          value={stats.approved}
          icon="checkmark-done-outline"
          tone={colors.success}
        />
        <Stat
          label={t('pending')}
          value={stats.pending}
          icon="time-outline"
          tone={colors.primaryDark}
        />
      </View>

      {/* Admin analytics (merged here) */}
      {isAdmin ? (
        <View style={[styles.analyticsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="people-outline" size={18} color={colors.primaryDark} />
          <Text style={styles.analyticsText}>
            {t('employees')}: {subordinates}
          </Text>
        </View>
      ) : null}

      {/* Generate / print a report */}
      <Pressable style={styles.reportCard} onPress={() => router.push('/report')}>
        <View style={[styles.reportRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.reportIcon}>
            <Ionicons name="document-text-outline" size={22} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.reportTitle}>{t('myReport')}</Text>
            <Text style={styles.reportHint}>{t('printReport')}</Text>
          </View>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={colors.mutedText}
          />
        </View>
      </Pressable>

      {/* Evaluation reports received from supervisors — collapsed by default
          to keep the page short; tap to expand. */}
      {evaluations.length > 0 ? (
        <>
          <Pressable
            style={[styles.collapseHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => setEvalsOpen((v) => !v)}
          >
            <Text style={styles.collapseTitle}>
              {t('evaluationReport')} ({evaluations.length})
            </Text>
            <Ionicons
              name={evalsOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.mutedText}
            />
          </Pressable>
          {evalsOpen && evaluations.map((ev) => (
            <Card key={ev.id} style={styles.evalCard}>
              <View style={[styles.evalTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons
                      key={n}
                      name={n <= ev.rating ? 'star' : 'star-outline'}
                      size={16}
                      color={colors.primary}
                    />
                  ))}
                </View>
                <Badge
                  label={ev.status === 'approved' ? t('approved') : t('needsRevision')}
                  tone={ev.status === 'approved' ? 'success' : 'primary'}
                />
              </View>
              {ev.comment ? <Text style={styles.evalComment}>{ev.comment}</Text> : null}
              {ev.signature ? (
                <View style={styles.signBox}>
                  <Text style={styles.signLabel}>{t('eSignature')}</Text>
                  <SignatureView value={ev.signature} height={80} />
                </View>
              ) : null}
              <Text style={styles.evalDate}>{formatDate(ev.created_at, language)}</Text>
            </Card>
          ))}
        </>
      ) : null}

      {/* Follow-up notes supervisors left about me — a visible, documented
          log, collapsed by default. */}
      {notes.length > 0 ? (
        <>
          <Pressable
            style={[styles.collapseHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
            onPress={() => setNotesOpen((v) => !v)}
          >
            <Text style={styles.collapseTitle}>
              {t('followUpNotes')} ({notes.length})
            </Text>
            <Ionicons
              name={notesOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.mutedText}
            />
          </Pressable>
          {notesOpen && notes.map((n) => (
            <Card key={n.id} style={styles.evalCard}>
              <View style={[styles.evalTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Badge
                  label={n.kind === 'concern' ? t('concern') : t('praise')}
                  tone={n.kind === 'concern' ? 'primary' : 'success'}
                />
                <Text style={styles.evalDate}>{formatDate(n.created_at, language)}</Text>
              </View>
              {n.content ? <Text style={styles.evalComment}>{n.content}</Text> : null}
              {n.author?.full_name ? (
                <Text style={styles.signLabel}>{n.author.full_name}</Text>
              ) : null}
            </Card>
          ))}
        </>
      ) : null}

      {/* Achievements feed — shows only the latest 3 until "view all" */}
      <SectionTitle
        title={t('myAchievements')}
        actionLabel={visible.length > 3 ? t(achievementsExpanded ? 'showLess' : 'viewAll') : undefined}
        onAction={() => setAchievementsExpanded((v) => !v)}
      />
      <View style={styles.filterRow}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => onFilterChange(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {visible.length === 0 ? (
        <EmptyState message={t('noAchievements')} hint={t('addAchievementType')} />
      ) : (
        <>
          {displayed.map((item) => (
            <AchievementRow
              key={item.id}
              achievement={item}
              editable
              onChanged={load}
              onPress={() => router.push(`/achievement/${item.id}`)}
            />
          ))}
          <Text style={styles.hint}>{t('longPressHint')}</Text>
        </>
      )}
    </Screen>
  );
}

function Stat({
  label,
  value,
  icon,
  tone = colors.textDark,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={tone} />
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    ...shadow,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 12, color: colors.mutedText },
  analyticsRow: {
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.softBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  analyticsText: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  reportCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  reportRow: { alignItems: 'center', gap: spacing.md },
  reportIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportTitle: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  reportHint: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  hint: { fontSize: 11, color: colors.mutedText, marginTop: spacing.xs, textAlign: 'center' },
  collapseHeader: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.md,
  },
  collapseTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  evalCard: { marginBottom: spacing.md, gap: spacing.sm },
  evalTop: { alignItems: 'center', justifyContent: 'space-between' },
  starsRow: { flexDirection: 'row', gap: 2 },
  evalComment: { fontSize: 14, color: colors.textDark },
  signBox: {
    backgroundColor: colors.softBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  signLabel: { fontSize: 12, color: colors.mutedText, marginBottom: 2 },
  evalDate: { fontSize: 11, color: colors.mutedText },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.mutedText },
  chipTextActive: { color: colors.onPrimary },
  card: { marginBottom: spacing.md },
  row: { alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  date: { fontSize: 11, color: colors.mutedText, marginTop: 4 },
});
