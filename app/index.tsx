/**
 * Entry router — decides where to send the user on launch:
 *  - still loading            -> spinner
 *  - signed in + profile      -> workspace (tabs)
 *  - signed in, no profile yet -> complete the job profile
 *  - signed out               -> language selection screen
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { Loading } from '@/components';

export default function Index() {
  const { session, profile, needsProfile, loading: authLoading } = useAuth();
  const { loading: langLoading } = useLanguage();

  if (authLoading || langLoading) {
    return <Loading />;
  }

  if (session && profile) {
    return <Redirect href="/(tabs)/workspace" />;
  }

  // Verified email but profile not created yet.
  if (needsProfile) {
    return <Redirect href="/(auth)/complete-profile" />;
  }

  return <Redirect href="/language" />;
}
