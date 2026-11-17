import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { emailSchema } from '../schemas/authSchemas';
import { requestEmailOtp, verifyEmailOtp } from '../services/emailOtp';

function getDashboardPath(role?: unknown): string {
  if (role === 'ADMIN' || role === 'AUTHENTICATOR') return '/institution/dashboard';
  if (role === 'COLLECTOR') return '/collector/dashboard';
  return '/profile';
}

const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const email = emailSchema.safeParse(query.get('email') ?? '');
  const normalizedEmail = email.success ? email.data : '';
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVerify = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!normalizedEmail) {
      setError('The email address is missing or invalid. Return to sign-in and request a new code.');
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }

    setLoading(true);
    try {
      const { user } = await verifyEmailOtp(normalizedEmail, code);
      navigate(getDashboardPath(user.user_metadata?.role), { replace: true });
    } catch (verificationError: unknown) {
      setError(
        verificationError instanceof Error
          ? verificationError.message
          : 'Could not verify the code. Request a new one and try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setNotice(null);
    if (!normalizedEmail) {
      setError('The email address is missing or invalid. Return to sign-in and request a new code.');
      return;
    }

    setLoading(true);
    try {
      await requestEmailOtp(normalizedEmail, { shouldCreateUser: false });
      setNotice('If this email can sign in, a new code has been sent.');
    } catch (resendError: unknown) {
      setError(resendError instanceof Error ? resendError.message : 'Could not resend the code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="aureum-theme min-h-screen bg-[#FAF9F6] px-4 py-12 text-[#18181B]">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-9">
        <Link to="/" className="text-sm font-bold text-amber-300">Aureum</Link>
        <h1 className="mt-6 text-2xl font-serif text-white">Check your email</h1>
        <p className="mt-2 text-sm text-slate-400">
          Enter the 6-digit code sent to {normalizedEmail || 'your email address'}.
        </p>

        {error && (
          <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200" role="alert">
            {error}
          </div>
        )}
        {notice && (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200" role="status">
            {notice}
          </div>
        )}

        <form onSubmit={handleVerify} noValidate className="mt-6 space-y-4">
          <div>
            <label htmlFor="email-otp" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-300">
              Verification code
            </label>
            <input
              id="email-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
              aria-describedby="otp-help"
              disabled={loading}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-center font-mono text-2xl tracking-[0.5em] text-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p id="otp-help" className="mt-1 text-xs text-slate-400">The code expires after a short time.</p>
          </div>
          <button
            type="submit"
            disabled={loading || code.length !== 6 || !normalizedEmail}
            className="w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-slate-950 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify and continue'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleResend}
          disabled={loading || !normalizedEmail}
          className="mt-4 w-full text-center text-sm font-semibold text-indigo-300 disabled:opacity-50"
        >
          Resend code
        </button>
        <p className="mt-5 text-center text-sm text-slate-400">
          Wrong email? <Link to="/login" className="font-semibold text-indigo-300">Go back</Link>
        </p>
      </div>
    </main>
  );
};

export default VerifyOtpPage;
