/**
 * Create a folder. Which side the folder belongs to is decided by where the
 * user came from — `?kind=achievements` (My achievements tab) or
 * `?kind=employees` (workspace / team tab) — so nothing extra is asked here.
 */
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Header, Input, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { createFolder } from '@/lib/api';
import type { FolderKind } from '@/types/database';
import { colors, spacing } from '@/theme/colors';

export default function NewFolderScreen() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  // ?parent = create this folder INSIDE another folder (a sub-folder).
  // ?owner  = create it inside another user's (employee's) workspace.
  const { parent, owner, kind } = useLocalSearchParams<{
    parent?: string;
    owner?: string;
    kind?: FolderKind;
  }>();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSave = async () => {
    setError(null);
    if (!profile || !name.trim()) {
      setError(t('required'));
      return;
    }
    setSaving(true);
    try {
      await createFolder({
        name: name.trim(),
        description: description.trim() || null,
        owner_id: owner ?? profile.id,
        parent_id: parent ?? null,
        kind: kind === 'employees' ? 'employees' : 'achievements',
      });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title={t('newFolder')} showBack />
      <Input label={t('folderName')} value={name} onChangeText={setName} />
      <Input
        label={t('folderDescription')}
        value={description}
        onChangeText={setDescription}
        multiline
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        title={saving ? t('saving') : t('add')}
        onPress={onSave}
        loading={saving}
        icon="checkmark"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.sm },
});
