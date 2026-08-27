/**
 * Guards the whole authenticated app section — unauthenticated users are
 * redirected to onboarding; the actual bottom bar is rendered globally in
 * app/_layout.tsx so it stays fixed everywhere, not just these routes.
 */
import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Loading } from '@/components';

export default function TabsLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/language" />;
  if (!profile) return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
