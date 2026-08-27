/**
 * AuthContext — wraps Supabase auth + the users_profile record for تقني.
 *
 * Registration is open/direct for all active roles (designer, coordinator,
 * supervisor) — no manual approval step. A newly-registered designer gets an
 * internal status of "pending" (NOT an access gate — see spec) while
 * coordinator/supervisor start "active". The chosen role can never change
 * for a given email — enforced server-side by a DB trigger (see
 * supabase/migration_v1_role_lock.sql), not just here.
 *
 * NOTE: this assumes Supabase Auth email confirmations are OFF for the
 * تقني project (same as Enjazaty — the free tier can't send OTP), so
 * `signUp` returns a session immediately and the profile row is created in
 * the same call. If confirmations are ever turned on, `signUp` will need a
 * verify-otp step added, same pattern as the sibling Enjazaty app.
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
import type {
  DesignerJobTitle,
  DesignerStatus,
  SchoolStage,
  UserProfile,
  UserRole,
} from '@/types/database';

export interface SignUpParams {
  email: string;
  password: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  jobTitle?: DesignerJobTitle;
  region?: string;
  educationStage?: SchoolStage;
  schoolId?: string;
  educationalRegion?: string;
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: SignUpParams) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function generateUserCode(role: UserRole): string {
  const prefix =
    role === 'designer'
      ? 'DSG'
      : role === 'coordinator'
        ? 'CRD'
        : role === 'supervisor'
          ? 'SUP'
          : 'MGR';
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[Auth] Failed to load profile:', error.message);
      return;
    }
    setProfile((data as UserProfile) ?? null);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) await loadProfile(data.session.user.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        await loadProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
    });

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

  const signUp = useCallback(async (params: SignUpParams) => {
    const { data, error } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password,
      options: { data: { role: params.role } },
    });
    if (error) {
      if (/already.*registered|registered.*already/i.test(error.message)) {
        throw new Error('EMAIL_TAKEN');
      }
      throw error;
    }
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      throw new Error('EMAIL_TAKEN');
    }
    const user = data.user;
    if (!user) throw new Error('SIGNUP_FAILED');

    const status: DesignerStatus = params.role === 'designer' ? 'pending' : 'active';

    const { error: profileError } = await supabase.from('users_profile').insert({
      id: user.id,
      user_code: generateUserCode(params.role),
      full_name: params.fullName,
      email: user.email ?? params.email,
      phone: params.phone ?? null,
      role: params.role,
      job_title: params.jobTitle ?? null,
      educational_region: params.educationalRegion ?? null,
      school_id: params.schoolId ?? null,
      education_stage: params.educationStage ?? null,
      status,
    });
    if (profileError) throw profileError;

    if (data.session) {
      setSession(data.session);
      await loadProfile(user.id);
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({ session, profile, loading, signIn, signUp, signOut, refreshProfile }),
    [session, profile, loading, signIn, signUp, signOut, refreshProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
