import { getSupabaseClient } from './supabase';

function getRedirectUrl(path: string): string {
  const siteUrl = import.meta.env.VITE_SITE_URL?.trim() || window.location.origin;
  return new URL(path, siteUrl).toString();
}

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  metadata: Record<string, unknown>,
) {
  const { data, error } = await getSupabaseClient().auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: getRedirectUrl('/auth/callback?flow=signup'),
    },
  });
  if (error) throw error;
  return data;
}

export async function resendSignupVerification(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: getRedirectUrl('/auth/callback?flow=signup'),
    },
  });
  if (error) throw error;
}

export async function requestPasswordReset(email: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl('/reset-password'),
  });
  if (error) throw error;
}

export async function updatePassword(password: string): Promise<void> {
  const { error } = await getSupabaseClient().auth.updateUser({ password });
  if (error) throw error;
}
