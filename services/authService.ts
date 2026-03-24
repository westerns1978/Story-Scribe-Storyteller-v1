// services/authService.ts
// ============================================
// Supabase Auth for Story Scribe
// Email/password + magic link support
// User session persists across browser refreshes
// ============================================

import { supabase } from './supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email: string;
  display_name?: string;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email ?? '',
    display_name: user.user_metadata?.display_name ?? user.email?.split('@')[0] ?? 'Guest',
  };
}

// ─── Sign Up ──────────────────────────────────────────────────────────────────

export async function signUp(
  email: string,
  password: string,
  displayName?: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      data: { display_name: displayName || email.split('@')[0] },
    },
  });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Sign up failed — please try again.' };

  return { user: toAuthUser(data.user), error: null };
}

// ─── Sign In ──────────────────────────────────────────────────────────────────

export async function signIn(
  email: string,
  password: string
): Promise<{ user: AuthUser | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });

  if (error) return { user: null, error: error.message };
  if (!data.user) return { user: null, error: 'Sign in failed — please try again.' };

  return { user: toAuthUser(data.user), error: null };
}

// ─── Magic Link (passwordless) ────────────────────────────────────────────────

export async function sendMagicLink(
  email: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { shouldCreateUser: true },
  });
  return { error: error?.message ?? null };
}

// ─── Sign Out ─────────────────────────────────────────────────────────────────

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

// ─── Get current user (sync from session) ─────────────────────────────────────

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return toAuthUser(data.user);
}

// ─── Subscribe to auth state changes ──────────────────────────────────────────
// Call this once in App.tsx to keep auth state in sync

export function onAuthChange(
  callback: (user: AuthUser | null) => void
): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session: Session | null) => {
      callback(session?.user ? toAuthUser(session.user) : null);
    }
  );
  return () => subscription.unsubscribe();
}

// ─── Reset password ───────────────────────────────────────────────────────────

export async function resetPassword(email: string): Promise<{ error: string | null }> {
  const { error } = await supabase.auth.resetPasswordForEmail(
    email.trim().toLowerCase()
  );
  return { error: error?.message ?? null };
}
