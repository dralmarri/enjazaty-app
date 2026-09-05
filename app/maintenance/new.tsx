/**
 * Compose a maintenance or custody request. The free text the requester
 * types is what gets slotted into the official letter body (see
 * lib/maintenanceDoc.ts) once a supervisor signs and approves it.
 */
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Header, Input, Screen, Select, SectionTitle } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { createMaintenanceRequest } from '@/lib/api';
import type { MaintenanceRequestKind } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function NewMaintenanceRequestScreen() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();

  const [kind, setKind] = useState<MaintenanceRequestKind>('maintenance');
  const [requestType, setRequestType] = useState<string | null>(null);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const typeOptions = [
    { label: t('requestTypeComputer'), value: t('requestTypeComputer') },
    { label: t('requestTypePrinter'), value: t('requestTypePrinter') },
    { label: t('requestTypeNetwork'), value: t('requestTypeNetwork') },
    { label: t('requestTypeAC'), value: t('requestTypeAC') },
    { label: t('requestTypeProjector'), value: t('requestTypeProjector') },
    { label: t('requestTypeFurniture'), value: t('requestTypeFurniture') },
    { label: t('requestTypeOther'), value: t('requestTypeOther') },
  ];

  const onSubmit = async () => {
    setError(null);
    if (!profile || !requestType || !body.trim()) {
      setError(t('required'));
      return;
    }
    setBusy(true);
    try {
      await createMaintenanceRequest({
        requester_id: profile.id,
        kind,
        request_type: requestType,
        body: body.trim(),
      });
      router.back();
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Header title={t('newMaintenanceRequest')} showBack />

      <SectionTitle title={t('maintenanceRequestKind')} />
      <View style={styles.tabsRow}>
        {(['maintenance', 'custody'] as MaintenanceRequestKind[]).map((k) => {
          const active = kind === k;
          return (
            <Pressable
              key={k}
              onPress={() => setKind(k)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {k === 'maintenance' ? t('kindMaintenance') : t('kindCustody')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Select
        label={t('requestType')}
        placeholder={t('requestType')}
        value={requestType}
        options={typeOptions}
        onChange={setRequestType}
        required
      />

      <Input
        label={t('requestDetails')}
        value={body}
        onChangeText={setBody}
        multiline
        style={{ minHeight: 120, textAlignVertical: 'top' }}
      />
      <Text style={[styles.hint, { textAlign: isRTL ? 'right' : 'left' }]}>
        {t('requestDetailsHint')}
      </Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Button
        title={busy ? t('saving') : t('submitRequest')}
        onPress={onSubmit}
        loading={busy}
        icon="send"
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '700', color: colors.mutedText },
  chipTextActive: { color: colors.onPrimary },
  hint: { fontSize: 12, color: colors.mutedText, marginTop: -spacing.sm, marginBottom: spacing.md },
  error: { color: colors.danger, textAlign: 'center', marginTop: spacing.sm },
});
