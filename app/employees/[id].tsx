/**
 * Screen 9 — Employee profile (admin view).
 *
 * Shows the employee's identity card, their achievements, and quick access to
 * the notes & evaluation screen.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Header,
  Loading,
  Screen,
  SectionTitle,
} from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { getProfile, listAchievements } from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function EmployeeProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language, isRTL } = useLanguage();
  const [employee, setEmployee] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [emp, achs] = await Promise.all([
        getProfile(id),
        listAchievements(id),
      ]);
      setEmployee(emp);
      setAchievements(achs);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Loading />;
  if (!employee) {
    return (
      <Screen>
        <Header title={t('employeeProfile')} showBack />
        <EmptyState icon="alert-circle-outline" message={t('error')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title={t('employeeProfile')} showBack />

      {/* Identity card */}
      <Card style={styles.idCard}>
        <Avatar name={employee.full_name} uri={employee.avatar_url} size={72} />
        <Text style={styles.name}>{employee.full_name}</Text>
        <Text style={styles.job}>{employee.job_title || employee.email}</Text>
        <Badge label={employee.user_code} tone="primary" />
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{achievements.length}</Text>
            <Text style={styles.statLabel}>{t('achievementsCount')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {achievements.filter((a) => a.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>{t('approved')}</Text>
          </View>
        </View>
      </Card>

      <Button
        title={t('notesAndEvaluation')}
        icon="star-outline"
        onPress={() => router.push(`/notes/${employee.id}?employee=1`)}
        style={{ marginTop: spacing.lg }}
      />

      {/* Employee achievements */}
      <SectionTitle title={t('myAchievements')} />
      {achievements.length === 0 ? (
        <EmptyState message={t('noAchievements')} />
      ) : (
        achievements.map((item) => (
          <Card
            key={item.id}
            style={styles.achCard}
            onPress={() => router.push(`/achievement/${item.id}`)}
          >
            <View style={[styles.achRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.achIcon}>
                <Ionicons name="trophy-outline" size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.achTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.achDate}>{formatDate(item.created_at, language)}</Text>
              </View>
              <Badge label={t(item.status)} tone={statusTone(item.status)} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  idCard: { alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 20, fontWeight: '900', color: colors.textDark, marginTop: spacing.sm },
  job: { fontSize: 14, color: colors.mutedText, marginBottom: spacing.xs },
  statRow: { flexDirection: 'row', gap: spacing.xxl, marginTop: spacing.md },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.textDark },
  statLabel: { fontSize: 12, color: colors.mutedText },
  achCard: { marginBottom: spacing.md },
  achRow: { alignItems: 'center', gap: spacing.md },
  achIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  achDate: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
});
