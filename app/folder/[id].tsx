/**
 * Folder contents — lists the achievements placed inside a folder.
 *  - The owner can add achievements directly into this folder and open their
 *    details.
 *  - A supervisor browsing a subordinate's folder taps an achievement to
 *    evaluate it.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Badge,
  Card,
  EmptyState,
  Header,
  Loading,
  Screen,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { getFolder, listAchievementsByFolder } from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, Folder } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function FolderContentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [f, achs] = await Promise.all([
        getFolder(id),
        listAchievementsByFolder(id),
      ]);
      setFolder(f);
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

  const isOwner = folder?.owner_id === profile?.id;

  return (
    <Screen refreshing={false} onRefresh={load}>
      <Header
        title={folder?.name ?? t('folderContents')}
        showBack
        rightIcon={isOwner ? 'add-circle' : undefined}
        onRightPress={
          isOwner ? () => router.push(`/achievement/new?folder=${id}`) : undefined
        }
      />

      {achievements.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          message={t('emptyFolder')}
          hint={isOwner ? t('addToFolder') : undefined}
        />
      ) : (
        achievements.map((item) => (
          <Card
            key={item.id}
            style={styles.card}
            onPress={() =>
              router.push(isOwner ? `/achievement/${item.id}` : `/evaluate/${item.id}`)
            }
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
