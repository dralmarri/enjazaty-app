/**
 * Manage employees — add a subordinate ONLY by their User ID, then classify
 * where they appear in your space (workspace home or one of your folders).
 * Lists the subordinates you currently supervise.
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Header,
  Input,
  Screen,
  Select,
  type SelectOption,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  addSupervision,
  getProfileByCode,
  listFolders,
  listSupervisions,
  removeSupervision,
} from '@/lib/api';
import type { Folder, Supervision, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function EmployeesScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();

  const [items, setItems] = useState<(Supervision & { subordinate: UserProfile })[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Add flow state
  const [modalOpen, setModalOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [found, setFound] = useState<UserProfile | null>(null);
  const [placement, setPlacement] = useState<string>('workspace'); // 'workspace' | folderId
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      const [subs, fdrs] = await Promise.all([
        listSupervisions(profile.id),
        listFolders(profile.id),
      ]);
      setItems(subs);
      setFolders(fdrs);
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

  const placementOptions: SelectOption[] = [
    { label: t('placeInWorkspace'), value: 'workspace' },
    ...folders.map((f) => ({ label: f.name, value: f.id })),
  ];

  const onLookup = async () => {
    setError(null);
    setFound(null);
    if (!userId.trim()) return;
    const user = await getProfileByCode(userId);
    if (!user) {
      setError(t('userNotFound'));
      return;
    }
    if (user.id === profile?.id) {
      setError(t('cannotEvaluateOwn'));
      return;
    }
    setFound(user);
  };

  const onConfirmAdd = async () => {
    if (!profile || !found) return;
    setBusy(true);
    try {
      await addSupervision({
        supervisor_id: profile.id,
        subordinate_id: found.id,
        placement: placement === 'workspace' ? 'workspace' : 'folder',
        folder_id: placement === 'workspace' ? null : placement,
      });
      setModalOpen(false);
      setUserId('');
      setFound(null);
      setPlacement('workspace');
      await load();
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setBusy(false);
    }
  };

  const onRemove = async (id: string) => {
    try {
      await removeSupervision(id);
      await load();
    } catch {
      // ignore
    }
  };

  const folderName = (id: string | null) =>
    folders.find((f) => f.id === id)?.name ?? t('placeInWorkspace');

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={t('employees')}
        showBack
        rightIcon="person-add"
        onRightPress={() => setModalOpen(true)}
      />

      {items.length === 0 ? (
        <EmptyState icon="people-outline" message={t('noEmployees')} hint={t('addByUserId')} />
      ) : (
        items.map((item) => (
          <Card
            key={item.id}
            style={styles.card}
            onPress={() => router.push(`/employees/${item.subordinate.id}`)}
          >
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Avatar name={item.subordinate.full_name} uri={item.subordinate.avatar_url} size={48} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.subordinate.full_name}</Text>
                <Text style={styles.sub}>{item.subordinate.user_code}</Text>
                <View style={{ marginTop: 4, alignSelf: isRTL ? 'flex-end' : 'flex-start' }}>
                  <Badge
                    label={
                      item.placement === 'workspace'
                        ? t('placeInWorkspace')
                        : folderName(item.folder_id)
                    }
                    tone="muted"
                  />
                </View>
              </View>
              <Pressable onPress={() => onRemove(item.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.mutedText} />
              </Pressable>
            </View>
          </Card>
        ))
      )}

      {/* Add by User ID modal */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('addByUserId')}
            </Text>

            <View style={[styles.lookupRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={{ flex: 1 }}>
                <Input
                  value={userId}
                  onChangeText={setUserId}
                  placeholder={t('enterUserId')}
                  autoCapitalize="characters"
                  style={{ marginBottom: 0 }}
                />
              </View>
              <Pressable style={styles.lookupBtn} onPress={onLookup}>
                <Ionicons name="search" size={20} color={colors.onPrimary} />
              </Pressable>
            </View>

            {found ? (
              <>
                <Card style={styles.foundCard}>
                  <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                    <Avatar name={found.full_name} uri={found.avatar_url} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.name}>{found.full_name}</Text>
                      <Text style={styles.sub}>{found.user_code}</Text>
                    </View>
                    <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                  </View>
                </Card>

                <Select
                  label={t('classification')}
                  value={placement}
                  options={placementOptions}
                  onChange={setPlacement}
                />

                <Button
                  title={busy ? t('saving') : t('add')}
                  onPress={onConfirmAdd}
                  loading={busy}
                  icon="checkmark"
                />
              </>
            ) : null}

            {error ? <Text style={styles.error}>{error}</Text> : null}

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
  card: { marginBottom: spacing.md },
  row: { alignItems: 'center', gap: spacing.md },
  name: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  sub: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark, marginBottom: spacing.lg },
  lookupRow: { alignItems: 'flex-end', gap: spacing.sm, marginBottom: spacing.lg },
  lookupBtn: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundCard: { marginBottom: spacing.lg },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.sm },
});
