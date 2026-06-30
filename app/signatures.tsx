/**
 * My signatures — a library of reusable saved signatures.
 * Create new ones (drawn with finger or pen), preview, and delete them.
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  Button,
  Card,
  EmptyState,
  Header,
  Input,
  Screen,
  SignaturePad,
  SignatureView,
} from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { createSignature, deleteSignature, listSignatures } from '@/lib/api';
import type { Signature } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function SignaturesScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const [items, setItems] = useState<Signature[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      setItems(await listSignatures(profile.id));
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

  const onSave = async () => {
    if (!profile || paths.length === 0) return;
    setSaving(true);
    try {
      await createSignature({
        user_id: profile.id,
        name: name.trim() || null,
        data: JSON.stringify(paths),
      });
      setPaths([]);
      setName('');
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
      await deleteSignature(id);
      await load();
    } catch {
      // ignore
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={t('mySignatures')}
        showBack
        rightIcon="add-circle"
        onRightPress={() => setModalOpen(true)}
      />

      {items.length === 0 ? (
        <EmptyState icon="create-outline" message={t('noSignatures')} hint={t('signaturesHint')} />
      ) : (
        items.map((sig) => (
          <Card key={sig.id} style={styles.card}>
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <Text style={styles.name}>{sig.name || t('newSignature')}</Text>
              <Pressable onPress={() => onDelete(sig.id)} hitSlop={8}>
                <Ionicons name="trash-outline" size={18} color={colors.primaryDark} />
              </Pressable>
            </View>
            <SignatureView value={sig.data} height={100} />
          </Card>
        ))
      )}

      {/* Create signature modal */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { textAlign: isRTL ? 'right' : 'left' }]}>
              {t('newSignature')}
            </Text>
            <Input label={t('signatureName')} value={name} onChangeText={setName} />
            <SignaturePad onChange={setPaths} />
            <Button
              title={saving ? t('saving') : t('saveSignature')}
              onPress={onSave}
              loading={saving}
              icon="checkmark"
              style={{ marginTop: spacing.md }}
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
  card: { marginBottom: spacing.md, gap: spacing.sm },
  row: { alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.textDark, marginBottom: spacing.md },
});
