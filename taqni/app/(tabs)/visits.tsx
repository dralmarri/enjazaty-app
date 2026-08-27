/**
 * "زياراتي" (coordinator/supervisor) / "سجلاتي" (designer) — 3 fixed
 * sub-tabs: كالندر, خطة الزيارات, تقارير الزيارة.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, Header, Card, EmptyState, Loading, Input, Select, Button } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { colors, radius, spacing } from '@/theme/colors';
import {
  createCalendarEvent,
  createVisit,
  listCalendarEvents,
  listSchools,
  listVisitReports,
  listVisits,
} from '@/lib/api';
import { scheduleEventReminder } from '@/lib/notifications';
import type { CalendarEvent, School, Visit, VisitReport, VisitType } from '@/types/database';
import type { TranslationKey } from '@/i18n/translations';

type SubTab = 'calendar' | 'plan' | 'reports';

const VISIT_TYPES: { value: VisitType; key: TranslationKey }[] = [
  { value: 'survey', key: 'visitTypeSurvey' },
  { value: 'guidance', key: 'visitTypeGuidance' },
  { value: 'evaluation', key: 'visitTypeEvaluation' },
  { value: 'activity', key: 'visitTypeActivity' },
];

export default function VisitsScreen() {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const [tab, setTab] = useState<SubTab>('calendar');

  const isDesigner = profile?.role === 'designer';
  const title = isDesigner ? t('tabVisitsDesigner') : t('tabVisitsCoordinator');

  const tabs: { key: SubTab; labelKey: TranslationKey }[] = [
    { key: 'calendar', labelKey: 'visitsSubtabCalendar' },
    { key: 'plan', labelKey: 'visitsSubtabPlan' },
    { key: 'reports', labelKey: 'visitsSubtabReports' },
  ];

  return (
    <Screen scroll={false}>
      <Header title={title} />
      <View style={[styles.subtabs, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        {tabs.map((tb) => (
          <Pressable
            key={tb.key}
            style={[styles.subtab, tab === tb.key && styles.subtabActive]}
            onPress={() => setTab(tb.key)}
          >
            <Text style={[styles.subtabText, tab === tb.key && styles.subtabTextActive]}>
              {t(tb.labelKey)}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: spacing.xxl * 2 }}>
        {tab === 'calendar' ? <CalendarTab /> : null}
        {tab === 'plan' ? <PlanTab /> : null}
        {tab === 'reports' ? <ReportsTab /> : null}
      </ScrollView>
    </Screen>
  );
}

function CalendarTab() {
  const { t, isRTL } = useLanguage();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    listCalendarEvents()
      .then(setEvents)
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const onAdd = async () => {
    if (!title.trim() || !date.trim()) return;
    setSaving(true);
    try {
      await createCalendarEvent({
        title: title.trim(),
        description: description.trim() || null,
        event_date: date.trim(),
        event_time: time.trim() || null,
      });
      const scheduled = await scheduleEventReminder({
        title: title.trim(),
        body: description.trim() || t('eventTitle'),
        date: date.trim(),
        time: time.trim() || null,
      });
      if (scheduled) Alert.alert(t('notificationScheduled'));
      setTitle('');
      setDescription('');
      setDate('');
      setTime('');
      setFormOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {formOpen ? (
        <Card style={styles.formCard}>
          <Input label={t('eventTitle')} value={title} onChangeText={setTitle} />
          <Input label={t('eventDescription')} value={description} onChangeText={setDescription} multiline />
          <Input label={`${t('date')} (YYYY-MM-DD)`} value={date} onChangeText={setDate} />
          <Input label={`${t('time')} (HH:mm)`} value={time} onChangeText={setTime} placeholder="18:00" />
          <View style={styles.formActions}>
            <Button title={t('cancel')} variant="outline" onPress={() => setFormOpen(false)} style={{ flex: 1 }} />
            <Button title={t('save')} onPress={onAdd} loading={saving} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button title={t('addCalendarEntry')} onPress={() => setFormOpen(true)} style={{ marginBottom: spacing.md }} />
      )}

      {loading ? (
        <Loading />
      ) : events.length === 0 ? (
        <EmptyState message={t('noEvents')} icon="calendar-outline" />
      ) : (
        events.map((e) => (
          <Card key={e.id} style={styles.itemCard}>
            <Text style={[styles.itemTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{e.title}</Text>
            <Text style={styles.itemSub}>
              {e.event_date} {e.event_time ? `· ${e.event_time}` : ''}
            </Text>
          </Card>
        ))
      )}
    </View>
  );
}

function PlanTab() {
  const { t } = useLanguage();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([listVisits(), listSchools()])
      .then(([v, s]) => {
        setVisits(v);
        setSchools(s);
      })
      .catch(() => {
        setVisits([]);
        setSchools([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const schoolOptions = useMemo(() => schools.map((s) => ({ label: s.name, value: s.id })), [schools]);
  const typeOptions = useMemo(() => VISIT_TYPES.map((v) => ({ label: t(v.key), value: v.value })), [t]);
  const schoolName = (id: string) => schools.find((s) => s.id === id)?.name ?? id;

  const onAdd = async () => {
    if (!schoolId || !visitType || !date.trim()) return;
    setSaving(true);
    try {
      await createVisit({
        school_id: schoolId,
        visit_type: visitType,
        visit_date: date.trim(),
        visit_time: time.trim() || null,
      });
      setSchoolId(null);
      setVisitType(null);
      setDate('');
      setTime('');
      setFormOpen(false);
      Alert.alert(t('visitSaved'));
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {formOpen ? (
        <Card style={styles.formCard}>
          <Select label={t('school')} placeholder={t('school')} options={schoolOptions} value={schoolId} onChange={setSchoolId} />
          <Select label={t('visitType')} placeholder={t('visitType')} options={typeOptions} value={visitType} onChange={(v) => setVisitType(v as VisitType)} />
          <Input label={`${t('visitDate')} (YYYY-MM-DD)`} value={date} onChangeText={setDate} />
          <Input label={t('visitTimeOptional')} value={time} onChangeText={setTime} placeholder="10:00" />
          <View style={styles.formActions}>
            <Button title={t('cancel')} variant="outline" onPress={() => setFormOpen(false)} style={{ flex: 1 }} />
            <Button title={t('save')} onPress={onAdd} loading={saving} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button title={t('scheduleVisit')} onPress={() => setFormOpen(true)} style={{ marginBottom: spacing.md }} />
      )}

      {loading ? (
        <Loading />
      ) : visits.length === 0 ? (
        <EmptyState message={t('noVisitsScheduled')} icon="calendar-outline" />
      ) : (
        visits.map((v) => (
          <Card key={v.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{schoolName(v.school_id)}</Text>
            <Text style={styles.itemSub}>
              {v.visit_date} {v.visit_time ? `· ${v.visit_time}` : ''} · {t(VISIT_TYPES.find((x) => x.value === v.visit_type)?.key ?? 'visitTypeGuidance')}
            </Text>
          </Card>
        ))
      )}
    </View>
  );
}

function ReportsTab() {
  const { t } = useLanguage();
  const [reports, setReports] = useState<VisitReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listVisitReports()
      .then(setReports)
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (reports.length === 0) return <EmptyState message={t('noVisitReports')} icon="document-text-outline" />;

  return (
    <View>
      {reports.map((r) => (
        <Card key={r.id} style={styles.itemCard}>
          <Text style={styles.itemSub}>{new Date(r.created_at).toLocaleDateString()}</Text>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  subtabs: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  subtab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
  },
  subtabActive: { backgroundColor: colors.primary },
  subtabText: { fontSize: 12, fontWeight: '700', color: colors.textDark },
  subtabTextActive: { color: colors.onPrimary },
  formCard: { marginHorizontal: spacing.lg, marginBottom: spacing.md },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  itemCard: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  itemSub: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
});
