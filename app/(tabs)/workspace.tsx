/**
 * Screen 4 — Smart home / workspace.
 * Shows a greeting + user ID, role-based quick actions, live stats, and the
 * most recent achievements.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Screen,
  SectionTitle,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listAchievements } from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement } from '@/types/database';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export default function WorkspaceScreen() {
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      const data = await listAchievements(profile.id);
      setAchievements(data);
    } catch {
      // network/RLS error — keep previous data
    } finally {
      setRefreshing(false);
    }
  }, [profile]);

  // Reload whenever the tab gains focus (e.g. after adding an achievement).
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const stats = {
    total: achievements.length,
    approved: achievements.filter((a) => a.status === 'approved').length,
    pending: achievements.filter((a) => a.status === 'submitted').length,
  };

  // Role-based quick actions.
  const actions = [
    {
      key: 'add',
      label: t('addAchievement'),
      icon: 'add-circle-outline' as const,
      onPress: () => router.push('/achievement/new'),
      show: true,
    },
    {
      key: 'folders',
      label: t('createFolder'),
      icon: 'folder-open-outline' as const,
      onPress: () => router.push('/(tabs)/files'),
      show: true,
    },
    {
      key: 'employees',
      label: t('manageEmployees'),
      icon: 'people-outline' as const,
      onPress: () => router.push('/employees'),
      show: isAdmin, // admin only
    },
    {
      key: 'analytics',
      label: t('analytics'),
      icon: 'analytics-outline' as const,
      onPress: () => router.push('/(tabs)/notifications'),
      show: isAdmin,
    },
  ].filter((a) => a.show);

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      {/* Greeting header */}
      <View style={[styles.greetRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetHi}>{t('welcome')} 👋</Text>
          <Text style={styles.greetName}>{profile?.full_name}</Text>
          <View style={[styles.idChip, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Ionicons name="id-card-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.idText}>
              {t('yourUserId')}: {profile?.user_code}
            </Text>
          </View>
        </View>
        <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={56} />
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <StatCard label={t('total')} value={stats.total} icon="documents-outline" />
        <StatCard
          label={t('approved')}
          value={stats.approved}
          icon="checkmark-done-outline"
          tone={colors.success}
        />
        <StatCard
          label={t('pending')}
          value={stats.pending}
          icon="time-outline"
          tone={colors.primaryDark}
        />
      </View>

      {/* Quick actions */}
      <SectionTitle title={t('quickActions')} />
      <View style={styles.actionsGrid}>
        {actions.map((a) => (
          <Pressable key={a.key} style={styles.actionCard} onPress={a.onPress}>
            <View style={styles.actionIcon}>
              <Ionicons name={a.icon} size={24} color={colors.primaryDark} />
            </View>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Recent achievements */}
      <SectionTitle
        title={t('recentAchievements')}
        actionLabel={t('myAchievements')}
        onAction={() => router.push('/(tabs)/activity')}
      />
      {achievements.length === 0 ? (
        <EmptyState message={t('noAchievements')} hint={t('addAchievement')} />
      ) : (
        achievements.slice(0, 5).map((item) => (
          <Card
            key={item.id}
            style={styles.achievementCard}
            onPress={() => router.push(`/achievement/${item.id}`)}
          >
            <View style={[styles.achRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.achTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.achDate}>
                  {formatDate(item.created_at, language)}
                </Text>
              </View>
              <Badge label={t(item.status)} tone={statusTone(item.status)} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone = colors.textDark,
}: {
  label: string;
  value: number;
  icon: keyof typeof Ionicons.glyphMap;
  tone?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={20} color={tone} />
      <Text style={[styles.statValue, { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  greetRow: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  greetHi: { fontSize: 14, color: colors.mutedText },
  greetName: { fontSize: 24, fontWeight: '900', color: colors.textDark, marginTop: 2 },
  idChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.softBackground,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginTop: spacing.sm,
  },
  idText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'center',
    gap: 4,
    ...shadow,
  },
  statValue: { fontSize: 22, fontWeight: '900' },
  statLabel: { fontSize: 12, color: colors.mutedText },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...shadow,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textDark },
  achievementCard: { marginBottom: spacing.md },
  achRow: { alignItems: 'center', gap: spacing.md },
  achTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  achDate: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
});
