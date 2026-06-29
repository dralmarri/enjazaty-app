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
  Avatar,
  Badge,
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
  getFolder,
  getProfileByCode,
  listAchievementsByFolder,
  listChildFolders,
} from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, Folder, UserProfile } from '@/types/database';
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
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

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
