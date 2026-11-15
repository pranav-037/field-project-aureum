import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi, formatAuthError } from '../services/api';
import { emailSchema } from '../schemas/authSchemas';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice(null);
    setError(null);

    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setEmailError(validation.error.issues[0]?.message);
      return;
    }

    setEmailError(undefined);
    setLoading(true);
    try {
      await authApi.requestPasswordReset({ email: validation.data });
      setNotice(`If an account exists for ${validation.data}, password reset instructions will be sent.`);
    } catch (requestError: unknown) {
      setError(formatAuthError(requestError, 'Could not request a password reset email.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F17] px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-9">
        <Link to="/" className="text-sm font-bold text-amber-300">Aureum</Link>
        <h1 className="mt-6 text-2xl font-serif text-white">Reset your password</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the email address on your account. We’ll send a link to choose a new password.
        </p>

        {notice && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200" role="status">
            {notice}
          </div>
        )}
        {error && (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor="reset-email" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Email address
            </label>
            <input
              id="reset-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setEmailError(undefined);
              }}
              onBlur={() => {
                const result = emailSchema.safeParse(email);
                setEmailError(result.success ? undefined : result.error.issues[0]?.message);
              }}
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? 'reset-email-error' : undefined}
              disabled={loading}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {emailError && <p id="reset-email-error" className="mt-1 text-xs text-rose-300" role="alert">{emailError}</p>}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Remembered your password? <Link to="/login" className="font-semibold text-indigo-300">Sign in</Link>
        </p>
      </div>
    </main>
  );
};

export default ForgotPasswordPage;
