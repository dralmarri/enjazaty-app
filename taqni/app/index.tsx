/**
 * Entry route — routes the user to the right place based on auth state.
 */
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { Loading } from '@/components';

export default function Index() {
  const { session, profile, loading } = useAuth();

  if (loading) return <Loading />;
  if (!session) return <Redirect href="/language" />;
  if (!profile) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/schools" />;
}
