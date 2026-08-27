/**
 * "مدارسي" — home tab. Simple flat list of schools (spec: no stage
 * grouping). Each row opens the school detail screen.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen, Header, EmptyState, Loading, Input, Button } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { useAuth } from '@/context/AuthContext';
import { listSchools, createSchool } from '@/lib/api';
import type { School } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function SchoolsScreen() {
  const { t, isRTL } = useLanguage();
  const { profile } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const canManage = profile?.role === 'coordinator' || profile?.role === 'supervisor';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listSchools();
      setSchools(data);
    } catch {
      setSchools([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onAddSchool = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await createSchool({ name: newName.trim(), stage: 'primary', region: 'مبارك الكبير' });
      setNewName('');
      setAddOpen(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={false}>
      <Header title={t('mySchools')} subtitle={t('placeholderSchoolsNotice')} />
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={schools}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState message={t('noResults')} icon="school-outline" />}
          ListHeaderComponent={
            canManage ? (
              addOpen ? (
                <View style={styles.addRow}>
                  <Input placeholder={t('addSchool')} value={newName} onChangeText={setNewName} style={{ flex: 1 }} />
                  <Button title={t('save')} onPress={onAddSchool} loading={saving} />
                </View>
              ) : (
                <Pressable style={styles.addBtn} onPress={() => setAddOpen(true)}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.addBtnText}>{t('addSchool')}</Text>
                </Pressable>
              )
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable style={styles.row} onPress={() => router.push(`/school/${item.id}`)}>
              <View style={[styles.rowIcon]}>
                <Ionicons name="school-outline" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowTitle, { textAlign: isRTL ? 'right' : 'left' }]}>{item.name}</Text>
                <Text style={[styles.rowSub, { textAlign: isRTL ? 'right' : 'left' }]}>{item.region}</Text>
              </View>
              <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.mutedText} />
            </Pressable>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, paddingBottom: spacing.xxl * 2, gap: spacing.sm },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  addBtnText: { color: colors.primary, fontWeight: '700' },
  addRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md, alignItems: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  rowSub: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
});
