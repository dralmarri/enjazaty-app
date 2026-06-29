/**
 * Edit profile — lets an existing user update their name, educational region
 * (dropdown), work center / administration, and job title. Reachable from the
 * Account screen. This also lets accounts created before these fields existed
 * fill them in.
 */
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Header, Input, Screen, Select } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { updateProfile } from '@/lib/api';
import { EDUCATIONAL_REGIONS } from '@/lib/constants';
import { colors, spacing } from '@/theme/colors';

export default function EditProfileScreen() {
  const { profile, isAdmin, refreshProfile } = useAuth();
  const { t } = useLanguage();

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [region, setRegion] = useState<string | null>(profile?.educational_region ?? null);
  const [workCenter, setWorkCenter] = useState(profile?.work_center ?? '');
  const [administration, setAdministration] = useState(profile?.administration ?? '');
  const [jobTitle, setJobTitle] = useState(profile?.job_title ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const regionOptions = EDUCATIONAL_REGIONS.map((r) => ({ label: r, value: r }));

  const onSave = async () => {
    setError(null);
    if (!profile || !fullName.trim()) {
      setError(t('required'));
      return;
    }
    setSaving(true);
    try {
      await updateProfile(profile.id, {
        full_name: fullName.trim(),
        job_title: jobTitle.trim() || null,
        educational_region: region,
        work_center: !isAdmin ? workCenter.trim() || null : null,
        administration: isAdmin ? administration.trim() || null : null,
      });
      await refreshProfile();
      router.back();
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Header title={t('completeYourProfile')} showBack />

      <Input label={t('fullName')} value={fullName} onChangeText={setFullName} />

      <Select
        label={t('educationalRegion')}
        placeholder={t('selectRegion')}
        value={region}
        options={regionOptions}
        onChange={setRegion}
      />

      {isAdmin ? (
        <Input
          label={t('administration')}
          value={administration}
          onChangeText={setAdministration}
        />
      ) : (
        <Input label={t('workCenter')} value={workCenter} onChangeText={setWorkCenter} />
      )}

      <Input label={t('jobTitle')} value={jobTitle} onChangeText={setJobTitle} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={saving ? t('saving') : t('save_changes')}
        onPress={onSave}
        loading={saving}
        icon="checkmark-circle-outline"
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.sm },
});
