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
  AchievementRow,
  Avatar,
  Button,
  Card,
  EmptyState,
  Header,
  Input,
  Loading,
  Screen,
  SectionTitle,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  addSupervision,
  deleteFolder,
  getFolder,
  getProfileByCode,
  listAchievementsByFolder,
  listChildFolders,
  listFolders,
  listSupervisionsByFolder,
  updateFolderName,
  updateFolderParent,
} from '@/lib/api';
import type { Achievement, Folder, Supervision, UserProfile } from '@/types/database';
import { colors, radius, shadow, spacing } from '@/theme/colors';

/**
 * Ids of `rootId` and all folders nested under it. A folder may not be moved
 * into itself or any of these — that would orphan the subtree into a cycle.
 */
function subtreeIds(rootId: string, all: Folder[]): Set<string> {
  const ids = new Set<string>([rootId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const f of all) {
      if (f.parent_id && ids.has(f.parent_id) && !ids.has(f.id)) {
        ids.add(f.id);
        grew = true;
      }
    }
  }
  return ids;
}

export default function FolderContentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [folder, setFolder] = useState<Folder | null>(null);
  const [subFolders, setSubFolders] = useState<Folder[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [folderEmployees, setFolderEmployees] = useState<
    (Supervision & { subordinate: UserProfile })[]
  >([]);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMenu, setAddMenu] = useState(false);
  // Sub-folder long-press editing.
  const [subMenu, setSubMenu] = useState<Folder | null>(null);
  const [subMoveMenu, setSubMoveMenu] = useState<Folder | null>(null);
  const [subRename, setSubRename] = useState<Folder | null>(null);
  const [subRenameText, setSubRenameText] = useState('');

  // Add-employee-to-this-folder modal state.
  const [empModal, setEmpModal] = useState(false);
  const [empCode, setEmpCode] = useState('');
  const [empFound, setEmpFound] = useState<UserProfile | null>(null);
  const [empBusy, setEmpBusy] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

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
      // Owner-only extras: employees classified here + folders for moving.
      if (f && f.owner_id === profile?.id) {
        const [emps, all] = await Promise.all([
          listSupervisionsByFolder(profile.id, id),
          listFolders(profile.id),
        ]);
        setFolderEmployees(emps);
        setAllFolders(all);
      }
    } finally {
      setLoading(false);
    }
  }, [id, profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDeleteSub = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
      await load();
    } catch {
      // ignore
    }
  };

  const onMoveSub = async (folderId: string, parentId: string | null) => {
    try {
      await updateFolderParent(folderId, parentId);
      await load();
    } catch {
      // ignore
    }
  };

  const onRenameSub = async () => {
    if (!subRename || !subRenameText.trim()) return;
    try {
      await updateFolderName(subRename.id, subRenameText.trim());
      setSubRename(null);
      await load();
    } catch {
      // ignore
    }
  };

  const onLookupEmp = async () => {
    setEmpError(null);
    setEmpFound(null);
    if (!empCode.trim()) return;
    const user = await getProfileByCode(empCode);
    if (!user) {
      setEmpError(t('userNotFound'));
      return;
    }
    if (user.id === profile?.id) {
      setEmpError(t('cannotEvaluateOwn'));
      return;
    }
    setEmpFound(user);
  };

  const onConfirmEmp = async () => {
    if (!profile || !empFound || !id) return;
    setEmpBusy(true);
    try {
      // Classify the employee directly into THIS folder.
      await addSupervision({
        supervisor_id: profile.id,
        subordinate_id: empFound.id,
        placement: 'folder',
        folder_id: id,
      });
      setEmpModal(false);
      setEmpCode('');
      setEmpFound(null);
      await load();
    } catch (e: any) {
      setEmpError(e?.message ?? t('error'));
    } finally {
      setEmpBusy(false);
    }
  };

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
                onLongPress={isOwner ? () => setSubMenu(f) : undefined}
                delayLongPress={350}
              >
                <Ionicons name="folder" size={26} color={colors.primary} />
                <Text style={styles.folderName} numberOfLines={1}>
                  {f.name}
                </Text>
              </Pressable>
            ))}
          </View>
          {isOwner ? <Text style={styles.hint}>{t('longPressHint')}</Text> : null}
        </>
      ) : null}

      {/* Employees classified into this folder */}
      {folderEmployees.length > 0 ? (
        <>
          <SectionTitle title={t('folderEmployees')} />
          {folderEmployees.map((it) => (
            <Card
              key={it.id}
              style={styles.card}
              onPress={() => router.push(`/employees/${it.subordinate.id}`)}
            >
              <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Avatar name={it.subordinate.full_name} uri={it.subordinate.avatar_url} size={40} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.title} numberOfLines={1}>
                    {it.subordinate.full_name}
                  </Text>
                  <Text style={styles.date}>{it.subordinate.user_code}</Text>
                </View>
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={18}
                  color={colors.mutedText}
                />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {/* Achievements */}
      {achievements.length > 0 ? <SectionTitle title={t('myAchievements')} /> : null}
      {achievements.map((item) => (
        <AchievementRow
          key={item.id}
          achievement={item}
          editable={isOwner}
          onChanged={load}
          onPress={() =>
            router.push(isOwner ? `/achievement/${item.id}` : `/evaluate/${item.id}`)
          }
        />
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
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setAddMenu(false);
                setEmpModal(true);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="person-add-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('addEmployee')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add employee directly into this folder */}
      <Modal visible={empModal} transparent animationType="fade" onRequestClose={() => setEmpModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setEmpModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('addByUserId')}
            </Text>
            <View style={[styles.lookupRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Input
                  value={empCode}
                  onChangeText={setEmpCode}
                  placeholder={t('enterUserId')}
                  autoCapitalize="characters"
                  style={{ marginBottom: 0 }}
                />
              </View>
              <Pressable style={styles.lookupBtn} onPress={onLookupEmp}>
                <Ionicons name="search" size={20} color={colors.onPrimary} />
              </Pressable>
            </View>

            {empFound ? (
              <>
                <Card style={{ marginBottom: spacing.lg }}>
                  <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Avatar name={empFound.full_name} uri={empFound.avatar_url} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>{empFound.full_name}</Text>
                      <Text style={styles.date}>{empFound.user_code}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  </View>
                </Card>
                <Button
                  title={empBusy ? t('saving') : t('add')}
                  onPress={onConfirmEmp}
                  loading={empBusy}
                  icon="checkmark"
                />
              </>
            ) : null}

            {empError ? <Text style={styles.error}>{empError}</Text> : null}

            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setEmpModal(false)}
              style={{ marginTop: spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sub-folder long-press: move / delete */}
      <Modal visible={!!subMenu} transparent animationType="fade" onRequestClose={() => setSubMenu(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSubMenu(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{subMenu?.name}</Text>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                const f = subMenu;
                setSubMenu(null);
                if (f) {
                  setSubRenameText(f.name);
                  setSubRename(f);
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
                const f = subMenu;
                setSubMenu(null);
                setSubMoveMenu(f);
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
                const f = subMenu;
                setSubMenu(null);
                if (f) onDeleteSub(f.id);
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

      {/* Move sub-folder: workspace root, this folder's parent area, or another folder */}
      <Modal visible={!!subMoveMenu} transparent animationType="fade" onRequestClose={() => setSubMoveMenu(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSubMoveMenu(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('moveTo')}</Text>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                const f = subMoveMenu;
                setSubMoveMenu(null);
                if (f) onMoveSub(f.id, null);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="home-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('placeInWorkspace')}</Text>
            </Pressable>
            {(() => {
              const blocked = subMoveMenu
                ? subtreeIds(subMoveMenu.id, allFolders)
                : new Set<string>();
              return allFolders.filter((f) => !blocked.has(f.id));
            })().map((f) => (
                <Pressable
                  key={f.id}
                  style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => {
                    const src = subMoveMenu;
                    setSubMoveMenu(null);
                    if (src) onMoveSub(src.id, f.id);
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

      {/* Rename sub-folder */}
      <Modal visible={!!subRename} transparent animationType="fade" onRequestClose={() => setSubRename(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSubRename(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('rename')}
            </Text>
            <Input label={t('newName')} value={subRenameText} onChangeText={setSubRenameText} />
            <Button title={t('save')} icon="checkmark" onPress={onRenameSub} />
            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setSubRename(null)}
              style={{ marginTop: spacing.sm }}
            />
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
  hint: { fontSize: 11, color: colors.mutedText, marginTop: spacing.xs, textAlign: 'center' },
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
  lookupRow: { alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.lg },
  lookupBtn: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.sm },
});
