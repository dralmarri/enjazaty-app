/**
 * The four tab routes: Home, Activity, Search, Account.
 * The actual bottom bar UI is rendered once, globally, in the root layout
 * (`src/components/GlobalTabBar.tsx`) so it stays fixed on every
 * authenticated screen — not only these four.
 *
 * Guards the whole app section — unauthenticated users are redirected to the
 * onboarding flow; signed-in users without a profile complete it first.
 */
import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Loading } from '@/components';

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/language" />;
  if (!profile) return <Redirect href="/(auth)/complete-profile" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
