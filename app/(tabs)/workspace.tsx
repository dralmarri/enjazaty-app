/**
 * Workspace home. What it shows depends on the role:
 *  - admin: the TEAM side — manage/view employees, attendance, employee folders
 *  - employee: what needs their attention — achievements sent back for revision
 *    and the newest evaluation received (attendance is an admin job)
 *
 * The user's own achievement files and folders live in the "My achievements"
 * tab; the two sides are kept apart by `folders.kind` (migration_v20.sql).
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
  Input,
  Screen,
  SectionTitle,
  SignatureView,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  countUnreadCirculars,
  deleteFolder,
  listAchievements,
  listEvaluations,
  listNotifications,
  listRootFolders,
  updateFolderKind,
  updateFolderName,
  updateFolderParent,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Achievement, Evaluation, Folder } from '@/types/database';
import { colors, radius, shadow, spacing } from '@/theme/colors';

export default function WorkspaceScreen() {
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [folders, setFolders] = useState<Folder[]>([]);
  // Employee-side home extras: the newest evaluation received and the
  // achievements a supervisor asked to fix.
  const [latestEval, setLatestEval] = useState<Evaluation | null>(null);
  const [needsFix, setNeedsFix] = useState<Achievement[]>([]);
  const [unread, setUnread] = useState(0);
  const [unreadCirculars, setUnreadCirculars] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
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

  /** Reclassify an employee folder as an achievement folder (its own tab). */
  const onMoveToAchievements = useCallback(
    async (folderId: string) => {
      if (!profile) return;
      try {
        await updateFolderKind(folderId, profile.id, 'achievements');
        await load();
      } catch {
        // ignore
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [profile]
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
      const [fdrs, notifs, evals, achs, circulars] = await Promise.all([
        listRootFolders(profile.id, 'employees'),
        listNotifications(profile.id),
        listEvaluations(profile.id), // evaluations about me, newest first
        listAchievements(profile.id),
        countUnreadCirculars(profile.id),
      ]);
      setUnreadCirculars(circulars);
      setFolders(fdrs);
      setUnread(notifs.filter((n) => !n.read).length);
      setLatestEval(evals[0] ?? null);
      setNeedsFix(
        achs.filter((a) => a.status === 'needs_revision' || a.status === 'rejected')
      );
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

      {/* Quick actions — one compact icon grid instead of a mix of squares
          and wide rows, so the whole workspace home fits in far less space. */}
      <View style={styles.quickGrid}>
        {isAdmin ? (
          <>
            <Pressable
              style={styles.quickCard}
              onPress={() => router.push('/folder/new?kind=employees')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="folder-open-outline" size={24} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('newFolder')}
              </Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => router.push('/employees')}>
              <View style={styles.actionIcon}>
                <Ionicons name="people-outline" size={24} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('manageEmployees')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.quickCard}
              onPress={() => router.push('/my-achievements')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="documents-outline" size={24} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('myAchievements')}
              </Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => router.push('/circulars')}>
              <View style={styles.actionIcon}>
                <Ionicons name="megaphone-outline" size={24} color={colors.primaryDark} />
                {unreadCirculars > 0 ? (
                  <View style={styles.quickBadge}>
                    <Text style={styles.badgeText}>
                      {unreadCirculars > 9 ? '9+' : unreadCirculars}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('circulars')}
              </Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => router.push('/attendance')}>
              <View style={styles.actionIcon}>
                <Ionicons name="calendar-outline" size={24} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('attendance')}
              </Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => router.push('/members')}>
              <View style={styles.actionIcon}>
                <Ionicons name="eye-outline" size={24} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('viewMembers')}
              </Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => router.push('/maintenance')}>
              <View style={styles.actionIcon}>
                <Ionicons name="build-outline" size={24} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('maintenance')}
              </Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable style={styles.quickCard} onPress={() => router.push('/members')}>
              <View style={styles.actionIcon}>
                <Ionicons name="eye-outline" size={24} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('viewMembers')}
              </Text>
            </Pressable>
            <Pressable
              style={styles.quickCard}
              onPress={() => router.push('/my-achievements')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="documents-outline" size={24} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('myAchievements')}
              </Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => router.push('/circulars')}>
              <View style={styles.actionIcon}>
                <Ionicons name="megaphone-outline" size={24} color={colors.primaryDark} />
                {unreadCirculars > 0 ? (
                  <View style={styles.quickBadge}>
                    <Text style={styles.badgeText}>
                      {unreadCirculars > 9 ? '9+' : unreadCirculars}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('circulars')}
              </Text>
            </Pressable>
            <Pressable style={styles.quickCard} onPress={() => router.push('/maintenance')}>
              <View style={styles.actionIcon}>
                <Ionicons name="build-outline" size={24} color={colors.primaryDark} />
              </View>
              <Text style={styles.quickLabel} numberOfLines={2}>
                {t('maintenance')}
              </Text>
            </Pressable>
          </>
        )}
      </View>

      {/* What an employee needs to see first: the achievements a supervisor
          asked to fix, then the newest evaluation received. */}
      {!isAdmin && needsFix.length > 0 ? (
        <>
          <SectionTitle
            title={t('needsFixTitle')}
            actionLabel={needsFix.length > 3 ? t('viewAll') : undefined}
            onAction={() => router.push('/my-achievements')}
          />
          {needsFix.slice(0, 3).map((item) => (
            <AchievementRow
              key={item.id}
              achievement={item}
              editable
              onChanged={load}
              onPress={() => router.push(`/achievement/${item.id}`)}
            />
          ))}
        </>
      ) : null}

      {!isAdmin && latestEval ? (
        <>
          <SectionTitle
            title={t('latestEvaluation')}
            actionLabel={t('viewAll')}
            onAction={() => router.push('/activity')}
          />
          <Card style={styles.evalCard}>
            <View style={[styles.evalTop, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Ionicons
                    key={n}
                    name={n <= latestEval.rating ? 'star' : 'star-outline'}
                    size={16}
                    color={colors.primary}
                  />
                ))}
              </View>
              <Text style={styles.evalDate}>{formatDate(latestEval.created_at, language)}</Text>
            </View>
            {latestEval.comment ? (
              <Text style={styles.evalComment} numberOfLines={3}>
                {latestEval.comment}
              </Text>
            ) : null}
            {latestEval.signature ? (
              <View style={styles.signBox}>
                <Text style={styles.signLabel}>{t('eSignature')}</Text>
                <SignatureView value={latestEval.signature} height={70} />
              </View>
            ) : null}
          </Card>
        </>
      ) : null}

      {/* Employee folders (the team side of the workspace) */}
      {folders.length > 0 ? (
        <>
          <SectionTitle title={t('teamFolders')} />
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
            {/* Send the folder over to the achievements side of the app. */}
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                const f = folderMenu;
                setFolderMenu(null);
                if (f) onMoveToAchievements(f.id);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="documents-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('moveToMyAchievements')}</Text>
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
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  quickCard: {
    width: '30%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
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
  quickLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textDark,
    textAlign: 'center',
  },
  quickBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  evalCard: { marginBottom: spacing.md, gap: spacing.sm },
  evalTop: { alignItems: 'center', justifyContent: 'space-between' },
  starsRow: { flexDirection: 'row', gap: 2 },
  evalComment: { fontSize: 14, color: colors.textDark },
  evalDate: { fontSize: 11, color: colors.mutedText },
  signBox: {
    backgroundColor: colors.softBackground,
    borderRadius: radius.md,
    padding: spacing.sm,
    alignItems: 'center',
  },
  signLabel: { fontSize: 12, color: colors.mutedText, marginBottom: 2 },
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
