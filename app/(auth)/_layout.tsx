/**
 * Auth stack layout. Redirects already-signed-in users to the workspace.
 */
import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Loading } from '@/components';

export default function AuthLayout() {
  const { session, profile, loading } = useAuth();

  if (loading) return <Loading />;
  if (session && profile) return <Redirect href="/(tabs)/workspace" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
