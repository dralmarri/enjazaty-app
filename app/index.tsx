/**
 * Entry router — decides where to send the user on launch:
 *  - still loading auth/language  -> spinner
 *  - signed in                    -> workspace (tabs)
 *  - signed out                   -> language selection screen
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Loading } from '@/components';

export default function Index() {
  const { session, profile, loading: authLoading } = useAuth();
  const { loading: langLoading } = useLanguage();

  if (authLoading || langLoading) {
    return <Loading />;
  }

  // Signed in with a profile -> go straight to the workspace.
  if (session && profile) {
    return <Redirect href="/(tabs)/workspace" />;
  }

  // Otherwise start the onboarding flow at language selection.
  return <Redirect href="/language" />;
}
