/**
 * Members — the supervisors (admins) who can view my page. These are the users
 * who added me (by my User ID) as a subordinate, and who can evaluate my work.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Avatar, Card, EmptyState, Header, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listMembers } from '@/lib/api';
import type { UserProfile } from '@/types/database';
import { colors, spacing } from '@/theme/colors';

export default function MembersScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      setMembers(await listMembers(profile.id));
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

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header title={t('members')} subtitle={t('membersHint')} showBack />

      {members.length === 0 ? (
        <EmptyState icon="eye-outline" message={t('noMembers')} />
      ) : (
        members.map((m) => (
          <Card key={m.id} style={styles.card}>
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Avatar name={m.full_name} uri={m.avatar_url} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{m.full_name}</Text>
                <Text style={styles.sub}>
                  {m.job_title || m.administration || m.user_code}
                </Text>
              </View>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.primaryDark} />
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { alignItems: 'center', gap: spacing.md },
  name: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  sub: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
});
