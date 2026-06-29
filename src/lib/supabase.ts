/**
 * Supabase client singleton.
 *
 * Reads credentials from Expo public env vars (EXPO_PUBLIC_*). On native we
 * persist the auth session in AsyncStorage; on web Supabase falls back to
 * localStorage automatically.
 */
import 'react-native-url-polyfill/auto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseAnonKey) {
  // Helpful warning during development if the .env file is missing.
  // eslint-disable-next-line no-console
  console.warn(
    '[Supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and fill in your Supabase project values.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage on native; web uses its default (localStorage).
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // URL detection is only relevant on web for OAuth redirects.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/** True when the app has been configured with real Supabase credentials. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
