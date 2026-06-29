/**
 * Create a folder (reached from the home "Add achievement → Folder" menu).
 * Folders organize achievements and are used when placing supervised employees.
 */
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button, Header, Input, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { createFolder } from '@/lib/api';
import { colors, spacing } from '@/theme/colors';

export default function NewFolderScreen() {
  const { profile } = useAuth();
  const { t } = useLanguage();
  // ?parent = create this folder INSIDE another folder (a sub-folder).
  const { parent } = useLocalSearchParams<{ parent?: string }>();
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
        owner_id: profile.id,
        parent_id: parent ?? null,
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
