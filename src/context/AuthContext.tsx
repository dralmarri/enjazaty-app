/**
 * AuthContext — wraps Supabase auth + the users_profile record.
 *
 * Flow: signUp(email,password,role) → email OTP → verifyOtp → completeProfile.
 * The chosen role is stored in the auth user metadata so it survives the OTP
 * step (and app restarts) until the profile row is created.
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

interface CompleteProfileParams {
  fullName: string;
  jobTitle?: string;
  educationalRegion?: string;
  workCenter?: string; // employees
  administration?: string; // admins
}

interface AuthContextValue {
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  /** True when signed in but the profile row hasn't been created yet. */
  needsProfile: boolean;
  /** The role chosen during signup (from auth metadata). */
  pendingRole: UserRole | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    role: UserRole
  ) => Promise<{ needsVerification: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  completeProfile: (params: CompleteProfileParams) => Promise<void>;
  signOut: () => Promise<void>;
  /** Permanently delete the account + all data, then sign out. */
  deleteAccount: () => Promise<void>;
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
  // True once a profile query has completed WITHOUT error (whether or not a row
  // exists). Guards against a transient query failure being mistaken for "no
  // profile yet" and wrongly routing an existing user into complete-profile.
  const [profileChecked, setProfileChecked] = useState(false);

  /** Load the users_profile row for the signed-in user. */
  const loadProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('users_profile')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      // eslint-disable-next-line no-console
      console.warn('[Auth] Failed to load profile:', error.message);
      // Do NOT mark as checked — a transient failure must not look like a
      // missing profile row.
      setProfileChecked(false);
      return;
    }
    setProfile((data as UserProfile) ?? null);
    setProfileChecked(true);
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
          setProfileChecked(false);
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
    async (email: string, password: string, role: UserRole) => {
      // Role is stored in metadata so it survives the OTP verification step.
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { role } },
      });
      // One email = one account = one role, forever. Signing up again with a
      // registered email must fail with a clear, translatable error.
      if (error) {
        if (/already.*registered|registered.*already/i.test(error.message)) {
          throw new Error('EMAIL_TAKEN');
        }
        throw error;
      }
      // With confirmations enabled Supabase obfuscates duplicates: it
      // "succeeds" but returns a user with no identities.
      if (data.user && (data.user.identities?.length ?? 0) === 0) {
        throw new Error('EMAIL_TAKEN');
      }
      // If email confirmation is enabled there is no session yet → verify OTP.
      return { needsVerification: !data.session };
    },
    []
  );

  const verifyOtp = useCallback(async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: token.trim(),
      type: 'signup',
    });
    if (error) throw error;
  }, []);

  const resendOtp = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
    });
    if (error) throw error;
  }, []);

  const completeProfile = useCallback(
    async ({
      fullName,
      jobTitle,
      educationalRegion,
      workCenter,
      administration,
    }: CompleteProfileParams) => {
      const user = session?.user;
      if (!user) throw new Error('No authenticated user');
      const role = (user.user_metadata?.role as UserRole) ?? 'employee';

      const { error } = await supabase.from('users_profile').insert({
        id: user.id,
        user_code: generateUserCode(role),
        full_name: fullName,
        email: user.email ?? '',
        role,
        job_title: jobTitle ?? null,
        educational_region: educationalRegion ?? null,
        work_center: workCenter ?? null,
        administration: administration ?? null,
      });
      if (error) throw error;
      await loadProfile(user.id);
    },
    [session, loadProfile]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setSession(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    // Server-side RPC removes the profile (cascading all data) + the login.
    const { error } = await supabase.rpc('delete_my_account');
    if (error) throw error;
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
      // Only prompt for profile creation once we've CONFIRMED (no error) that
      // no row exists — never on a transient load failure.
      needsProfile: !!session && !profile && profileChecked,
      pendingRole: (session?.user?.user_metadata?.role as UserRole) ?? null,
      signIn,
      signUp,
      verifyOtp,
      resendOtp,
      completeProfile,
      signOut,
      deleteAccount,
      refreshProfile,
    }),
    [
      session,
      profile,
      loading,
      profileChecked,
      signIn,
      signUp,
      verifyOtp,
      resendOtp,
      completeProfile,
      signOut,
      deleteAccount,
      refreshProfile,
    ]
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
