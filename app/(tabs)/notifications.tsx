/**
 * Screen 11 — Notifications (+ Analytics for admins).
 *
 * Employees see their notifications feed. Admins additionally see an
 * analytics summary (employees, achievements, approval rate) at the top.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  Card,
  EmptyState,
  Header,
  Screen,
  SectionTitle,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  listAchievements,
  listEmployees,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { AppNotification } from '@/types/database';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export default function NotificationsScreen() {
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState({
    employees: 0,
    achievements: 0,
    approved: 0,
  });

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      const [notifs] = await Promise.all([listNotifications(profile.id)]);
      setItems(notifs);

      if (isAdmin) {
        const [employees, achievements] = await Promise.all([
          listEmployees(profile.id),
          listAchievements(profile.id),
        ]);
        setAnalytics({
          employees: employees.length,
          achievements: achievements.length,
          approved: achievements.filter((a) => a.status === 'approved').length,
        });
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [profile, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onMarkAll = async () => {
    if (!profile) return;
    try {
      await markAllNotificationsRead(profile.id);
      await load();
    } catch {
      // ignore
    }
  };

  const onTap = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, read: true } : x))
        );
      } catch {
        // ignore
      }
    }
  };

  const iconFor = (type: AppNotification['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'achievement':
        return 'trophy-outline';
      case 'evaluation':
        return 'star-outline';
      case 'note':
        return 'chatbubble-ellipses-outline';
      case 'assignment':
        return 'people-outline';
      default:
        return 'notifications-outline';
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={isAdmin ? t('analytics') : t('notifications')}
        rightIcon="checkmark-done-outline"
        onRightPress={onMarkAll}
      />

      {/* Admin analytics */}
      {isAdmin ? (
        <>
          <View style={styles.statsRow}>
            <Metric label={t('employees')} value={analytics.employees} icon="people-outline" />
            <Metric
              label={t('total')}
              value={analytics.achievements}
              icon="documents-outline"
            />
            <Metric
              label={t('approved')}
              value={analytics.approved}
              icon="checkmark-done-outline"
              tone={colors.success}
            />
          </View>
          <SectionTitle title={t('notifications')} actionLabel={t('markAllRead')} onAction={onMarkAll} />
        </>
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon="notifications-outline" message={t('noNotifications')} />
      ) : (
        items.map((n) => (
          <Card
            key={n.id}
            style={[styles.card, !n.read && styles.unread]}
            onPress={() => onTap(n)}
          >
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.iconBox}>
                <Ionicons name={iconFor(n.type)} size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{n.title}</Text>
                {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
                <Text style={styles.date}>{formatDate(n.created_at, language)}</Text>
              </View>
              {!n.read ? <View style={styles.dot} /> : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

function Metric({
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
    <View style={styles.metric}>
      <Ionicons name={icon} size={20} color={tone} />
      <Text style={[styles.metricValue, { color: tone }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statsRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  metric: {
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
  metricValue: { fontSize: 22, fontWeight: '900' },
  metricLabel: { fontSize: 12, color: colors.mutedText },
  card: { marginBottom: spacing.md },
  unread: { backgroundColor: colors.softBackground },
  row: { alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: colors.textDark },
  body: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  date: { fontSize: 11, color: colors.mutedText, marginTop: 4 },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
});
