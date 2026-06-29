/**
 * Notifications — the user's notifications feed (achievements submitted,
 * evaluations received, etc.). Reached from the bell icon on the home screen.
 */
import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Card, EmptyState, Header, Screen } from '@/components';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api';
import { formatDate } from '@/lib/format';
import type { AppNotification } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function NotificationsScreen() {
  const { profile } = useAuth();
  const { t, language, isRTL } = useLanguage();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setRefreshing(true);
      setItems(await listNotifications(profile.id));
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onMarkAll = async () => {
    if (!profile) return;
    try {
      await markAllNotificationsRead(profile.id);
      await load();
    } catch {
      // ignore
    }
  };

  const onTap = async (n: AppNotification) => {
    if (n.read) return;
    try {
      await markNotificationRead(n.id);
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    } catch {
      // ignore
    }
  };

  const iconFor = (type: AppNotification['type']): keyof typeof Ionicons.glyphMap => {
    switch (type) {
      case 'achievement':
        return 'trophy-outline';
      case 'evaluation':
        return 'star-outline';
      case 'note':
        return 'chatbubble-ellipses-outline';
      case 'assignment':
        return 'people-outline';
      default:
        return 'notifications-outline';
    }
  };

  return (
    <Screen refreshing={refreshing} onRefresh={load}>
      <Header
        title={t('notifications')}
        showBack
        rightIcon="checkmark-done-outline"
        onRightPress={onMarkAll}
      />

      {items.length === 0 ? (
        <EmptyState icon="notifications-outline" message={t('noNotifications')} />
      ) : (
        items.map((n) => (
          <Card
            key={n.id}
            style={[styles.card, !n.read && styles.unread]}
            onPress={() => onTap(n)}
          >
            <View style={[styles.row, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.iconBox}>
                <Ionicons name={iconFor(n.type)} size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>{n.title}</Text>
                {n.body ? <Text style={styles.body}>{n.body}</Text> : null}
                <Text style={styles.date}>{formatDate(n.created_at, language)}</Text>
              </View>
              {!n.read ? <View style={styles.dot} /> : null}
            </View>
          </Card>
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  unread: { backgroundColor: colors.softBackground },
  row: { alignItems: 'center', gap: spacing.md },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: colors.textDark },
  body: { fontSize: 13, color: colors.mutedText, marginTop: 2 },
  date: { fontSize: 11, color: colors.mutedText, marginTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
});
