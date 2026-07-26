/**
 * Search tab — search your achievements by title/description, and the
 * circulars & official letters addressed to you (or sent by you, for an
 * admin) by title or body text.
 *
 * For an admin it also searches the employees he supervises (by name, User ID
 * or job title) and resolves any exact User ID. An employee supervises nobody,
 * so his search covers his own achievements and circulars only.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  AchievementRow,
  Avatar,
  Card,
  EmptyState,
  Header,
  Input,
  Screen,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  getProfileByCode,
  listAchievements,
  listReceivedCirculars,
  listSentCirculars,
  listSupervisedUsers,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Achievement, Circular, CircularKind, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function SearchScreen() {
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();
  // An employee has no one to look up, so the hint only mentions achievements.
  const hint = isAdmin ? t('searchHint') : t('searchHintOwn');
  const [query, setQuery] = useState('');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [circulars, setCirculars] = useState<Circular[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [mine, supervised, received, sent] = await Promise.all([
        listAchievements(profile.id),
        isAdmin ? listSupervisedUsers(profile.id) : Promise.resolve([]),
        listReceivedCirculars(profile.id),
        isAdmin ? listSentCirculars(profile.id) : Promise.resolve([]),
      ]);
      setAchievements(mine);
      setTeam(supervised);
      // Received + sent (admins), deduplicated by circular id.
      const byId = new Map<string, Circular>();
      received.forEach((r) => byId.set(r.circular.id, r.circular));
      sent.forEach((c) => byId.set(c.id, c));
      setCirculars(Array.from(byId.values()));
    } catch {
      // ignore
    }
  }, [profile, isAdmin]);

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

  // Employees under this user (any depth) matching the query by name, User ID
  // or job title.
  const teamResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return team.filter(
      (u) =>
        u.full_name.toLowerCase().includes(q) ||
        u.user_code.toLowerCase().includes(q) ||
        (u.job_title ?? '').toLowerCase().includes(q)
    );
  }, [query, team]);

  // Circulars & official letters matched by title (also how attachments are
  // labeled) or body text (the text an admin writes for a text circular).
  const circularResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return circulars.filter(
      (c) =>
        c.title.toLowerCase().includes(q) || (c.body ?? '').toLowerCase().includes(q)
    );
  }, [query, circulars]);

  const kindLabel = (k: CircularKind) =>
    k === 'letter' ? t('kindLetter') : k === 'announcement' ? t('kindAnnouncement') : t('kindCircular');

  // If the query looks like a User ID, try to resolve it (admins only).
  const onLookupUser = useCallback(async () => {
    const q = query.trim();
    if (!q || !isAdmin) {
      setFoundUser(null);
      return;
    }
    const user = await getProfileByCode(q);
    setFoundUser(user);
  }, [query, isAdmin]);

  return (
    <Screen>
      <Header title={t('search')} />

      <Input
        value={query}
        onChangeText={setQuery}
        placeholder={hint}
        autoCapitalize="none"
        onSubmitEditing={onLookupUser}
        returnKeyType="search"
      />

      {/* Employees you supervise, matched by name / User ID / job title */}
      {teamResults.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('employees')}
          </Text>
          {teamResults.map((u) => (
            <Card
              key={u.id}
              style={styles.userCard}
              onPress={() => router.push(`/employees/${u.id}`)}
            >
              <View style={[styles.userRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Avatar name={u.full_name} uri={u.avatar_url} size={44} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName}>{u.full_name}</Text>
                  <Text style={styles.userSub}>
                    {u.job_title ? `${u.job_title} · ${u.user_code}` : u.user_code}
                  </Text>
                </View>
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={20}
                  color={colors.mutedText}
                />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {/* Resolved user (by User ID) */}
      {foundUser && !teamResults.some((u) => u.id === foundUser.id) ? (
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

      {/* Circulars & official letters matched by title or body text */}
      {circularResults.length > 0 ? (
        <>
          <Text style={[styles.sectionTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('circulars')}
          </Text>
          {circularResults.map((c) => (
            <Card
              key={c.id}
              style={styles.userCard}
              onPress={() => router.push(`/circulars/${c.id}`)}
            >
              <View style={[styles.userRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <View style={styles.iconBox}>
                  <Ionicons
                    name={c.pinned ? 'pin' : 'megaphone-outline'}
                    size={20}
                    color={colors.primaryDark}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={2}>
                    {c.title}
                  </Text>
                  <Text style={styles.userSub}>
                    {kindLabel(c.kind)}
                    {c.number ? ` · ${c.number}` : ''} · {formatDate(c.created_at, language)}
                  </Text>
                </View>
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={20}
                  color={colors.mutedText}
                />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {/* Achievement results */}
      {query.trim().length === 0 ? (
        <EmptyState icon="search-outline" message={hint} />
      ) : results.length === 0 &&
        teamResults.length === 0 &&
        circularResults.length === 0 &&
        !foundUser ? (
        <EmptyState icon="search-outline" message={t('noResults')} />
      ) : (
        results.map((item) => (
          <AchievementRow
            key={item.id}
            achievement={item}
            editable
            onChanged={load}
            onPress={() => router.push(`/achievement/${item.id}`)}
          />
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.sm,
  },
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
