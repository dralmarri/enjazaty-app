/**
 * A single maintenance/custody request rendered as the official letter it
 * becomes once approved: addressed to the technology department, requester's
 * name on the right, and the supervisor's name + drawn signature on the left.
 *
 * The requester can cancel while it's pending. Whoever supervises the
 * requester (any level up the chain) — or an admin — can sign to approve or
 * reject it.
 */
import React, { useCallback, useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Badge, Button, Card, Header, Loading, Screen, SignatureChooser, SignatureView } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  approveMaintenanceRequest,
  deleteMaintenanceRequest,
  getProfile,
  getMaintenanceRequest,
  rejectMaintenanceRequest,
  supervises,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import { printMaintenanceRequest, saveMaintenanceRequest, shareMaintenanceRequest } from '@/lib/maintenanceDoc';
import type { MaintenanceRequest, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function MaintenanceRequestScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [request, setRequest] = useState<MaintenanceRequest | null>(null);
  const [requester, setRequester] = useState<UserProfile | null>(null);
  const [approver, setApprover] = useState<UserProfile | null>(null);
  const [canApprove, setCanApprove] = useState(false);
  const [loading, setLoading] = useState(true);

  const [signaturePaths, setSignaturePaths] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id || !profile) return;
    setLoading(true);
    try {
      const r = await getMaintenanceRequest(id);
      setRequest(r);
      if (r) {
        const [req, appr] = await Promise.all([
          getProfile(r.requester_id),
          r.approver_id ? getProfile(r.approver_id) : Promise.resolve(null),
        ]);
        setRequester(req);
        setApprover(appr);
        const isOwner = r.requester_id === profile.id;
        const sup = isOwner ? false : await supervises(profile.id, r.requester_id);
        setCanApprove(sup);
      }
    } finally {
      setLoading(false);
    }
  }, [id, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Loading />;
  if (!request || !requester || !profile) {
    return (
      <Screen>
        <Header title={t('maintenance')} showBack />
      </Screen>
    );
  }

  const isOwner = request.requester_id === profile.id;
  const subject = request.kind === 'maintenance' ? t('maintenanceSubject') : t('custodySubject');
  const statusTone = request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'danger' : 'primary';
  const statusLabel =
    request.status === 'approved' ? t('approved') : request.status === 'rejected' ? t('rejected') : t('pending');

  const docOpts = { request, requester, approver, t, language, isRTL };

  const onApprove = async () => {
    setError(null);
    if (signaturePaths.length === 0) {
      setError(t('signatureRequired'));
      return;
    }
    setBusy(true);
    try {
      await approveMaintenanceRequest(request.id, {
        approver_id: profile.id,
        signature: JSON.stringify(signaturePaths),
      });
      await load();
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setBusy(false);
    }
  };

  const onReject = async () => {
    setBusy(true);
    try {
      await rejectMaintenanceRequest(request.id, { approver_id: profile.id });
      await load();
    } catch (e: any) {
      setError(e?.message ?? t('error'));
    } finally {
      setBusy(false);
    }
  };

  const onCancel = () => {
    const doDelete = async () => {
      await deleteMaintenanceRequest(request.id);
      router.back();
    };
    if (Platform.OS === 'web') {
      if (confirm(t('confirmCancelRequest'))) doDelete();
      return;
    }
    Alert.alert(t('confirmCancelRequest'), '', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: doDelete },
    ]);
  };

  return (
    <Screen>
      <Header title={subject} showBack />

      {/* Letter preview */}
      <Card style={styles.letter}>
        <View style={[styles.letterHead, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Badge label={statusLabel} tone={statusTone as any} />
          <Text style={styles.date}>{formatDate(request.created_at, language)}</Text>
        </View>

        <Text style={[styles.toLine, { textAlign: isRTL ? 'right' : 'left' }]}>
          {t('headOfTechAddress')}
        </Text>
        <Text style={[styles.after, { textAlign: isRTL ? 'right' : 'left' }]}>{t('afterGreeting')}</Text>

        <Text style={styles.subject}>
          {t('subjectLabel')}: {subject} — {request.request_type}
        </Text>

        <Text style={[styles.body, { textAlign: isRTL ? 'right' : 'left' }]}>{request.body}</Text>

        <Text style={[styles.thanks, { textAlign: isRTL ? 'right' : 'left' }]}>{t('thanksClosing')}</Text>

        <View style={[styles.signRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>{t('requestedBy')}</Text>
            <Text style={styles.signName}>{requester.full_name}</Text>
          </View>
          <View style={styles.signCol}>
            <Text style={styles.signLabel}>{t('approvedBy')}</Text>
            {request.status === 'approved' && request.signature ? (
              <SignatureView value={request.signature} height={60} />
            ) : (
              <Text style={styles.placeholder}>{t('awaitingSignature')}</Text>
            )}
            {approver ? <Text style={styles.signName}>{approver.full_name}</Text> : null}
          </View>
        </View>
      </Card>

      {/* Print / share / save the letter */}
      <View style={[styles.docActions, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Pressable style={styles.docBtn} onPress={() => printMaintenanceRequest(docOpts)}>
          <Ionicons name="print-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.docBtnLabel}>{t('print')}</Text>
        </Pressable>
        <Pressable style={styles.docBtn} onPress={() => shareMaintenanceRequest(docOpts)}>
          <Ionicons name="share-social-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.docBtnLabel}>{t('share')}</Text>
        </Pressable>
        <Pressable style={styles.docBtn} onPress={() => saveMaintenanceRequest(docOpts)}>
          <Ionicons name="download-outline" size={20} color={colors.primaryDark} />
          <Text style={styles.docBtnLabel}>{t('save')}</Text>
        </Pressable>
      </View>

      {/* Requester: cancel while pending */}
      {isOwner && request.status === 'pending' ? (
        <Button title={t('cancelRequest')} variant="outline" icon="close-circle-outline" onPress={onCancel} />
      ) : null}

      {/* Supervisor/admin: sign to approve, or reject */}
      {canApprove && request.status === 'pending' ? (
        <Card style={styles.section}>
          <Text style={[styles.label, { textAlign: isRTL ? 'right' : 'left' }]}>{t('signAndApprove')}</Text>
          <SignatureChooser onChange={setSignaturePaths} />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Button
              title={busy ? t('saving') : t('rejectRequest')}
              variant="outline"
              icon="close-outline"
              onPress={onReject}
              loading={busy}
              fullWidth={false}
              style={styles.actionBtn}
            />
            <Button
              title={busy ? t('saving') : t('approveRequest')}
              icon="checkmark-done-outline"
              onPress={onApprove}
              loading={busy}
              fullWidth={false}
              style={styles.actionBtn}
            />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  letter: { gap: spacing.sm },
  letterHead: { justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  date: { fontSize: 12, color: colors.mutedText },
  toLine: { fontSize: 15, fontWeight: '800', color: colors.textDark, marginTop: spacing.md },
  after: { fontSize: 13, color: colors.textDark, marginTop: spacing.sm },
  subject: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
    textAlign: 'center',
    marginTop: spacing.md,
    textDecorationLine: 'underline',
  },
  body: { fontSize: 14, color: colors.textDark, lineHeight: 22, marginTop: spacing.md },
  thanks: { fontSize: 14, fontWeight: '700', color: colors.textDark, marginTop: spacing.lg },
  signRow: { justifyContent: 'space-between', marginTop: spacing.xl },
  signCol: { alignItems: 'center', flex: 1, gap: 4 },
  signLabel: { fontSize: 12, color: colors.mutedText },
  signName: { fontSize: 13, fontWeight: '800', color: colors.textDark },
  placeholder: { fontSize: 12, color: colors.mutedText, fontStyle: 'italic' },
  docActions: { justifyContent: 'center', gap: spacing.xl, marginVertical: spacing.lg },
  docBtn: { alignItems: 'center', gap: 4 },
  docBtnLabel: { fontSize: 12, color: colors.primaryDark, fontWeight: '600' },
  section: { marginTop: spacing.md, gap: spacing.md },
  label: { fontSize: 14, fontWeight: '600', color: colors.textDark },
  actionsRow: { gap: spacing.md },
  actionBtn: { flex: 1 },
  error: { color: colors.danger, textAlign: 'center' },
});
