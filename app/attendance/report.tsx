/**
 * Monthly attendance report — per subordinate counts of each exception type
 * for the selected month. A missing row means no exceptions were recorded,
 * i.e. present for the whole month.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Avatar, Button, Card, EmptyState, Header, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listAttendanceExceptionsForRange, listSupervisions } from '@/lib/api';
import { formatDate, monthName } from '@/lib/format';
import type { AttendanceException, AttendanceExceptionType, Supervision, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function monthRange(monthDate: Date): { start: string; end: string } {
  const y = monthDate.getFullYear();
  const m = monthDate.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default function AttendanceReportScreen() {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [month, setMonth] = useState(() => new Date());
  const [subordinates, setSubordinates] = useState<(Supervision & { subordinate: UserProfile })[]>([]);
  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      const subs = await listSupervisions(profile.id);
      setSubordinates(subs);
      const { start, end } = monthRange(month);
      const ex = await listAttendanceExceptionsForRange(
        subs.map((s) => s.subordinate_id),
        start,
        end
      );
      setExceptions(ex);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [profile, month]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const shiftMonth = (delta: number) => {
    const next = new Date(month);
    next.setMonth(next.getMonth() + delta);
    setMonth(next);
  };

  const countsFor = (employeeId: string) => {
    const rows = exceptions.filter((e) => e.employee_id === employeeId);
    const counts: Record<AttendanceExceptionType, number> = {
      absent: 0,
      sick_leave: 0,
      emergency_leave: 0,
      permission: 0,
      leave: 0,
    };
    rows.forEach((r) => {
      counts[r.type] += 1;
    });
    return { counts, total: rows.length };
  };

  const typeLabels: Record<AttendanceExceptionType, string> = {
    absent: t('absent'),
    sick_leave: t('sickLeave'),
    emergency_leave: t('emergencyLeave'),
    permission: t('permission'),
    leave: t('leave'),
  };

  const label = useMemo(
    () => `${monthName(month.getMonth(), language)} ${month.getFullYear()}`,
    [month, language]
  );

  const buildBody = () => {
    const rows = subordinates
      .map((item, i) => {
        const { counts, total } = countsFor(item.subordinate_id);
        return `
        <tr>
          <td>${i + 1}</td>
          <td>${escapeHtml(item.subordinate.full_name)}</td>
          <td>${counts.absent}</td>
          <td>${counts.sick_leave}</td>
          <td>${counts.emergency_leave}</td>
          <td>${counts.permission}</td>
          <td>${counts.leave}</td>
          <td>${total}</td>
        </tr>`;
      })
      .join('');

    const detailRows = [...exceptions]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((ex, i) => {
        const emp = subordinates.find((s) => s.subordinate_id === ex.employee_id)?.subordinate;
        return `
        <tr>
          <td>${i + 1}</td>
          <td>${formatDate(ex.date, language)}</td>
          <td>${escapeHtml(emp?.full_name ?? '')}</td>
          <td>${escapeHtml(typeLabels[ex.type])}</td>
          <td>${escapeHtml(ex.note ?? '—')}</td>
        </tr>`;
      })
      .join('');

    return `
    <style>
      * { font-family: -apple-system, "Segoe UI", Tahoma, sans-serif; }
      .report { padding: 32px; color: #1F2937; background:#fff; }
      .head { display:flex; align-items:center; gap:12px; border-bottom:3px solid #F4B000; padding-bottom:16px; }
      .title { font-size:24px; font-weight:800; }
      .sub { color:#6B7280; font-size:13px; margin-top:4px; }
      h3 { margin-top:28px; }
      table { width:100%; border-collapse:collapse; margin-top:12px; }
      th, td { border:1px solid #F3E2B3; padding:10px; text-align:${isRTL ? 'right' : 'left'}; font-size:13px; }
      th { background:#FFF8E6; color:#1F2937; }
    </style>
    <div class="report">
      <div class="head">
        <div>
          <div class="title">${t('appName')} — ${t('attendanceReport')}</div>
          <div class="sub">${label}</div>
        </div>
      </div>
      ${
        subordinates.length
          ? `<table><thead><tr><th>#</th><th>${t('employees')}</th><th>${t('absent')}</th><th>${t('sickLeave')}</th><th>${t('emergencyLeave')}</th><th>${t('permission')}</th><th>${t('leave')}</th><th>${t('totalDays')}</th></tr></thead><tbody>${rows}</tbody></table>`
          : `<p>${t('noData')}</p>`
      }
      ${
        exceptions.length
          ? `<h3>${t('attendanceDetails')}</h3><table><thead><tr><th>#</th><th>${t('attendanceDate')}</th><th>${t('employees')}</th><th>${t('attendanceType')}</th><th>${t('attendanceNote')}</th></tr></thead><tbody>${detailRows}</tbody></table>`
          : ''
      }
      <p style="margin-top:32px; color:#6B7280; font-size:12px; text-align:center;">${t('developedBy')}</p>
    </div>`;
  };

  const buildHtml = () =>
    `<!DOCTYPE html><html dir="${isRTL ? 'rtl' : 'ltr'}" lang="${isRTL ? 'ar' : 'en'}"><head><meta charset="utf-8" /></head><body>${buildBody()}</body></html>`;

  const onPrint = async () => {
    setPrinting(true);
    try {
      if (Platform.OS === 'web') {
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

  const onShare = async () => {
    setSharing(true);
    try {
      if (Platform.OS === 'web') {
        const { htmlToPdfBlob } = await import('@/lib/webpdf');
        const blob = await htmlToPdfBlob(buildBody());
        const fileName = `enjazaty-attendance-${label}.pdf`;
        const nav: any = typeof navigator !== 'undefined' ? navigator : undefined;
        const file =
          typeof File !== 'undefined'
            ? new File([blob], fileName, { type: 'application/pdf' })
            : null;
        if (file && nav?.canShare && nav.canShare({ files: [file] })) {
          await nav.share({ files: [file], title: t('attendanceReport') });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
        return;
      }
      const { uri } = await Print.printToFileAsync({ html: buildHtml() });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('attendanceReport'),
        });
      }
    } catch {
      // user cancelled or unsupported
    } finally {
      setSharing(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header title={t('attendanceReport')} showBack />

      <View style={[styles.monthRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => shiftMonth(isRTL ? 1 : -1)} hitSlop={8} style={styles.monthArrow}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.primaryDark} />
        </Pressable>
        <Text style={styles.monthText}>{label}</Text>
        <Pressable onPress={() => shiftMonth(isRTL ? -1 : 1)} hitSlop={8} style={styles.monthArrow}>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.primaryDark} />
        </Pressable>
      </View>

      {subordinates.length > 0 ? (
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
      ) : null}

      {subordinates.length === 0 ? (
        <EmptyState icon="stats-chart-outline" message={t('noSubordinatesForAttendance')} />
      ) : (
        subordinates.map((item) => {
          const { counts, total } = countsFor(item.subordinate_id);
          const employeeExceptions = exceptions
            .filter((e) => e.employee_id === item.subordinate_id)
            .sort((a, b) => a.date.localeCompare(b.date));
          return (
            <Card key={item.id} style={styles.card}>
              <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Avatar name={item.subordinate.full_name} uri={item.subordinate.avatar_url} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.subordinate.full_name}</Text>
                  <Text style={styles.sub}>{item.subordinate.user_code}</Text>
                </View>
                <Text style={styles.total}>
                  {total} {t('totalDays')}
                </Text>
              </View>

              {total === 0 ? (
                <Text style={styles.empty}>{t('noExceptionsThisMonth')}</Text>
              ) : (
                <>
                  <View style={[styles.chips, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    {(Object.keys(counts) as AttendanceExceptionType[])
                      .filter((k) => counts[k] > 0)
                      .map((k) => (
                        <View key={k} style={styles.chip}>
                          <Text style={styles.chipText}>
                            {typeLabels[k]}: {counts[k]}
                          </Text>
                        </View>
                      ))}
                  </View>
                  <View style={styles.dateList}>
                    {employeeExceptions.map((ex) => (
                      <View
                        key={ex.id}
                        style={[styles.dateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                      >
                        <Text style={styles.dateRowDate}>{formatDate(ex.date, language)}</Text>
                        <Text style={styles.dateRowType}>{typeLabels[ex.type]}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  actionBtn: { flex: 1 },
  monthRow: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  card: { marginBottom: spacing.md },
  row: { alignItems: 'center', gap: spacing.md },
  name: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  sub: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  total: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  empty: { fontSize: 13, color: colors.mutedText, marginTop: spacing.sm },
  chips: { flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    backgroundColor: colors.softBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  dateList: { marginTop: spacing.sm, gap: 4 },
  dateRow: { justifyContent: 'space-between' },
  dateRowDate: { fontSize: 12, color: colors.textDark, fontWeight: '600' },
  dateRowType: { fontSize: 12, color: colors.mutedText },
});
