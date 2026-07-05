/**
 * AchievementRow — a tappable achievement card with a long-press action menu.
 * Every user gets print / share / save-to-device; the owner additionally gets
 * rename / move to folder / delete (with confirmation). Reused across the
 * activity feed, workspace, folders and search so behaviour is identical
 * everywhere.
 */
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  deleteAchievement,
  listFolders,
  updateAchievementFolder,
  updateAchievementTitle,
} from '@/lib/api';
import { printAchievement, saveAchievement, shareAchievement } from '@/lib/achievementDoc';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, Folder } from '@/types/database';
import { Badge } from './Badge';
import { Button } from './Button';
import { Card } from './Card';
import { Input } from './Input';
import { colors, radius, spacing } from '@/theme/colors';

interface AchievementRowProps {
  achievement: Achievement;
  onPress?: () => void;
  /** Enable the long-press edit menu (owner only). */
  editable?: boolean;
  /** Called after a rename/move/delete so the parent can refresh. */
  onChanged?: () => void;
}

export function AchievementRow({
  achievement,
  onPress,
  editable = false,
  onChanged,
}: AchievementRowProps) {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [menu, setMenu] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [name, setName] = useState(achievement.title);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [busy, setBusy] = useState(false);
  // Building the printable/PDF sheet takes a moment — show an overlay.
  const [docBusy, setDocBusy] = useState(false);

  const openMove = async () => {
    setMenu(false);
    if (profile) setFolders(await listFolders(profile.id));
    setMoveOpen(true);
  };

  const docOptions = () => ({ achievement, t, language, isRTL });

  const runDocAction = async (action: 'print' | 'share' | 'save') => {
    setMenu(false);
    setDocBusy(true);
    try {
      if (action === 'print') await printAchievement(docOptions());
      else if (action === 'share') await shareAchievement(docOptions());
      else await saveAchievement(docOptions());
    } catch {
      // user cancelled or unsupported
    } finally {
      setDocBusy(false);
    }
  };

  const doRename = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await updateAchievementTitle(achievement.id, name.trim());
      setRenameOpen(false);
      onChanged?.();
    } finally {
      setBusy(false);
    }
  };

  const doMove = async (folderId: string | null) => {
    setMoveOpen(false);
    try {
      await updateAchievementFolder(achievement.id, folderId);
      onChanged?.();
    } catch {
      // ignore
    }
  };

  const doDelete = async () => {
    setConfirmOpen(false);
    try {
      await deleteAchievement(achievement.id);
      onChanged?.();
    } catch {
      // ignore
    }
  };

  return (
    <>
      <Card style={styles.card} onPress={onPress} onLongPress={() => setMenu(true)}>
        <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.iconBox}>
            <Ionicons name="trophy-outline" size={20} color={colors.primaryDark} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title} numberOfLines={1}>
              {achievement.title}
            </Text>
            <Text style={styles.date}>{formatDate(achievement.created_at, language)}</Text>
          </View>
          <Badge label={t(achievement.status)} tone={statusTone(achievement.status)} />
        </View>
      </Card>

      {/* Action menu */}
      <Modal visible={menu} transparent animationType="fade" onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {achievement.title}
            </Text>
            {editable ? (
              <>
                <MenuItem
                  icon="create-outline"
                  label={t('rename')}
                  isRTL={isRTL}
                  onPress={() => {
                    setMenu(false);
                    setName(achievement.title);
                    setRenameOpen(true);
                  }}
                />
                <MenuItem
                  icon="swap-horizontal-outline"
                  label={t('moveTo')}
                  isRTL={isRTL}
                  onPress={openMove}
                />
              </>
            ) : null}
            <MenuItem
              icon="print-outline"
              label={t('print')}
              isRTL={isRTL}
              onPress={() => runDocAction('print')}
            />
            <MenuItem
              icon="share-social-outline"
              label={t('share')}
              isRTL={isRTL}
              onPress={() => runDocAction('share')}
            />
            <MenuItem
              icon="download-outline"
              label={t('saveToDevice')}
              isRTL={isRTL}
              onPress={() => runDocAction('save')}
            />
            {editable ? (
              <MenuItem
                icon="trash-outline"
                label={t('delete')}
                isRTL={isRTL}
                onPress={() => {
                  setMenu(false);
                  setConfirmOpen(true);
                }}
              />
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        visible={confirmOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setConfirmOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('confirmDeleteTitle')}</Text>
            <Text style={styles.confirmMsg}>{t('confirmDeleteMsg')}</Text>
            <Button title={t('delete')} icon="trash-outline" onPress={doDelete} />
            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setConfirmOpen(false)}
              style={{ marginTop: spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Building the printable sheet / PDF */}
      <Modal visible={docBusy} transparent animationType="fade">
        <View style={styles.busyBackdrop}>
          <View style={styles.busyBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.busyText}>{t('loading')}</Text>
          </View>
        </View>
      </Modal>

      {/* Rename */}
      <Modal visible={renameOpen} transparent animationType="fade" onRequestClose={() => setRenameOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setRenameOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('rename')}
            </Text>
            <Input label={t('newName')} value={name} onChangeText={setName} />
            <Button title={busy ? t('saving') : t('save')} onPress={doRename} loading={busy} icon="checkmark" />
            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setRenameOpen(false)}
              style={{ marginTop: spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Move to folder */}
      <Modal visible={moveOpen} transparent animationType="fade" onRequestClose={() => setMoveOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMoveOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{t('moveTo')}</Text>
            <MenuItem icon="albums-outline" label={t('noFolder')} isRTL={isRTL} onPress={() => doMove(null)} />
            {folders.map((f) => (
              <MenuItem
                key={f.id}
                icon="folder-outline"
                label={f.name}
                isRTL={isRTL}
                onPress={() => doMove(f.id)}
              />
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function MenuItem({
  icon,
  label,
  isRTL,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isRTL: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
      onPress={onPress}
    >
      <View style={styles.menuIcon}>
        <Ionicons name={icon} size={22} color={colors.primaryDark} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
    </Pressable>
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
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    fontSize: 17,
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
  confirmMsg: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  busyBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyBox: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
    minWidth: 140,
  },
  busyText: { fontSize: 13, color: colors.mutedText },
});
