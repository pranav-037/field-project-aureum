import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signupPasswordSchema } from '../schemas/authSchemas';
import { updatePassword } from '../services/supabaseAuth';

const ResetPasswordPage: React.FC = () => {
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'password' | 'confirmPassword', string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && (location.hash || location.search)) {
      window.history.replaceState(null, document.title, location.pathname);
    }
  }, [authLoading, location.hash, location.pathname, location.search]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const nextErrors: Partial<Record<'password' | 'confirmPassword', string>> = {};
    const passwordResult = signupPasswordSchema.safeParse(password);
    if (!passwordResult.success) {
      nextErrors.password = [...new Set(passwordResult.error.issues.map((issue) => issue.message))].join(' ');
    }
    if (!confirmPassword) {
      nextErrors.confirmPassword = 'Confirm your new password.';
    } else if (password !== confirmPassword) {
      nextErrors.confirmPassword = 'Passwords do not match.';
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await updatePassword(password);
      setSuccess(true);
    } catch (resetError: unknown) {
      setError(resetError instanceof Error ? resetError.message : 'Could not update your password. Request a new reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0B0F17] px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-9">
        <Link to="/" className="text-sm font-bold text-amber-300">Aureum</Link>
        <h1 className="mt-6 text-2xl font-serif text-white">Choose a new password</h1>

        {success ? (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200" role="status">
            <p>Your password has been updated.</p>
            <Link to="/profile" className="mt-3 inline-block font-semibold text-indigo-300">Continue to your account</Link>
          </div>
        ) : authLoading ? (
          <p className="mt-5 text-sm text-slate-400" role="status">Checking your password reset link...</p>
        ) : !user ? (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
            <p>This password reset link is invalid or expired. Request a new one.</p>
            <Link to="/forgot-password" className="mt-3 inline-block font-semibold text-indigo-300">Request a new reset link</Link>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm text-slate-400">
              Use at least 8 characters with uppercase, lowercase, a number, and a special character.
            </p>
            {error && (
              <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200" role="alert">
                {error}
              </div>
            )}
            <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setFieldErrors((previous) => ({ ...previous, password: undefined }));
                  }}
                  onBlur={() => {
                    const result = signupPasswordSchema.safeParse(password);
                    setFieldErrors((previous) => ({
                      ...previous,
                      password: result.success
                        ? undefined
                        : [...new Set(result.error.issues.map((issue) => issue.message))].join(' '),
                    }));
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'new-password-error' : undefined}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fieldErrors.password && <p id="new-password-error" className="mt-1 text-xs text-rose-300" role="alert">{fieldErrors.password}</p>}
              </div>
              <div>
                <label htmlFor="confirm-new-password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Confirm new password
                </label>
                <input
                  id="confirm-new-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value);
                    setFieldErrors((previous) => ({ ...previous, confirmPassword: undefined }));
                  }}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? 'confirm-new-password-error' : undefined}
                  disabled={loading}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-3.5 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {fieldErrors.confirmPassword && <p id="confirm-new-password-error" className="mt-1 text-xs text-rose-300" role="alert">{fieldErrors.confirmPassword}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
};

export default ResetPasswordPage;
