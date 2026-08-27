/**
 * School detail — designers list (+add), folders (+add), visits at this
 * school, activities at this school, a "تقرير" launcher, and the Google
 * Maps link. Report generation itself is a v1 stub (see README).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, Card, EmptyState, Loading, Input, Button } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import {
  getSchool,
  listSchoolDesigners,
  listSchoolFolders,
  listVisits,
  listActivities,
  createSchoolFolder,
  searchDesignersByName,
  assignDesignerToSchool,
} from '@/lib/api';
import type { Activity, School, SchoolFolder, UserProfile, Visit } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function SchoolDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, isRTL } = useLanguage();

  const [school, setSchool] = useState<School | null>(null);
  const [designers, setDesigners] = useState<UserProfile[]>([]);
  const [folders, setFolders] = useState<SchoolFolder[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  const [addFolderOpen, setAddFolderOpen] = useState(false);
  const [folderName, setFolderName] = useState('');
  const [addDesignerOpen, setAddDesignerOpen] = useState(false);
  const [designerQuery, setDesignerQuery] = useState('');
  const [designerResults, setDesignerResults] = useState<UserProfile[]>([]);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [s, d, f, v, a] = await Promise.all([
        getSchool(id),
        listSchoolDesigners(id),
        listSchoolFolders(id),
        listVisits(id),
        listActivities(id),
      ]);
      setSchool(s);
      setDesigners(d);
      setFolders(f);
      setVisits(v);
      setActivities(a);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const onAddFolder = async () => {
    if (!id || !folderName.trim()) return;
    await createSchoolFolder(id, folderName.trim());
    setFolderName('');
    setAddFolderOpen(false);
    load();
  };

  const onSearchDesigners = async (q: string) => {
    setDesignerQuery(q);
    if (q.trim().length < 2) {
      setDesignerResults([]);
      return;
    }
    try {
      setDesignerResults(await searchDesignersByName(q));
    } catch {
      setDesignerResults([]);
    }
  };

  const onAssignDesigner = async (designerId: string) => {
    if (!id) return;
    try {
      await assignDesignerToSchool(id, designerId);
      setAddDesignerOpen(false);
      setDesignerQuery('');
      setDesignerResults([]);
      load();
    } catch (e) {
      Alert.alert(t('error'));
    }
  };

  if (loading) return <Loading />;
  if (!school) return <EmptyState message={t('noResults')} />;

  return (
    <Screen>
      <Header title={school.name} subtitle={school.region} />

      <View style={styles.section}>
        <Pressable
          style={styles.mapsLink}
          onPress={() => (school.google_maps_url ? Linking.openURL(school.google_maps_url) : null)}
        >
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text style={styles.mapsText}>
            {school.google_maps_url ? t('openInMaps') : t('noMapsLink')}
          </Text>
        </Pressable>

        <Button title={t('report')} onPress={() => setReportOpen(true)} style={{ marginTop: spacing.md }} />
      </View>

      {/* Designers */}
      <SectionHeader title={t('designers')} onAdd={() => setAddDesignerOpen((v) => !v)} isRTL={isRTL} />
      {addDesignerOpen ? (
        <Card style={{ marginBottom: spacing.md }}>
          <Input placeholder={t('fullName')} value={designerQuery} onChangeText={onSearchDesigners} />
          {designerResults.map((d) => (
            <Pressable key={d.id} style={styles.pickRow} onPress={() => onAssignDesigner(d.id)}>
              <Text>{d.full_name}</Text>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
            </Pressable>
          ))}
        </Card>
      ) : null}
      {designers.length === 0 ? (
        <EmptyState message={t('noResults')} icon="people-outline" />
      ) : (
        designers.map((d) => (
          <Card key={d.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{d.full_name}</Text>
            <Text style={styles.itemSub}>{d.job_title ?? ''}</Text>
          </Card>
        ))
      )}

      {/* Folders */}
      <SectionHeader title={t('folders')} onAdd={() => setAddFolderOpen((v) => !v)} isRTL={isRTL} />
      {addFolderOpen ? (
        <View style={styles.addRow}>
          <Input placeholder={t('addFolder')} value={folderName} onChangeText={setFolderName} style={{ flex: 1 }} />
          <Button title={t('save')} onPress={onAddFolder} />
        </View>
      ) : null}
      {folders.length === 0 ? (
        <EmptyState message={t('noResults')} icon="folder-outline" />
      ) : (
        folders.map((f) => (
          <Card key={f.id} style={styles.itemCard}>
            <View style={styles.rowInline}>
              <Ionicons name="folder-outline" size={18} color={colors.primary} />
              <Text style={styles.itemTitle}>{f.name}</Text>
            </View>
          </Card>
        ))
      )}

      {/* Visits */}
      <SectionHeader title={t('visits')} isRTL={isRTL} />
      {visits.length === 0 ? (
        <EmptyState message={t('noVisitsScheduled')} icon="calendar-outline" />
      ) : (
        visits.map((v) => (
          <Card key={v.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{t(`visitType${capitalize(v.visit_type)}` as any)}</Text>
            <Text style={styles.itemSub}>{v.visit_date}</Text>
          </Card>
        ))
      )}

      {/* Activities */}
      <SectionHeader title={t('activitiesForSchool')} isRTL={isRTL} />
      {activities.length === 0 ? (
        <EmptyState message={t('noActivities')} icon="sparkles-outline" />
      ) : (
        activities.map((a) => (
          <Card key={a.id} style={styles.itemCard}>
            <Text style={styles.itemTitle}>{a.title}</Text>
            <Text style={styles.itemSub}>{a.activity_date}</Text>
          </Card>
        ))
      )}

      <ReportModal
        visible={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </Screen>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function SectionHeader({
  title,
  onAdd,
  isRTL,
}: {
  title: string;
  onAdd?: () => void;
  isRTL: boolean;
}) {
  const { t } = useLanguage();
  return (
    <View style={[styles.sectionHeader, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {onAdd ? (
        <Pressable onPress={onAdd} hitSlop={8}>
          <Ionicons name="add-circle" size={24} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ReportModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<string[]>([]);

  const options: { key: string; labelKey: 'reportVisits' | 'reportActivities' | 'reportDesigners' }[] = [
    { key: 'visits', labelKey: 'reportVisits' },
    { key: 'activities', labelKey: 'reportActivities' },
    { key: 'designers', labelKey: 'reportDesigners' },
  ];

  const toggle = (key: string) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.sheetTitle}>{t('reportContentTitle')}</Text>
          {options.map((o) => (
            <Pressable key={o.key} style={styles.checkRow} onPress={() => toggle(o.key)}>
              <Ionicons
                name={selected.includes(o.key) ? 'checkbox' : 'square-outline'}
                size={20}
                color={colors.primary}
              />
              <Text style={styles.itemTitle}>{t(o.labelKey)}</Text>
            </Pressable>
          ))}
          <Button
            title={t('generateReport')}
            onPress={() => {
              // v1: the report builder itself is stubbed — see README.
              Alert.alert(t('comingSoon'));
              onClose();
            }}
            style={{ marginTop: spacing.md }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.lg },
  mapsLink: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  mapsText: { color: colors.primary, fontWeight: '600' },
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  itemCard: { marginBottom: spacing.sm },
  itemTitle: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  itemSub: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
  rowInline: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  pickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
  },
  sheetTitle: { fontSize: 16, fontWeight: '800', marginBottom: spacing.md, color: colors.textDark },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
});
