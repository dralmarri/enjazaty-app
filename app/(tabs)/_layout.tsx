/**
 * Bottom tab navigation (fixed): Workspace, Files, Activity,
 * Notifications/Analytics, Account.
 *
 * Guards the whole app section — unauthenticated users are redirected to the
 * language/login flow.
 */
import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Loading } from '@/components';
import { colors } from '@/theme/colors';

export default function TabsLayout() {
  const { session, profile, loading, isAdmin } = useAuth();
  const { t } = useLanguage();

  if (loading) return <Loading />;
  if (!session || !profile) return <Redirect href="/language" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="workspace"
        options={{
          title: t('workspace'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="files"
        options={{
          title: t('files'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: t('activity'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="pulse-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          // Admins see analytics-leaning content; employees see notifications.
          title: isAdmin ? t('analytics') : t('notifications'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons
              name={isAdmin ? 'analytics-outline' : 'notifications-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('account'),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
