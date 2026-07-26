/**
 * Circulars archive (التعاميم) — everything sent to this user, newest first
 * with pinned ones on top. Admins also get a "sent" tab and the compose button.
 *
 * A circular carries no task and no due date: opening it records the read
 * automatically, and nothing is asked of the recipient.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { Badge, Card, EmptyState, Header, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { listReceivedCirculars, listSentCirculars } from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { Circular, CircularRecipient } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

type Tab = 'received' | 'sent';

export default function CircularsScreen() {
  const { profile, isAdmin } = useAuth();
  const { t, language, isRTL } = useLanguage();

  const [tab, setTab] = useState<Tab>('received');
  const [received, setReceived] = useState<(CircularRecipient & { circular: Circular })[]>([]);
  const [sent, setSent] = useState<Circular[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      const [inbox, outbox] = await Promise.all([
        listReceivedCirculars(profile.id),
        isAdmin ? listSentCirculars(profile.id) : Promise.resolve([]),
      ]);
      setReceived(inbox);
      setSent(outbox);
    } catch {
      // keep previous data
    } finally {
      setRefreshing(false);
    }
  }, [profile, isAdmin]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const row = (c: Circular, unread: boolean) => (
    <Card
      key={c.id}
      style={styles.card}
      onPress={() => router.push(`/circulars/${c.id}`)}
    >
      <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
        <View style={[styles.iconBox, unread && styles.iconBoxUnread]}>
          <Ionicons
            name={c.pinned ? 'pin' : 'megaphone-outline'}
            size={20}
            color={unread ? colors.onPrimary : colors.primaryDark}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={2}>
            {c.title}
          </Text>
          <Text style={styles.meta}>
            {c.number ? `${c.number} · ` : ''}
            {formatDate(c.created_at, language)}
          </Text>
        </View>
        {unread ? <Badge label={t('unreadCirculars')} tone="primary" /> : null}
        <Ionicons
          name={isRTL ? 'chevron-back' : 'chevron-forward'}
          size={18}
          color={colors.mutedText}
        />
      </View>
    </Card>
  );

  const items =
    tab === 'received'
      ? received.map((r) => row(r.circular, !r.read_at))
      : sent.map((c) => row(c, false));

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={t('circulars')}
        showBack
        rightIcon={isAdmin ? 'add' : undefined}
        onRightPress={isAdmin ? () => router.push('/circulars/new') : undefined}
      />

      {/* Received / sent — the sent side is an admin's own outbox */}
      {isAdmin ? (
        <View style={styles.tabsRow}>
          {(['received', 'sent'] as Tab[]).map((key) => {
            const active = tab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setTab(key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {t(key === 'received' ? 'received' : 'sent')}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon="megaphone-outline" message={t('noCirculars')} />
      ) : (
        items
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  row: { alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxUnread: { backgroundColor: colors.primary },
  title: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  titleUnread: { fontWeight: '900' },
  meta: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
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
});
