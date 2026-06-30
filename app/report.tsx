/**
 * My achievements report — a preview + a print/export-PDF action.
 * Compiles the user's achievements and evaluations into a printable document
 * (uses expo-print, which works on web + native).
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import { Badge, Button, Card, Header, Loading, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listAchievements, listEvaluations } from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, Evaluation } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function ReportScreen() {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const [achs, evals] = await Promise.all([
        listAchievements(profile.id),
        listEvaluations(profile.id),
      ]);
      setAchievements(achs);
      setEvaluations(evals);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const today = formatDate(new Date().toISOString(), language);

  const buildHtml = () => {
    const rows = achievements
      .map(
        (a, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(a.title)}</td>
          <td>${escapeHtml(statusLabel(a.status))}</td>
          <td>${formatDate(a.created_at, language)}</td>
        </tr>`
      )
      .join('');

    const avgRating =
      evaluations.length > 0
        ? (evaluations.reduce((s, e) => s + e.rating, 0) / evaluations.length).toFixed(1)
        : '—';

    return `
    <!DOCTYPE html>
    <html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}">
    <head><meta charset="utf-8" />
    <style>
      * { font-family: -apple-system, "Segoe UI", Tahoma, sans-serif; }
      body { padding: 32px; color: #1F2937; }
      .head { display:flex; align-items:center; gap:12px; border-bottom:3px solid #F4B000; padding-bottom:16px; }
      .title { font-size:24px; font-weight:800; }
      .sub { color:#6B7280; font-size:13px; margin-top:4px; }
      .meta { margin:20px 0; font-size:14px; }
      .meta b { color:#D99A00; }
      table { width:100%; border-collapse:collapse; margin-top:12px; }
      th, td { border:1px solid #F3E2B3; padding:10px; text-align:${isRTL ? 'right' : 'left'}; font-size:13px; }
      th { background:#FFF8E6; color:#1F2937; }
      .summary { margin-top:24px; background:#FFF8E6; border-radius:12px; padding:16px; }
      .badge { display:inline-block; background:#F4B000; color:#fff; padding:4px 12px; border-radius:999px; font-size:12px; }
    </style></head>
    <body>
      <div class="head">
        <div>
          <div class="title">${t('appName')} — ${t('myReport')}</div>
          <div class="sub">${t('reportFor')} ${escapeHtml(profile?.full_name ?? '')} (${escapeHtml(profile?.user_code ?? '')})</div>
        </div>
      </div>
      <div class="meta">
        <div><b>${t('jobTitle')}:</b> ${escapeHtml(profile?.job_title ?? '—')}</div>
        <div><b>${t('educationalRegion')}:</b> ${escapeHtml(profile?.educational_region ?? '—')}</div>
        <div><b>${t('reportDate')}:</b> ${today}</div>
      </div>
      <h3>${t('myAchievements')} (${achievements.length})</h3>
      ${
        achievements.length
          ? `<table><thead><tr><th>#</th><th>${t('achievementTitle')}</th><th>${t('status')}</th><th>${t('reportDate')}</th></tr></thead><tbody>${rows}</tbody></table>`
          : `<p>${t('noData')}</p>`
      }
      <div class="summary">
        <div><b>${t('total')}:</b> ${achievements.length}</div>
        <div><b>${t('approved')}:</b> ${achievements.filter((a) => a.status === 'approved').length}</div>
        <div><b>${t('evaluation')} (${t('rating')}):</b> ${avgRating} / 5</div>
      </div>
      <p style="margin-top:32px; color:#6B7280; font-size:12px; text-align:center;">${t('developedBy')}</p>
    </body></html>`;
  };

  const statusLabel = (s: Achievement['status']) =>
    s === 'approved'
      ? t('approved')
      : s === 'submitted'
      ? t('submitted')
      : s === 'rejected'
      ? t('rejected')
      : t('draft');

  const onPrint = async () => {
    setPrinting(true);
    try {
      await Print.printAsync({ html: buildHtml() });
    } catch {
      // user cancelled or unsupported
    } finally {
      setPrinting(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <Screen>
      <Header title={t('myReport')} showBack />

      {/* Preview summary */}
      <Card style={styles.summaryCard}>
        <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Ionicons name="document-text-outline" size={24} color={colors.primaryDark} />
          <Text style={styles.name}>{profile?.full_name}</Text>
        </View>
        <Text style={styles.meta}>{profile?.job_title || '—'}</Text>
        <Text style={styles.meta}>{profile?.educational_region || '—'}</Text>
        <Text style={styles.meta}>
          {t('reportDate')}: {today}
        </Text>
        <View style={styles.statsRow}>
          <Stat label={t('total')} value={achievements.length} />
          <Stat
            label={t('approved')}
            value={achievements.filter((a) => a.status === 'approved').length}
          />
          <Stat label={t('evaluation')} value={evaluations.length} />
        </View>
      </Card>

      <Button
        title={printing ? t('loading') : t('printReport')}
        icon="print-outline"
        onPress={onPrint}
        loading={printing}
        style={{ marginVertical: spacing.lg }}
      />

      {/* Achievements preview list */}
      {achievements.map((a, i) => (
        <Card key={a.id} style={styles.itemCard}>
          <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Text style={styles.index}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {a.title}
              </Text>
              <Text style={styles.itemDate}>{formatDate(a.created_at, language)}</Text>
            </View>
            <Badge label={statusLabel(a.status)} tone={statusTone(a.status)} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const styles = StyleSheet.create({
  summaryCard: { gap: spacing.xs },
  row: { alignItems: 'center', gap: spacing.md },
  name: { fontSize: 18, fontWeight: '900', color: colors.textDark },
  meta: { fontSize: 13, color: colors.mutedText },
  statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
  stat: {
    flex: 1,
    backgroundColor: colors.softBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: { fontSize: 20, fontWeight: '900', color: colors.primaryDark },
  statLabel: { fontSize: 12, color: colors.mutedText },
  itemCard: { marginBottom: spacing.md },
  index: { fontSize: 14, fontWeight: '800', color: colors.mutedText, width: 22, textAlign: 'center' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  itemDate: { fontSize: 11, color: colors.mutedText, marginTop: 2 },
});
