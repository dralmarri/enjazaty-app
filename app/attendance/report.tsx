/**
 * Monthly attendance report — per subordinate counts of each exception type
 * for the selected month. A missing row means no exceptions were recorded,
 * i.e. present for the whole month.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Avatar, Card, EmptyState, Header, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listAttendanceExceptionsForRange, listSupervisions } from '@/lib/api';
import { monthName } from '@/lib/format';
import type { AttendanceException, AttendanceExceptionType, Supervision, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

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
  };

  const label = useMemo(
    () => `${monthName(month.getMonth(), language)} ${month.getFullYear()}`,
    [month, language]
  );

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

      {subordinates.length === 0 ? (
        <EmptyState icon="stats-chart-outline" message={t('noSubordinatesForAttendance')} />
      ) : (
        subordinates.map((item) => {
          const { counts, total } = countsFor(item.subordinate_id);
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
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
