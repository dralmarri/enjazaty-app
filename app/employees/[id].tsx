/**
 * Screen 9 — Employee profile (admin view).
 *
 * Shows the employee's identity card, their achievements, and quick access to
 * the notes & evaluation screen.
 */
import React, { useCallback, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import {
  Avatar,
  Badge,
  Card,
  EmptyState,
  Header,
  Loading,
  Screen,
  SectionTitle,
} from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { getProfile, listAchievements, listRootFolders, listSupervisions } from '@/lib/api';
import { formatDate, statusTone } from '@/lib/format';
import type { Achievement, Folder, Supervision, UserProfile } from '@/types/database';
import { colors, radius, spacing } from '@/theme/colors';

export default function EmployeeProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, language, isRTL } = useLanguage();
  const [employee, setEmployee] = useState<UserProfile | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [team, setTeam] = useState<(Supervision & { subordinate: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMenu, setAddMenu] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [emp, achs, fdrs, subs] = await Promise.all([
        getProfile(id),
        listAchievements(id),
        listRootFolders(id),
        // This user's OWN subordinates (if he is a sub-admin) — lets a top
        // admin drill down the whole organisational tree level by level.
        listSupervisions(id).catch(() => []),
      ]);
      setEmployee(emp);
      setAchievements(achs);
      setFolders(fdrs);
      setTeam(subs);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Loading />;
  if (!employee) {
    return (
      <Screen>
        <Header title={t('employeeProfile')} showBack />
        <EmptyState icon="alert-circle-outline" message={t('error')} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Header
        title={t('employeeProfile')}
        showBack
        rightIcon="add-circle"
        onRightPress={() => setAddMenu(true)}
      />

      {/* Identity card */}
      <Card style={styles.idCard}>
        <Avatar name={employee.full_name} uri={employee.avatar_url} size={72} />
        <Text style={styles.name}>{employee.full_name}</Text>
        <Text style={styles.job}>{employee.job_title || employee.email}</Text>
        <Badge label={employee.user_code} tone="primary" />
        <View style={styles.statRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{achievements.length}</Text>
            <Text style={styles.statLabel}>{t('achievementsCount')}</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.success }]}>
              {achievements.filter((a) => a.status === 'approved').length}
            </Text>
            <Text style={styles.statLabel}>{t('approved')}</Text>
          </View>
        </View>
      </Card>

      {/* This user's own team (when he is a sub-admin) — tap to drill down
          the organisational tree level by level. */}
      {team.length > 0 ? (
        <>
          <SectionTitle title={t('subordinateEmployees')} />
          {team.map((it) => (
            <Card
              key={it.id}
              style={styles.achCard}
              onPress={() => router.push(`/employees/${it.subordinate.id}`)}
            >
              <View style={[styles.achRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                <Avatar
                  name={it.subordinate.full_name}
                  uri={it.subordinate.avatar_url}
                  size={40}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.achTitle} numberOfLines={1}>
                    {it.subordinate.full_name}
                  </Text>
                  <Text style={styles.achDate}>
                    {it.subordinate.job_title || it.subordinate.user_code}
                  </Text>
                </View>
                <Ionicons
                  name={isRTL ? 'chevron-back' : 'chevron-forward'}
                  size={18}
                  color={colors.mutedText}
                />
              </View>
            </Card>
          ))}
        </>
      ) : null}

      {/* Employee folders — supervisor can open them to browse files. */}
      {folders.length > 0 ? (
        <>
          <SectionTitle title={t('employeeFolders')} />
          <View style={styles.folderGrid}>
            {folders.map((f) => (
              <Card
                key={f.id}
                style={styles.folderCard}
                onPress={() => router.push(`/folder/${f.id}`)}
              >
                <View style={[styles.folderRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
                  <Ionicons name="folder" size={24} color={colors.primary} />
                  <Text style={styles.folderName} numberOfLines={1}>
                    {f.name}
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        </>
      ) : null}

      {/* Tap any achievement to open the evaluation (supervisor only). */}
      <SectionTitle title={t('notesAndEvaluation')} />
      {achievements.length === 0 ? (
        <EmptyState message={t('noAchievements')} />
      ) : (
        achievements.map((item) => (
          <Card
            key={item.id}
            style={styles.achCard}
            onPress={() => router.push(`/evaluate/${item.id}`)}
          >
            <View style={[styles.achRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
              <View style={styles.achIcon}>
                <Ionicons name="trophy-outline" size={20} color={colors.primaryDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.achTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.achDate}>{formatDate(item.created_at, language)}</Text>
              </View>
              <Badge label={t(item.status)} tone={statusTone(item.status)} />
            </View>
          </Card>
        ))
      )}

      {/* Add into the employee's workspace: folder or achievement */}
      <Modal visible={addMenu} transparent animationType="fade" onRequestClose={() => setAddMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddMenu(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>{employee.full_name}</Text>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setAddMenu(false);
                router.push(`/folder/new?owner=${id}`);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="folder-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('newFolder')}</Text>
            </Pressable>
            <Pressable
              style={[styles.menuRow, { flexDirection: isRTL ? 'row-reverse' : 'row' }]}
              onPress={() => {
                setAddMenu(false);
                router.push(`/achievement/new?owner=${id}&source=files`);
              }}
            >
              <View style={styles.menuIcon}>
                <Ionicons name="document-outline" size={22} color={colors.primaryDark} />
              </View>
              <Text style={styles.menuLabel}>{t('addAchievementType')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  menuRow: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
  menuIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: { fontSize: 16, fontWeight: '600', color: colors.textDark },
  idCard: { alignItems: 'center', gap: spacing.sm },
  name: { fontSize: 20, fontWeight: '900', color: colors.textDark, marginTop: spacing.sm },
  job: { fontSize: 14, color: colors.mutedText, marginBottom: spacing.xs },
  statRow: { flexDirection: 'row', gap: spacing.xxl, marginTop: spacing.md },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: colors.textDark },
  statLabel: { fontSize: 12, color: colors.mutedText },
  folderGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.sm },
  folderCard: { width: '47%', flexGrow: 1 },
  folderRow: { alignItems: 'center', gap: spacing.md },
  folderName: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.textDark },
  achCard: { marginBottom: spacing.md },
  achRow: { alignItems: 'center', gap: spacing.md },
  achIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.softBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achTitle: { fontSize: 15, fontWeight: '700', color: colors.textDark },
  achDate: { fontSize: 12, color: colors.mutedText, marginTop: 2 },
});
