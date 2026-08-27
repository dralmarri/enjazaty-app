/**
 * Signup — fields change dynamically based on the role chosen on the
 * previous screen (see spec §"التسجيل"). Registration is open/direct: no
 * manual approval for any role. A designer's account gets an internal
 * "pending" status (not an access gate) handled in AuthContext.signUp.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Screen, Header, Input, Select, Button } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { colors, spacing } from '@/theme/colors';
import { listSchools } from '@/lib/api';
import {
  DESIGNER_JOB_TITLES,
  type DesignerJobTitle,
  type SchoolStage,
  type School,
  type UserRole,
} from '@/types/database';

const STAGE_OPTIONS: { value: SchoolStage; key: 'stageKindergarten' | 'stagePrimary' | 'stageIntermediate' | 'stageSecondary' }[] = [
  { value: 'kindergarten', key: 'stageKindergarten' },
  { value: 'primary', key: 'stagePrimary' },
  { value: 'intermediate', key: 'stageIntermediate' },
  { value: 'secondary', key: 'stageSecondary' },
];

export default function SignupScreen() {
  const { role: roleParam } = useLocalSearchParams<{ role: UserRole }>();
  const role = (roleParam as UserRole) ?? 'designer';
  const { t } = useLanguage();
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [jobTitle, setJobTitle] = useState<DesignerJobTitle | null>(null);
  const [region, setRegion] = useState('');
  const [stage, setStage] = useState<SchoolStage | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [schools, setSchools] = useState<School[]>([]);
  const [educationalRegion, setEducationalRegion] = useState(
    role === 'supervisor'
      ? 'مراقبة توجيه التقنيات التربوية بمنطقة مبارك الكبير التعليمية'
      : role === 'coordinator'
        ? 'توجيه التقنيات التربوية بمنطقة مبارك الكبير التعليمية'
        : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDesigner = role === 'designer';

  useEffect(() => {
    if (isDesigner) {
      listSchools()
        .then(setSchools)
        .catch(() => setSchools([]));
    }
  }, [isDesigner]);

  const schoolOptions = useMemo(
    () => schools.map((s) => ({ label: s.name, value: s.id })),
    [schools]
  );
  const jobTitleOptions = useMemo(
    () => DESIGNER_JOB_TITLES.map((jt) => ({ label: jt, value: jt })),
    []
  );
  const stageOptions = useMemo(
    () => STAGE_OPTIONS.map((s) => ({ label: t(s.key), value: s.value })),
    [t]
  );

  const roleLabel =
    role === 'designer' ? t('roleDesigner') : role === 'coordinator' ? t('roleCoordinator') : t('roleSupervisor');

  const onSubmit = async () => {
    setError(null);
    const baseValid = fullName && email && password;
    if (!baseValid) {
      setError(t('fillAllFields'));
      return;
    }
    if (isDesigner && (!jobTitle || !region || !stage || !schoolId)) {
      setError(t('fillAllFields'));
      return;
    }
    if (!isDesigner && !educationalRegion) {
      setError(t('fillAllFields'));
      return;
    }

    setLoading(true);
    try {
      await signUp({
        email,
        password,
        role,
        fullName,
        phone,
        jobTitle: isDesigner ? jobTitle ?? undefined : undefined,
        region: isDesigner ? region : undefined,
        educationStage: isDesigner ? stage ?? undefined : undefined,
        schoolId: isDesigner ? schoolId ?? undefined : undefined,
        educationalRegion: !isDesigner ? educationalRegion : undefined,
      });
      router.replace('/schools');
    } catch (e) {
      if (e instanceof Error && e.message === 'EMAIL_TAKEN') {
        setError(t('emailTaken'));
      } else {
        setError(t('error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title={t('signup')} subtitle={roleLabel} />
      <View style={styles.form}>
        <Input
          label={isDesigner ? t('fullName') : t('fullNameTriple')}
          value={fullName}
          onChangeText={setFullName}
        />
        <Input label={t('email')} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label={t('phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Input label={t('password')} value={password} onChangeText={setPassword} secureTextEntry />

        {isDesigner ? (
          <>
            <Select
              label={t('jobTitle')}
              placeholder={t('jobTitle')}
              options={jobTitleOptions}
              value={jobTitle}
              onChange={(v) => setJobTitle(v as DesignerJobTitle)}
            />
            <Input label={t('region')} value={region} onChangeText={setRegion} />
            <Select
              label={t('educationStage')}
              placeholder={t('educationStage')}
              options={stageOptions}
              value={stage}
              onChange={(v) => setStage(v as SchoolStage)}
            />
            <Select
              label={t('school')}
              placeholder={t('school')}
              options={schoolOptions}
              value={schoolId}
              onChange={setSchoolId}
            />
          </>
        ) : (
          <>
            <Input label={t('jobTitle')} value={roleLabel} editable={false} />
            <Input
              label={t('educationalRegionLabel')}
              value={educationalRegion}
              onChangeText={setEducationalRegion}
              multiline
            />
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={t('signupCta')} onPress={onSubmit} loading={loading} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { padding: spacing.lg },
  error: { color: colors.danger, marginBottom: spacing.md, textAlign: 'center' },
});
