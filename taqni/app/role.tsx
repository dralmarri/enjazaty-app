/**
 * Role selection — chosen role drives which fields the signup form shows.
 * Only the launch-active roles are selectable (spec: dept_manager /
 * general_manager are structural-only, no registration UI at launch).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen, Header, Card, Button } from '@/components';
import { useLanguage } from '@/context/LanguageContext';
import { spacing } from '@/theme/colors';
import type { UserRole } from '@/types/database';

const ROLES: { role: UserRole; labelKey: 'roleDesigner' | 'roleCoordinator' | 'roleSupervisor' }[] = [
  { role: 'designer', labelKey: 'roleDesigner' },
  { role: 'coordinator', labelKey: 'roleCoordinator' },
  { role: 'supervisor', labelKey: 'roleSupervisor' },
];

export default function RoleScreen() {
  const { t } = useLanguage();

  return (
    <Screen scroll={false}>
      <Header title={t('chooseRole')} />
      <View style={styles.list}>
        {ROLES.map(({ role, labelKey }) => (
          <Card key={role} style={styles.card}>
            <Button
              title={t(labelKey)}
              onPress={() => router.push({ pathname: '/(auth)/signup', params: { role } })}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing.lg, gap: spacing.md },
  card: { padding: spacing.sm },
});
