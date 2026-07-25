/**
 * My achievements tab — the home of the user's own content: the achievement
 * folders and the achievement files themselves, with status filtering and
 * incremental loading so a long history never floods the page.
 *
 * Employee folders (where an admin places supervised employees) live in the
 * workspace tab instead — folders are separated by `kind` (migration_v20.sql).
 */
import React, { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  AchievementRow,
  Button,
  EmptyState,
  Header,
  Input,
  Screen,
  SectionTitle,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  deleteFolder,
  listAchievements,
  listRootFolders,
  updateFolderKind,
  updateFolderName,
  updateFolderParent,
} from '@/lib/api';
import type { Achievement, Folder } from '@/types/database';
import { colors, radius, shadow, spacing } from '@/theme/colors';

type Filter = 'all' | 'approved' | 'pending';

/** How many achievement files are shown before "load more". */
const PAGE = 15;

export default function MyAchievementsScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [limit, setLimit] = useState(PAGE);

  // Add menus (folder / file source).
  const [addMenu, setAddMenu] = useState(false);
  const [fileMenu, setFileMenu] = useState(false);

  // Long-press folder editing.
  const [folderMenu, setFolderMenu] = useState<Folder | null>(null);
  const [moveMenu, setMoveMenu] = useState<Folder | null>(null);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [renameText, setRenameText] = useState('');

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      const [achs, fdrs] = await Promise.all([
        listAchievements(profile.id),
        listRootFolders(profile.id, 'achievements'),
      ]);
      setAchievements(achs);
      setFolders(fdrs);
    } catch {
      // keep previous data on error
    } finally {
      setRefreshing(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const visible = useMemo(() => {
    if (filter === 'approved') return achievements.filter((a) => a.status === 'approved');
    if (filter === 'pending') return achievements.filter((a) => a.status !== 'approved');
    return achievements;
  }, [achievements, filter]);

  const displayed = visible.slice(0, limit);

  const onFilterChange = (key: Filter) => {
    setFilter(key);
    setLimit(PAGE);
  };

  const onRenameFolder = async () => {
    if (!renameFolder || !renameText.trim()) return;
    try {
      await updateFolderName(renameFolder.id, renameText.trim());
      setRenameFolder(null);
      await load();
    } catch {
      // ignore
    }
  };

  const onDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
      await load();
    } catch {
      // ignore
    }
  };

  /** Reclassify an achievement folder as an employee folder (workspace tab). */
  const onMoveToTeam = async (folderId: string) => {
    if (!profile) return;
    try {
      await updateFolderKind(folderId, profile.id, 'employees');
      await load();
    } catch {
      // ignore
    }
  };

  const onMoveFolder = async (folderId: string, parentId: string | null) => {
    try {
      await updateFolderParent(folderId, parentId);
      await load();
    } catch {
      // ignore
    }
  };

  // First level of the add menu: folder or file.
  const addOptions: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      key: 'folder',
      label: t('typeFolder'),
      icon: 'folder-outline',
      onPress: () => router.push('/folder/new?kind=achievements'),
    },
    {
      key: 'file',
      label: t('typeFile'),
      icon: 'document-outline',
      onPress: () => setFileMenu(true),
    },
  ];

  // Second level (when "File" is chosen): where the file comes from.
  const fileOptions: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      key: 'library',
      label: t('fromLibrary'),
      icon: 'images-outline',
      onPress: () => router.push('/achievement/new?source=library'),
    },
    {
      key: 'camera',
      label: t('fromCamera'),
      icon: 'camera-outline',
      onPress: () => router.push('/achievement/new?source=camera'),
    },
    {
      key: 'files',
      label: t('fromFiles'),
      icon: 'document-outline',
      onPress: () => router.push('/achievement/new?source=files'),
    },
  ];

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: t('total') },
    { key: 'pending', label: t('pending') },
    { key: 'approved', label: t('approved') },
  ];

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={t('myAchievements')}
        rightIcon="add"
        onRightPress={() => setAddMenu(true)}
      />

      {/* Achievement folders */}
      {folders.length > 0 ? (
        <>
          <SectionTitle title={t('achievementFolders')} />
          <View style={styles.folderGrid}>
            {folders.map((f) => (
              <Pressable
                key={f.id}
                style={styles.folderCard}
                onPress={() => router.push(`/folder/${f.id}`)}
                onLongPress={() => setFolderMenu(f)}
                delayLongPress={350}
              >
                <Ionicons name="folder" size={28} color={colors.primary} />
                <Text style={styles.folderName} numberOfLines={1}>
                  {f.name}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>{t('longPressHint')}</Text>
        </>
      ) : null}

      {/* Achievement files */}
      <SectionTitle title={t('files')} />
      <View style={styles.filterRow}>
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => onFilterChange(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {visible.length === 0 ? (
        <EmptyState message={t('noAchievements')} hint={t('addAchievementType')} />
      ) : (
        <>
          {displayed.map((item) => (
            <AchievementRow
              key={item.id}
              achievement={item}
              editable
              onChanged={load}
              onPress={() => router.push(`/achievement/${item.id}`)}
            />
          ))}
          {visible.length > displayed.length ? (
            <Button
              title={t('loadMore')}
              variant="outline"
              icon="chevron-down"
              onPress={() => setLimit((n) => n + PAGE)}
            />
          ) : null}
          <Text style={styles.hint}>{t('longPressHint')}</Text>
        </>
      )}

      {/* Add: folder or file */}
      <Modal visible={addMenu} transparent animationType="fade" onRequestClose={() => setAddMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddMenu(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('addAchievementType')}</Text>
            {addOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => {
                  setAddMenu(false);
                  opt.onPress();
                }}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={opt.icon} size={22} color={colors.primaryDark} />
                </View>
                <Text style={styles.menuLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* File source submenu (library / camera / files) */}
      <Modal visible={fileMenu} transparent animationType="fade" onRequestClose={() => setFileMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFileMenu(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('typeFile')}</Text>
            {fileOptions.map((opt) => (
              <Pressable
                key={opt.key}
                style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                onPress={() => {
                  setFileMenu(false);
                  opt.onPress();
                }}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={opt.icon} size={22} color={colors.primaryDark} />
                </View>
                <Text style={styles.menuLabel}>{opt.label}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Folder long-press actions: rename / move / delete */}
      <Modal
        visible={!!folderMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setFolderMenu(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setFolderMenu(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{folderMenu?.name}</Text>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                const f = folderMenu;
                setFolderMenu(null);
                if (f) {
                  setRenameText(f.name);
                  setRenameFolder(f);
                }
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="create-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('rename')}</Text>
            </Pressable>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                const f = folderMenu;
                setFolderMenu(null);
                setMoveMenu(f);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="swap-horizontal-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('moveTo')}</Text>
            </Pressable>
            {/* Send the folder over to the team side of the app. */}
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                const f = folderMenu;
                setFolderMenu(null);
                if (f) onMoveToTeam(f.id);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="people-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('moveToTeam')}</Text>
            </Pressable>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                const f = folderMenu;
                setFolderMenu(null);
                if (f) onDeleteFolder(f.id);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="trash-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('delete')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Move folder: to the root or inside another achievement folder */}
      <Modal
        visible={!!moveMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveMenu(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMoveMenu(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('moveTo')}</Text>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                const f = moveMenu;
                setMoveMenu(null);
                if (f) onMoveFolder(f.id, null);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="home-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('myAchievements')}</Text>
            </Pressable>
            {folders
              .filter((f) => f.id !== moveMenu?.id)
              .map((f) => (
                <Pressable
                  key={f.id}
                  style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => {
                    const src = moveMenu;
                    setMoveMenu(null);
                    if (src) onMoveFolder(src.id, f.id);
                  }}
                >
                  <View style={styles.menuIcon}>
                    <Ionicons name="folder-outline" size={22} color={colors.primaryDark} />
                  </View>
                  <Text style={styles.menuLabel}>{f.name}</Text>
                </Pressable>
              ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Rename folder */}
      <Modal
        visible={!!renameFolder}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameFolder(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setRenameFolder(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('rename')}
            </Text>
            <Input label={t('newName')} value={renameText} onChangeText={setRenameText} />
            <Button title={t('save')} icon="checkmark" onPress={onRenameFolder} />
            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setRenameFolder(null)}
              style={{ marginTop: spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
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
  folderName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textDark },
  hint: { fontSize: 11, color: colors.mutedText, marginTop: spacing.xs, textAlign: 'center' },
  filterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.mutedText },
  chipTextActive: { color: colors.onPrimary },
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
