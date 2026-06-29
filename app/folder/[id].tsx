/**
 * Folder contents — sub-folders + achievements placed inside a folder.
 *  - The owner can add achievements or create sub-folders here, and open
 *    achievement details.
 *  - A supervisor browsing a subordinate's folder taps an achievement to
 *    evaluate it, and can open sub-folders.
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Badge,
  Card,
  EmptyState,
  Header,
  Loading,
  Screen,
  SectionTitle,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  getFolder,
  listAchievementsByFolder,
  listChildFolders,
} from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, Folder } from '@/types/database';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export default function FolderContentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [subFolders, setSubFolders] = useState<Folder[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMenu, setAddMenu] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [f, subs, achs] = await Promise.all([
        getFolder(id),
        listChildFolders(id),
        listAchievementsByFolder(id),
      ]);
      setFolder(f);
      setSubFolders(subs);
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
  const empty = subFolders.length === 0 && achievements.length === 0;

  return (
    <Screen refreshing={false} onRefresh={load}>
      <Header
        title={folder?.name ?? t('folderContents')}
        showBack
        rightIcon={isOwner ? 'add-circle' : undefined}
        onRightPress={isOwner ? () => setAddMenu(true) : undefined}
      />

      {/* Sub-folders */}
      {subFolders.length > 0 ? (
        <>
          <SectionTitle title={t('subFolders')} />
          <View style={styles.folderGrid}>
            {subFolders.map((f) => (
              <Pressable
                key={f.id}
                style={styles.folderCard}
                onPress={() => router.push(`/folder/${f.id}`)}
              >
                <Ionicons name="folder" size={26} color={colors.primary} />
                <Text style={styles.folderName} numberOfLines={1}>
                  {f.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {/* Achievements */}
      {achievements.length > 0 ? <SectionTitle title={t('myAchievements')} /> : null}
      {achievements.map((item) => (
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
      ))}

      {empty ? (
        <EmptyState
          icon="folder-open-outline"
          message={t('emptyFolder')}
          hint={isOwner ? t('addToFolder') : undefined}
        />
      ) : null}

      {/* Add menu (owner only): achievement or sub-folder */}
      <Modal visible={addMenu} transparent animationType="fade" onRequestClose={() => setAddMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddMenu(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('addItem')}</Text>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setAddMenu(false);
                router.push(`/achievement/new?folder=${id}`);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="trophy-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('addAchievementType')}</Text>
            </Pressable>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setAddMenu(false);
                router.push(`/folder/new?parent=${id}`);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="folder-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('addSubFolder')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  folderCard: {
    width: '47%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadow,
  },
  folderName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textDark },
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  menuRow: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 16, fontWeight: '600', color: colors.textDark },
});
