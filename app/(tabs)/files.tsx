/**
 * Screen 5 — Files & folders.
 * Lists the user's folders, lets them create new ones (with an inline modal),
 * and open a folder. Folders organize achievements/attachments.
 */
import React, { useCallback, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  Button,
  Card,
  EmptyState,
  Header,
  Input,
  Screen,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { createFolder, deleteFolder, listFolders } from '@/lib/api';
import type { Folder } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function FilesScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      setFolders(await listFolders(profile.id));
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

  const onCreate = async () => {
    if (!profile || !name.trim()) return;
    setSaving(true);
    try {
      await createFolder({
        name: name.trim(),
        description: description.trim() || null,
        owner_id: profile.id,
      });
      setName('');
      setDescription('');
      setModalOpen(false);
      await load();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteFolder(id);
      await load();
    } catch {
      // ignore
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={t('foldersAndFiles')}
        rightIcon="add-circle"
        onRightPress={() => setModalOpen(true)}
      />

      {folders.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          message={t('emptyFolders')}
          hint={t('newFolder')}
        />
      ) : (
        <View style={styles.grid}>
          {folders.map((folder) => (
            <Card key={folder.id} style={styles.folderCard}>
              <View style={styles.folderTop}>
                <View style={styles.folderIcon}>
                  <Ionicons name="folder" size={26} color={colors.primary} />
                </View>
                <Pressable onPress={() => onDelete(folder.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.mutedText} />
                </Pressable>
              </View>
              <Text style={styles.folderName} numberOfLines={1}>
                {folder.name}
              </Text>
              {folder.description ? (
                <Text style={styles.folderDesc} numberOfLines={2}>
                  {folder.description}
                </Text>
              ) : null}
            </Card>
          ))}
        </View>
      )}

      {/* Create folder modal */}
      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setModalOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('newFolder')}
            </Text>
            <Input label={t('folderName')} value={name} onChangeText={setName} />
            <Input
              label={t('folderDescription')}
              value={description}
              onChangeText={setDescription}
              multiline
            />
            <Button
              title={saving ? t('saving') : t('add')}
              onPress={onCreate}
              loading={saving}
              icon="checkmark"
            />
            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setModalOpen(false)}
              style={{ marginTop: spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  folderCard: { width: '47%', flexGrow: 1, gap: spacing.sm },
  folderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  folderIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderName: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  folderDesc: { fontSize: 12, color: colors.mutedText },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.lg,
  },
});
