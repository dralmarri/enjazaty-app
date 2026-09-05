/**
 * Maintenance & custody requests archive: "طلباتي" (my own requests) and,
 * for a supervisor/admin, "بانتظار اعتمادي" (requests from people under me
 * waiting for my signature).
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Badge, Card, EmptyState, Header, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listMaintenanceApprovals, listMyMaintenanceRequests } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { MaintenanceRequest } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

type Tab = 'mine' | 'approvals';

export default function MaintenanceScreen() {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [tab, setTab] = useState<Tab>('mine');
  const [mine, setMine] = useState<MaintenanceRequest[]>([]);
  const [approvals, setApprovals] = useState<MaintenanceRequest[]>([]);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const [myReqs, toApprove] = await Promise.all([
        listMyMaintenanceRequests(profile.id),
        listMaintenanceApprovals(profile.id).catch(() => [] as MaintenanceRequest[]),
      ]);
      setMine(myReqs);
      setApprovals(toApprove);
    } catch {
      // keep previous data
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const kindLabel = (r: MaintenanceRequest) => (r.kind === 'maintenance' ? t('kindMaintenance') : t('kindCustody'));
  const statusTone = (s: MaintenanceRequest['status']) =>
    s === 'approved' ? 'success' : s === 'rejected' ? 'danger' : 'primary';
  const statusLabel = (s: MaintenanceRequest['status']) =>
    s === 'approved' ? t('approved') : s === 'rejected' ? t('rejected') : t('pending');

  const row = (r: MaintenanceRequest) => (
    <Card key={r.id} style={styles.card} onPress={() => router.push(`/maintenance/${r.id}`)}>
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={styles.iconBox}>
          <Ionicons
            name={r.kind === 'maintenance' ? 'build-outline' : 'briefcase-outline'}
            size={20}
            color={colors.primaryDark}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>
            {r.request_type}
          </Text>
          <Text style={styles.meta}>
            {kindLabel(r)} · {formatDate(r.created_at, language)}
          </Text>
        </View>
        <Badge label={statusLabel(r.status)} tone={statusTone(r.status) as any} />
        <Ionicons name={isRTL ? 'chevron-back' : 'chevron-forward'} size={18} color={colors.mutedText} />
      </View>
    </Card>
  );

  const list = tab === 'mine' ? mine : approvals;

  return (
    <Screen>
      <Header
        title={t('maintenance')}
        showBack
        rightIcon="add-circle"
        onRightPress={() => router.push('/maintenance/new')}
      />
      <Text style={styles.hint}>{t('maintenanceHint')}</Text>

      <View style={styles.tabsRow}>
        {(['mine', 'approvals'] as Tab[]).map((key) => {
          const active = tab === key;
          const count = key === 'approvals' ? approvals.filter((a) => a.status === 'pending').length : 0;
          return (
            <Pressable key={key} onPress={() => setTab(key)} style={[styles.chip, active && styles.chipActive]}>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {key === 'mine' ? t('myRequests') : t('approvalsNeeded')}
                {count > 0 ? ` (${count})` : ''}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon="build-outline"
          message={tab === 'mine' ? t('noMaintenanceRequests') : t('noApprovalsNeeded')}
        />
      ) : (
        list.map(row)
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hint: { fontSize: 13, color: colors.mutedText, marginBottom: spacing.md },
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
  card: { marginBottom: spacing.sm },
  row: { alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 15, fontWeight: '800', color: colors.textDark },
  meta: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
});
