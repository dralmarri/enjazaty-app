/**
 * AuthContext — wraps Supabase auth + the users_profile record.
 *
 * Exposes the current session, the loaded profile, role helpers, and the
 * sign-in / sign-up / sign-out actions used across the app.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UserProfile, UserRole } from '@/types/database';

interface SignUpParams {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  jobTitle?: string;
  phone?: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Generates a human-friendly unique user code, e.g. "EMP-AB12CD". */
function generateUserCode(role: UserRole): string {
  const prefix = role === 'admin' ? 'ADM' : 'EMP';
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  /** Load the users_profile row for the signed-in user. */
  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[Auth] Failed to load profile:', error.message);
      setProfile(null);
      return;
    }
    setProfile(data as UserProfile);
  }, []);

  // Bootstrap: read existing session and subscribe to auth changes.
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          await loadProfile(newSession.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
  }, []);

  const signUp = useCallback(
    async ({ email, password, fullName, role, jobTitle, phone }: SignUpParams) => {
      // 1) Create the auth user.
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { full_name: fullName, role } },
      });
      if (error) throw error;

      const user = data.user;
      if (!user) {
        // Email confirmation flow — no immediate session/profile to create.
        return;
      }

      // 2) Create the matching users_profile record.
      const { error: profileError } = await supabase
        .from('users_profile')
        .insert({
          id: user.id,
          user_code: generateUserCode(role),
          full_name: fullName,
          email: email.trim(),
          role,
          job_title: jobTitle ?? null,
          phone: phone ?? null,
        });
      if (profileError) throw profileError;

      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      signIn,
      signUp,
      signOut,
      refreshProfile,
    }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
