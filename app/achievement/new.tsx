/**
 * Screen 6 — Add an achievement.
 *
 * Collects the title/description/folder, lets the user attach images, files,
 * and links (uploaded to Supabase Storage), then saves the achievement +
 * its attachments and notifies the user's manager.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import {
  Button,
  Card,
  Header,
  Input,
  Screen,
  SectionTitle,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  createAchievement,
  createAttachment,
  createNotification,
  listFolders,
  listMembers,
} from '@/lib/api';
import { uploadFile } from '@/lib/storage';
import type { AttachmentType, Folder } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

interface PendingAttachment {
  type: AttachmentType;
  url: string; // local URI or remote link
  name: string;
  mimeType?: string;
  isRemote?: boolean; // links are already remote, no upload needed
}

export default function NewAchievementScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [linkModal, setLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    if (!profile) return;
    try {
      setFolders(await listFolders(profile.id));
    } catch {
      // ignore
    }
  }, [profile]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  /* -------------------------- Attachment pickers ------------------------- */

  const pickImage = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      quality: 0.8,
    });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          type: asset.type === 'video' ? 'video' : 'image',
          url: asset.uri,
          name: asset.fileName ?? `media-${prev.length + 1}`,
          mimeType: asset.mimeType,
        },
      ]);
    }
  };

  // Capture a photo directly from the camera.
  const pickCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          type: 'image',
          url: asset.uri,
          name: asset.fileName ?? `photo-${prev.length + 1}.jpg`,
          mimeType: asset.mimeType,
        },
      ]);
    }
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (!res.canceled && res.assets[0]) {
      const asset = res.assets[0];
      setAttachments((prev) => [
        ...prev,
        {
          type: 'file',
          url: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
        },
      ]);
    }
  };

  // Route params: ?source opens a picker (library/camera/files),
  // ?folder pre-selects a folder.
  const { source, folder: folderParam } = useLocalSearchParams<{
    source?: string;
    folder?: string;
  }>();
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current) return;
    autoOpened.current = true;
    if (folderParam) setFolderId(folderParam);
    if (source === 'camera') pickCamera();
    else if (source === 'files') pickFile();
    else if (source === 'library') pickImage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, folderParam]);

  const addLink = () => {
    if (!linkUrl.trim()) return;
    setAttachments((prev) => [
      ...prev,
      { type: 'link', url: linkUrl.trim(), name: linkUrl.trim(), isRemote: true },
    ]);
    setLinkUrl('');
    setLinkModal(false);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  /* -------------------------------- Save --------------------------------- */

  const onSave = async () => {
    setError(null);
    if (!profile || !title.trim()) {
      setError(t('required'));
      return;
    }
    setSaving(true);
    try {
      // 1) Create the achievement.
      const achievement = await createAchievement({
        title: title.trim(),
        description: description.trim() || null,
        owner_id: profile.id,
        folder_id: folderId,
        department_id: profile.department_id,
        date: new Date().toISOString(),
        status: 'submitted',
      });

      // 2) Upload + persist each attachment.
      for (const att of attachments) {
        let finalUrl = att.url;
        if (!att.isRemote) {
          const uploaded = await uploadFile({
            uri: att.url,
            userId: profile.id,
            fileName: att.name,
            contentType: att.mimeType,
          });
          finalUrl = uploaded.url;
        }
        await createAttachment({
          achievement_id: achievement.id,
          type: att.type,
          url: finalUrl,
          name: att.name,
          mime_type: att.mimeType ?? null,
          owner_id: profile.id,
        });
      }

      // 3) Notify every supervisor (member) about the new submission.
      const members = await listMembers(profile.id);
      await Promise.all(
        members.map((m) =>
          createNotification({
            user_id: m.id,
            title: t('addAchievement'),
            body: `${profile.full_name}: ${title.trim()}`,
            type: 'achievement',
            related_id: achievement.id,
          })
        )
      );

      router.replace(`/achievement/${achievement.id}`);
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setSaving(false);
    }
  };

  // The main file is chosen via the home "Add → File" flow, so here we only
  // offer adding an extra link as an attachment.
  const attachActions: {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    { label: t('addLink'), icon: 'link-outline', onPress: () => setLinkModal(true) },
  ];

  return (
    <Screen>
      <Header title={t('addAchievement')} showBack />

      <Input label={t('achievementTitle')} value={title} onChangeText={setTitle} />
      <Input
        label={t('achievementDescription')}
        value={description}
        onChangeText={setDescription}
        multiline
        numberOfLines={4}
        style={styles.textArea}
      />

      {/* Folder picker */}
      {folders.length > 0 ? (
        <>
          <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>
            {t('selectFolder')}
          </Text>
          <View style={styles.folderRow}>
            {folders.map((f) => {
              const active = folderId === f.id;
              return (
                <Pressable
                  key={f.id}
                  onPress={() => setFolderId(active ? null : f.id)}
                  style={[styles.folderChip, active && styles.folderChipActive]}
                >
                  <Ionicons
                    name="folder-outline"
                    size={16}
                    color={active ? colors.primaryDark : colors.mutedText}
                  />
                  <Text style={[styles.folderChipText, active && styles.folderChipTextActive]}>
                    {f.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}

      {/* Attachment buttons */}
      <SectionTitle title={t('attachments')} />
      <View style={styles.attachRow}>
        {attachActions.map((a) => (
          <Pressable key={a.label} style={styles.attachBtn} onPress={a.onPress}>
            <Ionicons name={a.icon} size={22} color={colors.primaryDark} />
            <Text style={styles.attachLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Pending attachments list */}
      {attachments.map((att, index) => (
        <Card key={`${att.url}-${index}`} style={styles.attachItem}>
          <View style={[styles.attachItemRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons
              name={
                att.type === 'image'
                  ? 'image'
                  : att.type === 'video'
                  ? 'videocam'
                  : att.type === 'link'
                  ? 'link'
                  : 'document'
              }
              size={20}
              color={colors.primaryDark}
            />
            <Text style={styles.attachName} numberOfLines={1}>
              {att.name}
            </Text>
            <Pressable onPress={() => removeAttachment(index)} hitSlop={8}>
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            </Pressable>
          </View>
        </Card>
      ))}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={saving ? t('saving') : t('save')}
        onPress={onSave}
        loading={saving}
        icon="checkmark-circle-outline"
        style={{ marginTop: spacing.lg }}
      />

      {saving ? (
        <View style={styles.savingHint}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.savingText}>{t('saving')}</Text>
        </View>
      ) : null}

      {/* Link modal */}
      <Modal visible={linkModal} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setLinkModal(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('addLink')}
            </Text>
            <Input
              label={t('linkUrl')}
              value={linkUrl}
              onChangeText={setLinkUrl}
              placeholder="https://..."
              autoCapitalize="none"
              keyboardType="url"
            />
            <Button title={t('add')} onPress={addLink} icon="checkmark" />
            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setLinkModal(false)}
              style={{ marginTop: spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  label: { fontSize: 14, fontWeight: '600', color: colors.textDark, marginBottom: spacing.sm },
  folderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  folderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  folderChipActive: { borderColor: colors.primary, backgroundColor: colors.softBackground },
  folderChipText: { fontSize: 13, fontWeight: '600', color: colors.mutedText },
  folderChipTextActive: { color: colors.primaryDark },
  attachRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  attachBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  attachLabel: { fontSize: 12, fontWeight: '700', color: colors.textDark },
  attachItem: { marginBottom: spacing.sm, paddingVertical: spacing.md },
  attachItemRow: { alignItems: 'center', gap: spacing.md },
  attachName: { flex: 1, fontSize: 13, color: colors.textDark },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.md },
  savingHint: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  savingText: { color: colors.mutedText },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark, marginBottom: spacing.lg },
});
