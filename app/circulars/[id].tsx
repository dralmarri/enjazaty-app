/**
 * One circular. Opening it records the read automatically — no button, no
 * confirmation. The sender additionally sees who has opened it, and can pin it,
 * re-broadcast it to his own subordinates, or delete it.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Avatar, Badge, Button, Card, Header, Loading, Screen, SectionTitle } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  deleteCircular,
  getCircular,
  getProfile,
  listCircularRecipients,
  markCircularRead,
  setCircularPinned,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Circular, CircularRecipient, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function CircularScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [circular, setCircular] = useState<Circular | null>(null);
  const [sender, setSender] = useState<UserProfile | null>(null);
  const [recipients, setRecipients] = useState<
    (CircularRecipient & { recipient: UserProfile })[]
  >([]);
  const [loading, setLoading] = useState(true);

  const isSender = !!circular && circular.sender_id === profile?.id;

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await getCircular(id);
      setCircular(c);
      if (c) {
        setSender(await getProfile(c.sender_id));
        if (c.sender_id === profile?.id) {
          setRecipients(await listCircularRecipients(c.id).catch(() => []));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [id, profile?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Reading is recorded the moment the circular is opened.
  useEffect(() => {
    if (!id || !profile || !circular || circular.sender_id === profile.id) return;
    markCircularRead(id, profile.id).catch(() => {
      // a failed read receipt must never block reading the circular
    });
  }, [id, profile, circular]);

  if (loading) return <Loading />;
  if (!circular) return <Screen><Header title={t('circulars')} showBack /></Screen>;

  const readCount = recipients.filter((r) => !!r.read_at).length;

  const onDelete = async () => {
    try {
      await deleteCircular(circular.id);
      router.back();
    } catch {
      // ignore
    }
  };

  return (
    <Screen>
      <Header title={t('circulars')} showBack />

      <Card style={styles.card}>
        <View style={[styles.topRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
          <Text style={styles.title}>{circular.title}</Text>
          {circular.pinned ? <Badge label={t('pinned')} tone="primary" /> : null}
        </View>
        <Text style={styles.meta}>
          {circular.number ? `${circular.number} · ` : ''}
          {formatDate(circular.created_at, language)}
        </Text>
        {sender ? (
          <Text style={styles.meta}>
            {t('from')}: {sender.full_name}
          </Text>
        ) : null}

        {circular.body ? <Text style={styles.body}>{circular.body}</Text> : null}

        {circular.file_url ? (
          <Pressable
            style={styles.fileRow}
            onPress={() => Linking.openURL(circular.file_url as string)}
          >
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.iconBox}>
                <Ionicons name="document-text-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.fileLabel} numberOfLines={1}>
                {circular.file_name ?? t('openFile')}
              </Text>
              <Ionicons
                name={isRTL ? 'chevron-back' : 'chevron-forward'}
                size={18}
                color={colors.mutedText}
              />
            </View>
          </Pressable>
        ) : null}
      </Card>

      {/* Re-broadcasting is a supervisor action only. */}
      {isAdmin ? (
        <Button
          title={t('rebroadcast')}
          icon="megaphone-outline"
          variant="outline"
          onPress={() => router.push(`/circulars/new?source=${circular.id}`)}
        />
      ) : null}

      {/* The sender's view: who opened it, pin, delete */}
      {isSender ? (
        <>
          <View style={[styles.actionsRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Button
              title={circular.pinned ? t('unpin') : t('pin')}
              icon="pin-outline"
              variant="outline"
              style={{ flex: 1 }}
              onPress={async () => {
                await setCircularPinned(circular.id, !circular.pinned);
                await load();
              }}
            />
            <Button
              title={t('delete')}
              icon="trash-outline"
              variant="outline"
              style={{ flex: 1 }}
              onPress={onDelete}
            />
          </View>

          <SectionTitle
            title={`${t('readBy')} — ${readCount} / ${recipients.length}`}
          />
          {recipients.map((r) => (
            <Card key={r.id} style={styles.recipientCard}>
              <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Avatar name={r.recipient?.full_name} uri={r.recipient?.avatar_url} size={36} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{r.recipient?.full_name}</Text>
                  <Text style={styles.sub}>
                    {r.read_at ? `${t('readCount')} · ${formatDate(r.read_at, language)}` : t('notReadYet')}
                  </Text>
                </View>
                <Ionicons
                  name={r.read_at ? 'checkmark-done' : 'time-outline'}
                  size={18}
                  color={r.read_at ? colors.success : colors.mutedText}
                />
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md, gap: spacing.xs },
  topRow: { alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { flex: 1, fontSize: 18, fontWeight: '900', color: colors.textDark },
  meta: { fontSize: 12, color: colors.mutedText },
  body: { fontSize: 15, color: colors.textDark, marginTop: spacing.sm, lineHeight: 24 },
  row: { alignItems: 'center', gap: spacing.md },
  fileRow: {
    backgroundColor: colors.softBackground,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  fileLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textDark },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsRow: { gap: spacing.md, marginBottom: spacing.md },
  recipientCard: { marginBottom: spacing.sm },
  name: { fontSize: 14, fontWeight: '700', color: colors.textDark },
  sub: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
});
