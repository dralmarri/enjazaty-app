/**
 * Screen 8 — Employees (admin only).
 *
 * Lists the admin's employees and lets them add a new employee profile via an
 * inline form. Non-admins are redirected away.
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Header,
  Input,
  Loading,
  Screen,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { createEmployeeProfile, listEmployees } from '@/lib/api';
import type { UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function EmployeesScreen() {
  const { profile, isAdmin, loading: authLoading } = useAuth();
  const { t, isRTL } = useLanguage();
  const [employees, setEmployees] = useState<UserProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      setEmployees(await listEmployees(profile.id));
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) load();
    }, [load, isAdmin])
  );

  if (authLoading) return <Loading />;
  // RBAC guard — only admins may manage employees.
  if (!isAdmin) return <Redirect href="/(tabs)/workspace" />;

  const onAdd = async () => {
    if (!profile || !fullName.trim() || !email.trim()) return;
    setSaving(true);
    try {
      const code = `EMP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      await createEmployeeProfile({
        full_name: fullName.trim(),
        email: email.trim(),
        job_title: jobTitle.trim() || null,
        manager_id: profile.id,
        user_code: code,
      });
      setFullName('');
      setEmail('');
      setJobTitle('');
      setModalOpen(false);
      await load();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={t('employees')}
        showBack
        rightIcon="person-add"
        onRightPress={() => setModalOpen(true)}
      />

      {employees.length === 0 ? (
        <EmptyState icon="people-outline" message={t('noEmployees')} hint={t('addEmployee')} />
      ) : (
        employees.map((emp) => (
          <Card
            key={emp.id}
            style={styles.card}
            onPress={() => router.push(`/employees/${emp.id}`)}
          >
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Avatar name={emp.full_name} uri={emp.avatar_url} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{emp.full_name}</Text>
                <Text style={styles.sub} numberOfLines={1}>
                  {emp.job_title || emp.email}
                </Text>
                <View style={{ marginTop: 4, alignSelf: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Badge label={emp.user_code} tone="muted" />
                </View>
              </View>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={20}
                color={colors.mutedText}
              />
            </View>
          </Card>
        ))
      )}

      {/* Add employee modal */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('addEmployee')}
            </Text>
            <Input label={t('fullName')} value={fullName} onChangeText={setFullName} />
            <Input
              label={t('email')}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input label={t('jobTitle')} value={jobTitle} onChangeText={setJobTitle} />
            <Button
              title={saving ? t('saving') : t('add')}
              onPress={onAdd}
              loading={saving}
              icon="checkmark"
            />
            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setModalOpen(false)}
              style={{ marginTop: spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark, marginBottom: spacing.lg },
});
