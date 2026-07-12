/**
 * My achievements report — a preview + a print/export-PDF action.
 * Compiles the user's achievements and evaluations into a printable document
 * (uses expo-print, which works on web + native).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Button, Card, Header, Loading, Screen, Select } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listAchievements, listEvaluations } from '@/lib/api';
import { formatDate, monthName } from '@/lib/format';
import type { Achievement, Evaluation } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

type PeriodMode = 'all' | 'month' | 'custom';
type DateRange = { from: Date; to: Date };

// react-native-webview has no web implementation — require it natively only.
const NativeWebView =
  Platform.OS === 'web'
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('react-native-webview').WebView;

export default function ReportScreen() {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Period filter — lets the user print/share a report for just one month
  // or a custom date range, instead of always including every achievement.
  const now = new Date();
  const [periodMode, setPeriodMode] = useState<PeriodMode>('all');
  const [pickYear, setPickYear] = useState(now.getFullYear());
  const [pickMonth, setPickMonth] = useState(now.getMonth()); // 0-based
  const [fromDay, setFromDay] = useState<string | null>(null);
  const [fromMonth, setFromMonth] = useState<string | null>(null);
  const [fromYear, setFromYear] = useState<string | null>(null);
  const [toDay, setToDay] = useState<string | null>(null);
  const [toMonth, setToMonth] = useState<string | null>(null);
  const [toYear, setToYear] = useState<string | null>(null);

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

  const dateRange: DateRange | null = useMemo(() => {
    if (periodMode === 'month') {
      return {
        from: new Date(pickYear, pickMonth, 1, 0, 0, 0, 0),
        to: new Date(pickYear, pickMonth + 1, 0, 23, 59, 59, 999),
      };
    }
    if (periodMode === 'custom' && fromDay && fromMonth && fromYear && toDay && toMonth && toYear) {
      return {
        from: new Date(Number(fromYear), Number(fromMonth), Number(fromDay), 0, 0, 0, 0),
        to: new Date(Number(toYear), Number(toMonth), Number(toDay), 23, 59, 59, 999),
      };
    }
    return null;
  }, [periodMode, pickYear, pickMonth, fromDay, fromMonth, fromYear, toDay, toMonth, toYear]);

  const inRange = (iso: string, range: DateRange) => {
    const d = new Date(iso);
    return d >= range.from && d <= range.to;
  };

  const filteredAchievements = useMemo(
    () =>
      dateRange
        ? achievements.filter((a) => inRange(a.date ?? a.created_at, dateRange))
        : achievements,
    [achievements, dateRange]
  );
  const filteredEvaluations = useMemo(
    () => (dateRange ? evaluations.filter((e) => inRange(e.created_at, dateRange)) : evaluations),
    [evaluations, dateRange]
  );

  const dayOptions = Array.from({ length: 31 }, (_, i) => ({
    label: String(i + 1),
    value: String(i + 1),
  }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: monthName(i, language),
    value: String(i),
  }));
  const yearOptions = Array.from({ length: 4 }, (_, i) => {
    const y = now.getFullYear() - i;
    return { label: String(y), value: String(y) };
  });

  // The report markup (styles + content) — wrapped for native print, or used
  // directly to render a PDF on web.
  const buildBody = () => {
    const rows = filteredAchievements
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
      filteredEvaluations.length > 0
        ? (
            filteredEvaluations.reduce((s, e) => s + e.rating, 0) / filteredEvaluations.length
          ).toFixed(1)
        : '—';

    return `
    <style>
      * { font-family: -apple-system, "Segoe UI", Tahoma, sans-serif; }
      .report { padding: 32px; color: #1F2937; background:#fff; }
      .head { display:flex; align-items:center; gap:12px; border-bottom:3px solid #F4B000; padding-bottom:16px; }
      .title { font-size:24px; font-weight:800; }
      .sub { color:#6B7280; font-size:13px; margin-top:4px; }
      .meta { margin:20px 0; font-size:14px; }
      .meta b { color:#D99A00; }
      table { width:100%; border-collapse:collapse; margin-top:12px; }
      th, td { border:1px solid #F3E2B3; padding:10px; text-align:${isRTL ? 'right' : 'left'}; font-size:13px; }
      th { background:#FFF8E6; color:#1F2937; }
      .summary { margin-top:24px; background:#FFF8E6; border-radius:12px; padding:16px; }
    </style>
    <div class="report">
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
        ${
          dateRange
            ? `<div><b>${t('periodLabel')}:</b> ${formatDate(dateRange.from.toISOString(), language)} — ${formatDate(dateRange.to.toISOString(), language)}</div>`
            : ''
        }
      </div>
      <h3>${t('myAchievements')} (${filteredAchievements.length})</h3>
      ${
        filteredAchievements.length
          ? `<table><thead><tr><th>#</th><th>${t('achievementTitle')}</th><th>${t('status')}</th><th>${t('reportDate')}</th></tr></thead><tbody>${rows}</tbody></table>`
          : `<p>${t('noData')}</p>`
      }
      <div class="summary">
        <div><b>${t('total')}:</b> ${filteredAchievements.length}</div>
        <div><b>${t('approved')}:</b> ${filteredAchievements.filter((a) => a.status === 'approved').length}</div>
        <div><b>${t('evaluation')} (${t('rating')}):</b> ${avgRating} / 5</div>
      </div>
      <p style="margin-top:32px; color:#6B7280; font-size:12px; text-align:center;">${t('developedBy')}</p>
    </div>`;
  };

  // Full HTML document (used for native printing).
  const buildHtml = () =>
    `<!DOCTYPE html><html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}"><head><meta charset="utf-8" /></head><body>${buildBody()}</body></html>`;

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
      if (Platform.OS === 'web') {
        // Build the same styled PDF used for sharing, then print that PDF
        // (instead of the browser printing the on-screen app page).
        const { htmlToPdfBlob } = await import('@/lib/webpdf');
        const blob = await htmlToPdfBlob(buildBody());
        const url = URL.createObjectURL(blob);
        const iframe = document.createElement('iframe');
        Object.assign(iframe.style, {
          position: 'fixed',
          right: '0',
          bottom: '0',
          width: '0',
          height: '0',
          border: 'none',
        });
        iframe.src = url;
        document.body.appendChild(iframe);
        iframe.onload = () => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        };
        setTimeout(() => {
          document.body.removeChild(iframe);
          URL.revokeObjectURL(url);
        }, 60000);
        return;
      }
      await Print.printAsync({ html: buildHtml() });
    } catch {
      // user cancelled or unsupported
    } finally {
      setPrinting(false);
    }
  };

  // Share the report as a PDF document through the device's share sheet.
  const onShare = async () => {
    setSharing(true);
    try {
      if (Platform.OS === 'web') {
        // Web: build a real PDF, then share it as a file or download it.
        const { htmlToPdfBlob } = await import('@/lib/webpdf');
        const blob = await htmlToPdfBlob(buildBody());
        const fileName = `enjazaty-report-${profile?.user_code ?? ''}.pdf`;
        const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
        const file =
          typeof File !== 'undefined'
            ? new File([blob], fileName, { type: 'application/pdf' })
            : null;
        if (file && nav?.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: t('myReport') });
        } else {
          // Fallback: download the PDF.
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
        return;
      }
      // Native: render a PDF then open the share sheet.
      const { uri } = await Print.printToFileAsync({ html: buildHtml() });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('myReport'),
        });
      }
    } catch {
      // user cancelled or unsupported
    } finally {
      setSharing(false);
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
          <Stat label={t('total')} value={filteredAchievements.length} />
          <Stat
            label={t('approved')}
            value={filteredAchievements.filter((a) => a.status === 'approved').length}
          />
          <Stat label={t('evaluation')} value={filteredEvaluations.length} />
        </View>
      </Card>

      {/* Period filter — choose a specific month or a custom date range so a
          print/share only includes achievements from that period. */}
      <Card style={styles.summaryCard}>
        <Text style={styles.periodTitle}>{t('periodLabel')}</Text>
        <View style={[styles.filterRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          {(
            [
              ['all', 'periodAll'],
              ['month', 'periodMonth'],
              ['custom', 'periodCustom'],
            ] as const
          ).map(([key, labelKey]) => {
            const active = periodMode === key;
            return (
              <Pressable
                key={key}
                onPress={() => setPeriodMode(key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {periodMode === 'month' ? (
          <>
            <View style={[styles.yearRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Pressable onPress={() => setPickYear((y) => y - 1)} hitSlop={8}>
                <Ionicons name="chevron-back" size={22} color={colors.primaryDark} />
              </Pressable>
              <Text style={styles.yearText}>{pickYear}</Text>
              <Pressable onPress={() => setPickYear((y) => y + 1)} hitSlop={8}>
                <Ionicons name="chevron-forward" size={22} color={colors.primaryDark} />
              </Pressable>
            </View>
            <View style={styles.monthGrid}>
              {monthOptions.map((m) => {
                const active = pickMonth === Number(m.value);
                return (
                  <Pressable
                    key={m.value}
                    onPress={() => setPickMonth(Number(m.value))}
                    style={[styles.monthChip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {m.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {periodMode === 'custom' ? (
          <>
            <Text style={styles.periodSubLabel}>{t('from')}</Text>
            <View style={[styles.dateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.dateField}>
                <Select value={fromDay} options={dayOptions} onChange={setFromDay} placeholder={t('selectDay')} />
              </View>
              <View style={styles.dateField}>
                <Select value={fromMonth} options={monthOptions} onChange={setFromMonth} placeholder={t('selectMonthLabel')} />
              </View>
              <View style={styles.dateField}>
                <Select value={fromYear} options={yearOptions} onChange={setFromYear} placeholder={t('selectYear')} />
              </View>
            </View>
            <Text style={styles.periodSubLabel}>{t('to')}</Text>
            <View style={[styles.dateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.dateField}>
                <Select value={toDay} options={dayOptions} onChange={setToDay} placeholder={t('selectDay')} />
              </View>
              <View style={styles.dateField}>
                <Select value={toMonth} options={monthOptions} onChange={setToMonth} placeholder={t('selectMonthLabel')} />
              </View>
              <View style={styles.dateField}>
                <Select value={toYear} options={yearOptions} onChange={setToYear} placeholder={t('selectYear')} />
              </View>
            </View>
          </>
        ) : null}
      </Card>

      <View style={styles.actions}>
        <Button
          title={printing ? t('loading') : t('printReport')}
          icon="print-outline"
          onPress={onPrint}
          loading={printing}
          fullWidth={false}
          style={styles.actionBtn}
        />
        <Button
          title={sharing ? t('loading') : t('share')}
          icon="share-social-outline"
          variant="secondary"
          onPress={onShare}
          loading={sharing}
          fullWidth={false}
          style={styles.actionBtn}
        />
      </View>

      {/* Preview of the actual report page, exactly as it will print/share */}
      <ReportPreview html={buildHtml()} />
    </Screen>
  );
}

function ReportPreview({ html }: { html: string }) {
  const containerRef = useRef<View>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = containerRef.current as unknown as HTMLElement | null;
    if (!node) return;
    node.innerHTML = '';
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, {
      width: '100%',
      height: '100%',
      border: 'none',
    });
    iframe.srcdoc = html;
    node.appendChild(iframe);
  }, [html]);

  if (Platform.OS === 'web') {
    return <View ref={containerRef} style={styles.previewBox} />;
  }
  return (
    <View style={styles.previewBox}>
      <NativeWebView source={{ html }} style={styles.previewWebview} />
    </View>
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
  actions: { flexDirection: 'row', gap: spacing.md, marginVertical: spacing.lg },
  actionBtn: { flex: 1 },
  previewBox: {
    height: 640,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  previewWebview: { flex: 1 },
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
  periodTitle: { fontSize: 15, fontWeight: '800', color: colors.textDark, marginBottom: spacing.sm },
  filterRow: { flexWrap: 'wrap', gap: spacing.sm },
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
  yearRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  yearText: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  monthChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    minWidth: '30%',
    alignItems: 'center',
  },
  periodSubLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.mutedText,
    marginTop: spacing.md,
  },
  dateRow: { gap: spacing.sm, marginTop: spacing.xs },
  dateField: { flex: 1 },
});
