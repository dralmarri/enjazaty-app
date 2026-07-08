/**
 * Screen 3c — Complete the job profile (role-based fields).
 *  Employee: name, educational region, work center, job title.
 *  Admin:    name, educational region, administration, job title.
 */
import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { Button, Header, Input, Screen, Select } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { EDUCATIONAL_REGIONS, NO_REGION } from '@/lib/constants';
import { colors, spacing } from '@/theme/colors';

export default function CompleteProfileScreen() {
  const { t } = useLanguage();
  const { completeProfile, pendingRole } = useAuth();
  const isAdmin = pendingRole === 'admin';

  const [fullName, setFullName] = useState('');
  const [region, setRegion] = useState<string | null>(null);
  const [employer, setEmployer] = useState('');
  const [workCenter, setWorkCenter] = useState('');
  const [administration, setAdministration] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const regionOptions = [
    { label: t('noRegion'), value: NO_REGION },
    ...EDUCATIONAL_REGIONS.map((r) => ({ label: r, value: r })),
  ];

  const onSave = async () => {
    setError(null);
    if (
      !fullName.trim() ||
      !employer.trim() ||
      !administration.trim() ||
      !workCenter.trim() ||
      !jobTitle.trim()
    ) {
      setError(t('required'));
      return;
    }
    setLoading(true);
    try {
      await completeProfile({
        fullName: fullName.trim(),
        jobTitle: jobTitle.trim(),
        educationalRegion: region && region !== NO_REGION ? region : undefined,
        employer: employer.trim(),
        workCenter: workCenter.trim(),
        administration: administration.trim(),
      });
      router.replace('/(tabs)/workspace');
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header
        title={t('completeYourProfile')}
        subtitle={isAdmin ? t('admin') : t('employee')}
      />

      <Input label={t('fullName')} value={fullName} onChangeText={setFullName} required />

      <Input label={t('employer')} value={employer} onChangeText={setEmployer} required />

      <Input
        label={t('administration')}
        value={administration}
        onChangeText={setAdministration}
        required
      />

      <Input
        label={t('workCenter')}
        value={workCenter}
        onChangeText={setWorkCenter}
        required
      />

      <Select
        label={t('educationalRegion')}
        placeholder={t('selectRegion')}
        value={region}
        options={regionOptions}
        onChange={setRegion}
      />

      <Input label={t('jobTitle')} value={jobTitle} onChangeText={setJobTitle} required />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={loading ? t('saving') : t('saveAndContinue')}
        onPress={onSave}
        loading={loading}
        icon="checkmark-circle-outline"
        style={{ marginTop: spacing.md }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, textAlign: 'center', marginBottom: spacing.sm },
});
