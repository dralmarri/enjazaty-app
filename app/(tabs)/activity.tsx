/**
 * Activity tab — the full feed of the user's achievements with quick status
 * filtering. Tapping an item opens its details screen.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Badge, Card, EmptyState, Header, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listAchievements } from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, AchievementStatus } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

type Filter = 'all' | AchievementStatus;

export default function ActivityScreen() {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      setAchievements(await listAchievements(profile.id));
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('total') },
    { key: 'draft', label: t('draft') },
    { key: 'submitted', label: t('submitted') },
    { key: 'approved', label: t('approved') },
  ];

  const visible = useMemo(
    () =>
      filter === 'all'
        ? achievements
        : achievements.filter((a) => a.status === filter),
    [achievements, filter]
  );

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={t('activity')}
        rightIcon="add-circle"
        onRightPress={() => router.push('/achievement/new')}
      />

      {/* Filter chips */}
      <View style={styles.filterRow}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {visible.length === 0 ? (
        <EmptyState message={t('noAchievements')} hint={t('addAchievement')} />
      ) : (
        visible.map((item) => (
          <Card
            key={item.id}
            style={styles.card}
            onPress={() => router.push(`/achievement/${item.id}`)}
          >
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.iconBox}>
                <Ionicons name="trophy-outline" size={22} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                {item.description ? (
                  <Text style={styles.desc} numberOfLines={1}>
                    {item.description}
                  </Text>
                ) : null}
                <Text style={styles.date}>
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

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.mutedText },
  chipTextActive: { color: colors.onPrimary },
  card: { marginBottom: spacing.md },
  row: { alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  desc: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  date: { fontSize: 11, color: colors.mutedText, marginTop: 4 },
});
