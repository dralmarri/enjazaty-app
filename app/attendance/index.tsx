/**
 * Daily attendance marking — a supervisor sees their direct subordinates
 * and records an exception (absent / sick leave / emergency leave /
 * permission) for the selected day. No entry = present, so most days
 * require no action at all.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Avatar, Badge, Button, Card, EmptyState, Header, Input, Screen, Select } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  clearAttendanceException,
  listAttendanceExceptions,
  listSupervisions,
  upsertAttendanceException,
} from '@/lib/api';
import { formatDate, monthName } from '@/lib/format';
import type { AttendanceException, AttendanceExceptionType, Supervision, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Every date key from `from` to `to`, inclusive. */
function dateRangeKeys(from: Date, to: Date): string[] {
  const keys: string[] = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    keys.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return keys;
}

const TYPES: AttendanceExceptionType[] = [
  'absent',
  'sick_leave',
  'emergency_leave',
  'permission',
  'leave',
];

export default function AttendanceScreen() {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [day, setDay] = useState(() => new Date());
  const [subordinates, setSubordinates] = useState<(Supervision & { subordinate: UserProfile })[]>([]);
  const [exceptions, setExceptions] = useState<AttendanceException[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [menuFor, setMenuFor] = useState<UserProfile | null>(null);
  const [noteFor, setNoteFor] = useState<{ employee: UserProfile; type: AttendanceExceptionType } | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  // "leave" spans a date range instead of the single selected day.
  const [leaveRangeFor, setLeaveRangeFor] = useState<UserProfile | null>(null);
  const [fromDay, setFromDay] = useState<string | null>(null);
  const [fromMonth, setFromMonth] = useState<string | null>(null);
  const [fromYear, setFromYear] = useState<string | null>(null);
  const [toDay, setToDay] = useState<string | null>(null);
  const [toMonth, setToMonth] = useState<string | null>(null);
  const [toYear, setToYear] = useState<string | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);

  const dateKey = useMemo(() => toDateKey(day), [day]);

  const dayOptions = Array.from({ length: 31 }, (_, i) => ({
    label: String(i + 1),
    value: String(i + 1),
  }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: monthName(i, language),
    value: String(i),
  }));
  const now = new Date();
  const yearOptions = Array.from({ length: 3 }, (_, i) => {
    const y = now.getFullYear() - 1 + i;
    return { label: String(y), value: String(y) };
  });

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      const subs = await listSupervisions(profile.id);
      setSubordinates(subs);
      const ex = await listAttendanceExceptions(
        subs.map((s) => s.subordinate_id),
        toDateKey(day)
      );
      setExceptions(ex);
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [profile, day]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const exceptionFor = (employeeId: string) => exceptions.find((e) => e.employee_id === employeeId);

  const statusBadge = (employeeId: string) => {
    const ex = exceptionFor(employeeId);
    if (!ex) return <Badge label={t('present')} tone="success" />;
    return <Badge label={typeLabels[ex.type]} tone={ex.type === 'absent' ? 'danger' : 'primary'} />;
  };

  const shiftDay = (delta: number) => {
    const next = new Date(day);
    next.setDate(next.getDate() + delta);
    setDay(next);
  };

  const onPickType = (type: AttendanceExceptionType) => {
    if (!menuFor) return;
    const employee = menuFor;
    setMenuFor(null);
    if (type === 'leave') {
      setFromDay(null);
      setFromMonth(null);
      setFromYear(null);
      setToDay(null);
      setToMonth(null);
      setToYear(null);
      setRangeError(null);
      setNote('');
      setLeaveRangeFor(employee);
      return;
    }
    setNote('');
    setNoteFor({ employee, type });
  };

  const onSaveLeaveRange = async () => {
    if (!leaveRangeFor || !profile) return;
    if (!fromDay || !fromMonth || !fromYear || !toDay || !toMonth || !toYear) return;
    const from = new Date(Number(fromYear), Number(fromMonth), Number(fromDay));
    const to = new Date(Number(toYear), Number(toMonth), Number(toDay));
    if (to < from) {
      setRangeError(t('invalidDateRange'));
      return;
    }
    setRangeError(null);
    setBusy(true);
    try {
      const employeeId = leaveRangeFor.id;
      const keys = dateRangeKeys(from, to);
      for (const date of keys) {
        await upsertAttendanceException({
          employee_id: employeeId,
          date,
          type: 'leave',
          note: note.trim() || null,
          recorded_by: profile.id,
        });
      }
      setLeaveRangeFor(null);
      setNote('');
      await load();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  const onSaveException = async () => {
    if (!noteFor || !profile) return;
    setBusy(true);
    try {
      await upsertAttendanceException({
        employee_id: noteFor.employee.id,
        date: dateKey,
        type: noteFor.type,
        note: note.trim() || null,
        recorded_by: profile.id,
      });
      setNoteFor(null);
      setNote('');
      await load();
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  const onResetToPresent = async () => {
    if (!menuFor) return;
    const employee = menuFor;
    setMenuFor(null);
    try {
      await clearAttendanceException(employee.id, dateKey);
      await load();
    } catch {
      // ignore
    }
  };

  const typeLabels: Record<AttendanceExceptionType, string> = {
    absent: t('absent'),
    sick_leave: t('sickLeave'),
    emergency_leave: t('emergencyLeave'),
    permission: t('permission'),
    leave: t('leave'),
  };

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={t('attendance')}
        showBack
        rightIcon="stats-chart-outline"
        onRightPress={() => router.push('/attendance/report')}
      />

      <View style={[styles.dateRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable onPress={() => shiftDay(isRTL ? 1 : -1)} hitSlop={8} style={styles.dateArrow}>
          <Ionicons name={isRTL ? 'chevron-forward' : 'chevron-back'} size={20} color={colors.primaryDark} />
        </Pressable>
        <Text style={styles.dateText}>{formatDate(day.toISOString(), language)}</Text>
        <Pressable onPress={() => shiftDay(isRTL ? -1 : 1)} hitSlop={8} style={styles.dateArrow}>
          <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={20} color={colors.primaryDark} />
        </Pressable>
      </View>

      {subordinates.length === 0 ? (
        <EmptyState icon="calendar-outline" message={t('noSubordinatesForAttendance')} />
      ) : (
        subordinates.map((item) => (
          <Card key={item.id} style={styles.card} onPress={() => setMenuFor(item.subordinate)}>
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Avatar name={item.subordinate.full_name} uri={item.subordinate.avatar_url} size={44} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.subordinate.full_name}</Text>
                <Text style={styles.sub}>{item.subordinate.user_code}</Text>
              </View>
              <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                {statusBadge(item.subordinate.id)}
                <Text style={styles.rowDate}>{formatDate(day.toISOString(), language)}</Text>
              </View>
            </View>
          </Card>
        ))
      )}

      {/* Status picker */}
      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuFor(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{menuFor?.full_name}</Text>
            <Text style={styles.sheetDate}>{formatDate(day.toISOString(), language)}</Text>

            {exceptionFor(menuFor?.id ?? '') ? (
              <Pressable
                style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={onResetToPresent}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
                </View>
                <Text style={styles.menuLabel}>{t('markAsPresent')}</Text>
              </Pressable>
            ) : null}

            {TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => onPickType(type)}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name="ellipse-outline" size={18} color={colors.primaryDark} />
                </View>
                <Text style={styles.menuLabel}>{typeLabels[type]}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Optional note before saving */}
      <Modal visible={!!noteFor} transparent animationType="fade" onRequestClose={() => setNoteFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setNoteFor(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {noteFor ? `${noteFor.employee.full_name} — ${typeLabels[noteFor.type]}` : ''}
            </Text>
            <Text style={[styles.sheetDate, { textAlign: isRTL ? 'right' : 'left' }]}>
              {formatDate(day.toISOString(), language)}
            </Text>
            <Input value={note} onChangeText={setNote} placeholder={t('attendanceNote')} multiline />
            <Button title={busy ? t('saving') : t('markAttendance')} onPress={onSaveException} loading={busy} icon="checkmark" />
            <Button title={t('cancel')} variant="outline" onPress={() => setNoteFor(null)} style={{ marginTop: spacing.sm }} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Leave — pick a date range instead of a single day */}
      <Modal
        visible={!!leaveRangeFor}
        transparent
        animationType="fade"
        onRequestClose={() => setLeaveRangeFor(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setLeaveRangeFor(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {leaveRangeFor ? `${leaveRangeFor.full_name} — ${t('leave')}` : ''}
            </Text>

            <Text style={styles.periodSubLabel}>{t('fromDate')}</Text>
            <View style={[styles.dateFieldRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.dateField}>
                <Select value={fromDay} options={dayOptions} onChange={setFromDay} placeholder={t('selectDay')} />
              </View>
              <View style={styles.dateField}>
                <Select
                  value={fromMonth}
                  options={monthOptions}
                  onChange={setFromMonth}
                  placeholder={t('selectMonthLabel')}
                />
              </View>
              <View style={styles.dateField}>
                <Select value={fromYear} options={yearOptions} onChange={setFromYear} placeholder={t('selectYear')} />
              </View>
            </View>

            <Text style={styles.periodSubLabel}>{t('toDate')}</Text>
            <View style={[styles.dateFieldRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.dateField}>
                <Select value={toDay} options={dayOptions} onChange={setToDay} placeholder={t('selectDay')} />
              </View>
              <View style={styles.dateField}>
                <Select
                  value={toMonth}
                  options={monthOptions}
                  onChange={setToMonth}
                  placeholder={t('selectMonthLabel')}
                />
              </View>
              <View style={styles.dateField}>
                <Select value={toYear} options={yearOptions} onChange={setToYear} placeholder={t('selectYear')} />
              </View>
            </View>

            <Input value={note} onChangeText={setNote} placeholder={t('attendanceNote')} multiline />

            {rangeError ? <Text style={styles.error}>{rangeError}</Text> : null}

            <Button
              title={busy ? t('saving') : t('markAttendance')}
              onPress={onSaveLeaveRange}
              loading={busy}
              icon="checkmark"
            />
            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setLeaveRangeFor(null)}
              style={{ marginTop: spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateRow: { alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.lg },
  dateArrow: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  card: { marginBottom: spacing.md },
  row: { alignItems: 'center', gap: spacing.md },
  name: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  sub: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark },
  sheetDate: { fontSize: 13, color: colors.mutedText, marginTop: 2, marginBottom: spacing.lg },
  rowDate: { fontSize: 11, color: colors.mutedText, marginTop: 4 },
  menuRow: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 16, fontWeight: '600', color: colors.textDark },
  periodSubLabel: { fontSize: 13, fontWeight: '700', color: colors.mutedText, marginTop: spacing.md },
  dateFieldRow: { gap: spacing.sm, marginTop: spacing.xs },
  dateField: { flex: 1 },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.sm },
});
