/**
 * Screen 4 — Smart home / workspace.
 * Greeting with name + job title + today's date, two primary actions
 * (Add achievement [dropdown], Manage employees) side by side, a View Members
 * entry, and the most recent achievements.
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  AchievementRow,
  Avatar,
  Button,
  Card,
  EmptyState,
  Input,
  Screen,
  SectionTitle,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  deleteFolder,
  listAchievements,
  listNotifications,
  listRootFolders,
  updateFolderName,
  updateFolderParent,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Achievement, Folder } from '@/types/database';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export default function WorkspaceScreen() {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [addMenu, setAddMenu] = useState(false);
  const [fileMenu, setFileMenu] = useState(false);
  // Long-press folder editing.
  const [folderMenu, setFolderMenu] = useState<Folder | null>(null);
  const [moveMenu, setMoveMenu] = useState<Folder | null>(null);
  const [renameFolder, setRenameFolder] = useState<Folder | null>(null);
  const [renameText, setRenameText] = useState('');

  const onRenameFolder = useCallback(async () => {
    if (!renameFolder || !renameText.trim()) return;
    try {
      await updateFolderName(renameFolder.id, renameText.trim());
      setRenameFolder(null);
      await load();
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renameFolder, renameText]);

  const onDeleteFolder = useCallback(
    async (folderId: string) => {
      try {
        await deleteFolder(folderId);
        await load();
      } catch {
        // ignore
      }
    },
    [] // load is stable enough; folders refresh via focus
  );

  const onMoveFolder = useCallback(async (folderId: string, parentId: string | null) => {
    try {
      await updateFolderParent(folderId, parentId);
    } catch {
      // ignore
    }
  }, []);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      const [achs, fdrs, notifs] = await Promise.all([
        listAchievements(profile.id),
        listRootFolders(profile.id),
        listNotifications(profile.id),
      ]);
      setAchievements(achs);
      setFolders(fdrs);
      setUnread(notifs.filter((n) => !n.read).length);
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

  // Today's Gregorian date, shown under the greeting.
  const today = formatDate(new Date().toISOString(), language);

  // First level: Folder or File.
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
      onPress: () => router.push('/folder/new'),
    },
    {
      key: 'file',
      label: t('typeFile'),
      icon: 'document-outline',
      onPress: () => {
        setAddMenu(false);
        setFileMenu(true);
      },
    },
  ];

  // Second level (when "File" is chosen): where to get the file from.
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

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      {/* Top bar with notification bell */}
      <View style={[styles.topBar, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Text style={styles.appName}>{t('appName')}</Text>
        <Pressable onPress={() => router.push('/notifications')} hitSlop={8} style={styles.bell}>
          <Ionicons name="notifications-outline" size={24} color={colors.textDark} />
          {unread > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Greeting */}
      <View style={[styles.greetRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetHi}>{t('welcome')} 👋</Text>
          <Text style={styles.greetName}>{profile?.full_name}</Text>
          {profile?.job_title ? (
            <Text style={styles.jobTitle}>{profile.job_title}</Text>
          ) : null}
          <Text style={styles.date}>{today}</Text>
          <View style={[styles.idChip, { alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
            <Ionicons name="id-card-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.idText}>
              {t('yourUserId')}: {profile?.user_code}
            </Text>
          </View>
        </View>
        <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={56} />
      </View>

      {/* Two primary actions side by side */}
      <View style={styles.actionsRow}>
        <Pressable style={styles.actionCard} onPress={() => setAddMenu(true)}>
          <View style={styles.actionIcon}>
            <Ionicons name="add-circle-outline" size={26} color={colors.primaryDark} />
          </View>
          <Text style={styles.actionLabel}>{t('addAchievementType')}</Text>
        </Pressable>

        <Pressable style={styles.actionCard} onPress={() => router.push('/employees')}>
          <View style={styles.actionIcon}>
            <Ionicons name="people-outline" size={26} color={colors.primaryDark} />
          </View>
          <Text style={styles.actionLabel}>{t('manageEmployees')}</Text>
        </Pressable>
      </View>

      {/* View members */}
      <Pressable style={styles.membersCard} onPress={() => router.push('/members')}>
        <View style={[styles.membersRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.actionIcon}>
            <Ionicons name="eye-outline" size={24} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.membersTitle}>{t('viewMembers')}</Text>
            <Text style={styles.membersHint}>{t('membersHint')}</Text>
          </View>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={20}
            color={colors.mutedText}
          />
        </View>
      </Pressable>

      {/* Folders (workspace) */}
      {folders.length > 0 ? (
        <>
          <SectionTitle title={t('folders')} />
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

      {/* Recent achievements */}
      <SectionTitle
        title={t('recentAchievements')}
        actionLabel={t('myAchievements')}
        onAction={() => router.push('/(tabs)/activity')}
      />
      {achievements.length === 0 ? (
        <EmptyState message={t('noAchievements')} hint={t('addAchievementType')} />
      ) : (
        achievements.slice(0, 5).map((item) => (
          <AchievementRow
            key={item.id}
            achievement={item}
            editable
            onChanged={load}
            onPress={() => router.push(`/achievement/${item.id}`)}
          />
        ))
      )}

      {/* Add-achievement dropdown */}
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

      {/* Folder long-press actions: move / delete */}
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

      {/* Move folder: pick a destination (workspace root or another folder) */}
      <Modal
        visible={!!moveMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setMoveMenu(null)}
      >
        <Pressable style={styles.backdrop} onPress={() => setMoveMenu(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('moveTo')}</Text>
            {/* Move to workspace root */}
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={async () => {
                const f = moveMenu;
                setMoveMenu(null);
                if (f) {
                  await onMoveFolder(f.id, null);
                  await load();
                }
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="home-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('placeInWorkspace')}</Text>
            </Pressable>
            {/* Move into another folder */}
            {folders
              .filter((f) => f.id !== moveMenu?.id)
              .map((f) => (
                <Pressable
                  key={f.id}
                  style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={async () => {
                    const src = moveMenu;
                    setMoveMenu(null);
                    if (src) {
                      await onMoveFolder(src.id, f.id);
                      await load();
                    }
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
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  appName: { fontSize: 18, fontWeight: '900', color: colors.primaryDark },
  bell: { padding: spacing.xs },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  greetRow: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.xl },
  greetHi: { fontSize: 14, color: colors.mutedText },
  greetName: { fontSize: 24, fontWeight: '900', color: colors.textDark, marginTop: 2 },
  jobTitle: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, marginTop: 2 },
  date: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
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
  actionsRow: { flexDirection: 'row', gap: spacing.md },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
  },
  membersCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginTop: spacing.md,
    ...shadow,
  },
  membersRow: { alignItems: 'center', gap: spacing.md },
  membersTitle: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  membersHint: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
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
  achievementCard: { marginBottom: spacing.md },
  achRow: { alignItems: 'center', gap: spacing.md },
  achTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  achDate: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
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
  menuRow: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
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
