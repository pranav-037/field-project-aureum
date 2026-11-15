import { getSupabaseClient } from './supabase';

interface EmailOtpOptions {
  shouldCreateUser?: boolean;
  data?: Record<string, string>;
}

export async function requestEmailOtp(email: string, options: EmailOtpOptions = {}): Promise<void> {
  const { error } = await getSupabaseClient().auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: options.shouldCreateUser,
      data: options.data,
    },
  });

  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await getSupabaseClient().auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) throw error;
  if (!data.session || !data.user) {
    throw new Error('Verification succeeded, but Supabase did not return a session.');
  }

  return {
    session: data.session,
    user: data.session.user,
  };
}
