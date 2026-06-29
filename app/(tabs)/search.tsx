/**
 * Search tab — search your achievements by title/description, and look up a
 * user by their User ID.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  Badge,
  Card,
  EmptyState,
  Header,
  Input,
  Screen,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getProfileByCode, listAchievements } from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function SearchScreen() {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [query, setQuery] = useState('');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setAchievements(await listAchievements(profile.id));
    } catch {
      // ignore
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Filter own achievements by the query.
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return achievements.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q)
    );
  }, [query, achievements]);

  // If the query looks like a User ID, try to resolve it.
  const onLookupUser = useCallback(async () => {
    const q = query.trim();
    if (!q) {
      setFoundUser(null);
      return;
    }
    const user = await getProfileByCode(q);
    setFoundUser(user);
  }, [query]);

  return (
    <Screen>
      <Header title={t('search')} />

      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={t('searchHint')}
        autoCapitalize="none"
        onSubmitEditing={onLookupUser}
        returnKeyType="search"
      />

      {/* Resolved user (by User ID) */}
      {foundUser ? (
        <Card
          style={styles.userCard}
          onPress={() => router.push(`/employees/${foundUser.id}`)}
        >
          <View style={[styles.userRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <View style={styles.iconBox}>
              <Ionicons name="person-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{foundUser.full_name}</Text>
              <Text style={styles.userSub}>{foundUser.user_code}</Text>
            </View>
            <Ionicons
              name={isRTL ? 'chevron-back' : 'chevron-forward'}
              size={20}
              color={colors.mutedText}
            />
          </View>
        </Card>
      ) : null}

      {/* Achievement results */}
      {query.trim().length === 0 ? (
        <EmptyState icon="search-outline" message={t('searchHint')} />
      ) : results.length === 0 && !foundUser ? (
        <EmptyState icon="search-outline" message={t('noResults')} />
      ) : (
        results.map((item) => (
          <Card
            key={item.id}
            style={styles.card}
            onPress={() => router.push(`/achievement/${item.id}`)}
          >
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.iconBox}>
                <Ionicons name="trophy-outline" size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.date}>{formatDate(item.created_at, language)}</Text>
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
  userCard: { marginBottom: spacing.md },
  userRow: { alignItems: 'center', gap: spacing.md },
  userName: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  userSub: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
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
  date: { fontSize: 11, color: colors.mutedText, marginTop: 4 },
});
