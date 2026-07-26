/**
 * Supabase client singleton.
 *
 * Reads credentials from Expo public env vars (EXPO_PUBLIC_*). On native we
 * persist the auth session in AsyncStorage (a mobile app is expected to stay
 * signed in). On web, the "remember me" choice on login/signup decides
 * whether the session survives closing the browser (localStorage) or not
 * (sessionStorage) — see `rememberMeStorage` below.
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

const REMEMBER_ME_KEY = 'enjazaty-remember-me';

/** Read the "remember me" choice made at the last sign-in/sign-up (web only). Defaults to true. */
export function getRememberMe(): boolean {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return true;
  return window.localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
}

/** Set the "remember me" choice — call BEFORE signIn/signUp so the session is written to the right place. */
export function setRememberMe(remember: boolean): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  window.localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false');
}

/**
 * Web storage adapter that routes every auth key to localStorage (survives
 * closing the browser) or sessionStorage (cleared when the tab/browser
 * closes) depending on the current "remember me" flag.
 */
const rememberMeStorage = {
  getItem: (key: string) => {
    const store = getRememberMe() ? window.localStorage : window.sessionStorage;
    return store.getItem(key);
  },
  setItem: (key: string, value: string) => {
    const store = getRememberMe() ? window.localStorage : window.sessionStorage;
    store.setItem(key, value);
  },
  removeItem: (key: string) => {
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use AsyncStorage on native; the remember-me adapter on web.
    storage: Platform.OS === 'web' ? rememberMeStorage : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    // URL detection is only relevant on web for OAuth redirects.
    detectSessionInUrl: Platform.OS === 'web',
  },
});

/** True when the app has been configured with real Supabase credentials. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
