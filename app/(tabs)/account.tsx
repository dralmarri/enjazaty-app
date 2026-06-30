/**
 * Screen 12 — Account & settings.
 *  - User ID (copyable)
 *  - Email, job title
 *  - Change language
 *  - Add / change profile photo
 *  - Privacy
 *  - Logout
 */
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { Avatar, Badge, Button, Card, Header, Screen, SectionTitle } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { updateProfile } from '@/lib/api';
import { uploadFile } from '@/lib/storage';
import type { Language } from '@/i18n/translations';
import { colors, radius, spacing } from '@/theme/colors';

export default function AccountScreen() {
  const { profile, isAdmin, signOut, deleteAccount, refreshProfile } = useAuth();
  const { t, language, setLanguage, isRTL } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Show major.minor only, e.g. "1.0".
  const appVersion = (Constants.expoConfig?.version ?? '1.0.0')
    .split('.')
    .slice(0, 2)
    .join('.');

  const onDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      setConfirmDelete(false);
      router.replace('/language');
    } catch {
      setDeleting(false);
    }
  };

  const onCopyId = async () => {
    if (!profile?.user_code) return;
    await Clipboard.setStringAsync(profile.user_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const onChangePhoto = async () => {
    if (!profile) return;
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });
    if (res.canceled || !res.assets[0]) return;
    setUploading(true);
    try {
      const uploaded = await uploadFile({
        uri: res.assets[0].uri,
        userId: profile.id,
        fileName: res.assets[0].fileName ?? 'avatar',
        contentType: res.assets[0].mimeType,
      });
      await updateProfile(profile.id, { avatar_url: uploaded.url });
      await refreshProfile();
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
  };

  const onLogout = async () => {
    setLoggingOut(true);
    try {
      await signOut();
      router.replace('/language');
    } finally {
      setLoggingOut(false);
    }
  };

  const langs: { code: Language; label: string }[] = [
    { code: 'ar', label: t('arabic') },
    { code: 'en', label: t('english') },
  ];

  return (
    <Screen>
      <Header
        title={t('account')}
        rightIcon="create-outline"
        onRightPress={() => router.push('/edit-profile')}
      />

      {/* Profile card with avatar + change photo */}
      <Card style={styles.profileCard}>
        <Pressable onPress={onChangePhoto} style={styles.avatarWrap}>
          <Avatar name={profile?.full_name} uri={profile?.avatar_url} size={84} />
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color={colors.onPrimary} />
          </View>
        </Pressable>
        <Text style={styles.name}>{profile?.full_name}</Text>
        <Badge label={isAdmin ? t('admin') : t('employee')} tone="primary" />
        <Pressable onPress={onChangePhoto} hitSlop={6} style={{ marginTop: spacing.sm }}>
          <Text style={styles.changePhoto}>
            {uploading ? t('saving') : t('changePhoto')}
          </Text>
        </Pressable>
      </Card>

      {/* Account info */}
      <SectionTitle title={t('darkInfo')} />
      <Card>
        {/* User ID — copyable */}
        <View style={[styles.infoRow, styles.infoBorder, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.infoLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="id-card-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.infoLabel}>{t('yourUserId')}</Text>
          </View>
          <Pressable onPress={onCopyId} style={[styles.copyRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]} hitSlop={8}>
            <Text style={styles.infoValue}>{profile?.user_code}</Text>
            <Ionicons
              name={copied ? 'checkmark-circle' : 'copy-outline'}
              size={18}
              color={copied ? colors.success : colors.primaryDark}
            />
          </Pressable>
        </View>

        <InfoRow icon="mail-outline" label={t('email')} value={profile?.email} isRTL={isRTL} border />
        <InfoRow icon="briefcase-outline" label={t('jobTitle')} value={profile?.job_title || '—'} isRTL={isRTL} border />
        <InfoRow
          icon="business-outline"
          label={t('educationalRegion')}
          value={profile?.educational_region || '—'}
          isRTL={isRTL}
        />
      </Card>

      {/* Language switcher */}
      <SectionTitle title={t('language')} />
      <View style={styles.langRow}>
        {langs.map((l) => {
          const active = language === l.code;
          return (
            <Pressable
              key={l.code}
              onPress={() => setLanguage(l.code)}
              style={[styles.langChip, active && styles.langChipActive]}
            >
              <Ionicons
                name="globe-outline"
                size={18}
                color={active ? colors.primaryDark : colors.mutedText}
              />
              <Text style={[styles.langText, active && styles.langTextActive]}>
                {l.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* My signatures */}
      <SectionTitle title={t('signatures')} />
      <Card onPress={() => router.push('/signatures')}>
        <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.infoLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="create-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.infoLabel}>{t('mySignatures')}</Text>
          </View>
          <Ionicons
            name={isRTL ? 'chevron-back' : 'chevron-forward'}
            size={18}
            color={colors.mutedText}
          />
        </View>
      </Card>

      {/* About the app */}
      <SectionTitle title={t('aboutApp')} />
      <Card>
        <AboutRow
          icon="document-text-outline"
          label={t('termsOfUse')}
          isRTL={isRTL}
          border
          onPress={() => router.push('/terms')}
        />
        <AboutRow
          icon="shield-outline"
          label={t('privacyPolicy')}
          isRTL={isRTL}
          border
          onPress={() => router.push('/privacy')}
        />
        <AboutRow
          icon="mail-outline"
          label={t('contactUs')}
          isRTL={isRTL}
          border
          onPress={() => router.push('/contact')}
        />
        {/* Version (no chevron) */}
        <View style={[styles.infoRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <View style={[styles.infoLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primaryDark} />
            <Text style={styles.infoLabel}>{t('version')}</Text>
          </View>
          <Text style={styles.infoValue}>{appVersion}</Text>
        </View>
      </Card>

      <Button
        title={t('logout')}
        variant="primary"
        icon="log-out-outline"
        onPress={onLogout}
        loading={loggingOut}
        style={{ marginTop: spacing.xl }}
      />

      {/* Delete account */}
      <Pressable
        onPress={() => setConfirmDelete(true)}
        style={[styles.deleteRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
        hitSlop={8}
      >
        <Ionicons name="trash-outline" size={18} color={colors.primaryDark} />
        <Text style={styles.deleteText}>{t('deleteAccount')}</Text>
      </Pressable>

      {/* Credit */}
      <Text style={styles.credit}>{t('developedBy')}</Text>
      <Text style={styles.creditEn}>Developed by Hanadi Almarri</Text>

      {/* Delete confirmation */}
      <Modal
        visible={confirmDelete}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDelete(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setConfirmDelete(false)}>
          <Pressable style={styles.confirmSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.warnCircle}>
              <Ionicons name="warning-outline" size={32} color={colors.primaryDark} />
            </View>
            <Text style={styles.confirmTitle}>{t('deleteAccount')}</Text>
            <Text style={styles.confirmBody}>{t('deleteAccountConfirm')}</Text>
            <Button
              title={deleting ? t('loading') : t('deleteAccount')}
              variant="primary"
              icon="trash-outline"
              onPress={onDeleteAccount}
              loading={deleting}
            />
            <Button
              title={t('cancel')}
              variant="outline"
              onPress={() => setConfirmDelete(false)}
              style={{ marginTop: spacing.sm }}
            />
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function AboutRow({
  icon,
  label,
  isRTL,
  border,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  isRTL: boolean;
  border?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.infoRow,
        border && styles.infoBorder,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      <View style={[styles.infoLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Ionicons
        name={isRTL ? 'chevron-back' : 'chevron-forward'}
        size={18}
        color={colors.mutedText}
      />
    </Pressable>
  );
}

function InfoRow({
  icon,
  label,
  value,
  isRTL,
  border,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string | null;
  isRTL: boolean;
  border?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,
        border && styles.infoBorder,
        { flexDirection: isRTL ? 'row-reverse' : 'row' },
      ]}
    >
      <View style={[styles.infoLeft, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  profileCard: { alignItems: 'center', gap: spacing.sm },
  avatarWrap: { position: 'relative' },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  name: { fontSize: 20, fontWeight: '900', color: colors.textDark, marginTop: spacing.sm },
  changePhoto: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  infoRow: {
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  infoBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoLeft: { alignItems: 'center', gap: spacing.sm },
  infoLabel: { fontSize: 14, color: colors.mutedText },
  infoValue: { fontSize: 14, fontWeight: '700', color: colors.textDark, maxWidth: '55%' },
  copyRow: { alignItems: 'center', gap: spacing.sm },
  langRow: { flexDirection: 'row', gap: spacing.md },
  langChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  langChipActive: { borderColor: colors.primary, backgroundColor: colors.softBackground },
  langText: { fontSize: 14, fontWeight: '700', color: colors.mutedText },
  langTextActive: { color: colors.primaryDark },
  deleteRow: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  deleteText: { color: colors.primaryDark, fontWeight: '700', fontSize: 14 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  confirmSheet: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  warnCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  confirmTitle: { fontSize: 18, fontWeight: '900', color: colors.textDark, marginBottom: spacing.sm },
  confirmBody: {
    fontSize: 14,
    color: colors.mutedText,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  credit: {
    textAlign: 'center',
    marginTop: spacing.xl,
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  creditEn: {
    textAlign: 'center',
    marginTop: 2,
    fontSize: 12,
    color: colors.mutedText,
  },
});
