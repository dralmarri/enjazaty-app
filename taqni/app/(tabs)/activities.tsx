/**
 * "أنشطة" — two sections: activities the coordinator herself completed
 * (school_id = null), and activities at schools she supervises.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, Header, Card, EmptyState, Loading, Input, Select, Button } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { createActivity, listActivities, listSchools } from '@/lib/api';
import type { Activity, School } from '@/types/database';
import { spacing } from '@/theme/colors';

export default function ActivitiesScreen() {
  const { t } = useLanguage();
  const [own, setOwn] = useState<Activity[]>([]);
  const [schoolActivities, setSchoolActivities] = useState<Activity[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [all, s] = await Promise.all([listActivities(), listSchools()]);
      setOwn(all.filter((a) => !a.school_id));
      setSchoolActivities(all.filter((a) => !!a.school_id));
      setSchools(s);
    } catch {
      setOwn([]);
      setSchoolActivities([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const schoolOptions = useMemo(() => schools.map((s) => ({ label: s.name, value: s.id })), [schools]);
  const schoolName = (id: string | null) => schools.find((s) => s.id === id)?.name ?? '';

  const onAdd = async () => {
    if (!title.trim() || !date.trim()) return;
    setSaving(true);
    try {
      await createActivity({ title: title.trim(), activity_date: date.trim(), school_id: schoolId });
      setTitle('');
      setDate('');
      setSchoolId(null);
      setFormOpen(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={false}>
      <Header title={t('tabActivities')} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 2 }}>
        {formOpen ? (
          <Card style={{ marginBottom: spacing.lg }}>
            <Input label={t('activityTitle')} value={title} onChangeText={setTitle} />
            <Select
              label={`${t('school')} (${t('optional')})`}
              placeholder={t('school')}
              options={schoolOptions}
              value={schoolId}
              onChange={setSchoolId}
            />
            <Input label={`${t('date')} (YYYY-MM-DD)`} value={date} onChangeText={setDate} />
            <View style={styles.formActions}>
              <Button title={t('cancel')} variant="outline" onPress={() => setFormOpen(false)} style={{ flex: 1 }} />
              <Button title={t('save')} onPress={onAdd} loading={saving} style={{ flex: 1 }} />
            </View>
          </Card>
        ) : (
          <Button title={t('addActivity')} onPress={() => setFormOpen(true)} style={{ marginBottom: spacing.lg }} />
        )}

        {loading ? (
          <Loading />
        ) : (
          <>
            <Text style={styles.sectionTitle}>{t('activitiesSectionCoordinator')}</Text>
            {own.length === 0 ? (
              <EmptyState message={t('noActivities')} icon="sparkles-outline" />
            ) : (
              own.map((a) => (
                <Card key={a.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{a.title}</Text>
                  <Text style={styles.itemSub}>{a.activity_date}</Text>
                </Card>
              ))
            )}

            <Text style={styles.sectionTitle}>{t('activitiesSectionSchools')}</Text>
            {schoolActivities.length === 0 ? (
              <EmptyState message={t('noActivities')} icon="business-outline" />
            ) : (
              schoolActivities.map((a) => (
                <Card key={a.id} style={styles.itemCard}>
                  <Text style={styles.itemTitle}>{a.title}</Text>
                  <Text style={styles.itemSub}>
                    {schoolName(a.school_id)} · {a.activity_date}
                  </Text>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 15, fontWeight: '800', marginTop: spacing.lg, marginBottom: spacing.sm },
  itemCard: { marginBottom: spacing.sm },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemSub: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  formActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
