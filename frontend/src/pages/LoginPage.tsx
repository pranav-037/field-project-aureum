import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useAuth } from '../context/AuthContext';
import { emailSchema } from '../schemas/authSchemas';
import { requestEmailOtp } from '../services/emailOtp';

function getDashboardPath(role?: string): string {
  if (role === 'ADMIN' || role === 'AUTHENTICATOR') return '/institution/dashboard';
  if (role === 'COLLECTOR') return '/collector/dashboard';
  return '/profile';
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'email', string>>>({});
  const [isInstitution, setIsInstitution] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const currentRole = isInstitution ? 'AUTHENTICATOR' : 'COLLECTOR';

  useEffect(() => {
    if (!authLoading && user) {
      navigate(getDashboardPath(user.role), { replace: true });
    }
  }, [authLoading, navigate, user]);

  const { isConfigured, renderButton } = useGoogleAuth({
    role: currentRole,
    onSuccess: ({ role }) => {
      navigate(getDashboardPath(role), { replace: true });
    },
    onError: (msg) => setError(msg),
  });

  // Re-render the Google button whenever role changes or ref mounts
  useEffect(() => {
    if (isConfigured && googleBtnRef.current) {
      renderButton(googleBtnRef.current);
    }
  }, [isConfigured, renderButton, isInstitution]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const validation = emailSchema.safeParse(email);
    if (!validation.success) {
      setFieldErrors({ email: validation.error.issues[0]?.message });
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await requestEmailOtp(validation.data, { shouldCreateUser: false });
      navigate(`/verify-otp?email=${encodeURIComponent(validation.data)}`);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to send a sign-in code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Minimal Navigation */}
      <header className="w-full border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={user ? getDashboardPath(user.role) : '/'} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-500 p-[1.5px] shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition">
              <div className="w-full h-full bg-[#0B0F17] rounded-[6px] flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight text-white font-display flex items-center gap-2">
              Aureum
              <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-300 border border-gold-500/30 uppercase tracking-widest">
                Artchain
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4 text-sm">
            <Link to="/verify" className="text-slate-400 hover:text-gold-300 transition text-xs sm:text-sm">
              Public Ledger
            </Link>
            <span className="text-slate-700">|</span>
            <Link to="/register" className="text-gold-400 hover:text-gold-300 font-medium text-xs sm:text-sm">
              Create Account
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-gold-500/30 shadow-2xl backdrop-blur-2xl p-6 sm:p-9 transition">
              
              {/* Card Header */}
              <div className="mb-6 text-left">
                <span className="text-[10px] uppercase tracking-[0.2em] font-display font-semibold text-gold-400">
                  SECURE VAULT ACCESS
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-light text-white tracking-tight mt-1">
                  Welcome to Aureum
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Authenticate your identity to manage verified artworks and custodial signatures.
                </p>
              </div>

              {/* Segmented Account-Type Control */}
              <div className="mb-6 p-1 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 gap-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={isInstitution}
                  onClick={() => setIsInstitution(true)}
                  className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    isInstitution
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  Institution
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={!isInstitution}
                  onClick={() => setIsInstitution(false)}
                  className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    !isInstitution
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  Collector
                </button>
              </div>

              {/* Error Feedback Banner */}
              {error && (
                <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 text-left" role="alert">
                  <svg className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              {/* Google Sign-In */}
              {isConfigured && (
                <div className="mb-4">
                  <div ref={googleBtnRef} className="w-full flex justify-center" />
                  <div className="flex items-center gap-3 mt-5 mb-5">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-500 font-medium">or continue with email</span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4 text-left">
                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      type="email"
                      required
                      maxLength={254}
                      autoComplete="email"
                      value={email}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setFieldErrors((previous) => ({ ...previous, email: undefined }));
                        setError(null);
                      }}
                      onBlur={() => {
                        const result = emailSchema.safeParse(email);
                        setFieldErrors((previous) => ({
                          ...previous,
                          email: result.success ? undefined : result.error.issues[0]?.message,
                        }));
                      }}
                      disabled={loading}
                      placeholder="curator@gallery.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p id="login-email-error" className="mt-1 text-xs text-rose-300" role="alert">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs text-slate-400">
                      We’ll email you a 6-digit code to sign in.
                    </p>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-gold-500 via-amber-500 to-gold-600 hover:from-gold-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-gold-500/20 hover:shadow-gold-500/40 hover:-translate-y-0.5 active:translate-y-0 transition duration-150 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Sending sign-in code...</span>
                      </>
                    ) : (
                      <span>Send sign-in code</span>
                    )}
                  </button>
                </div>

                {/* Footer Links */}
                <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400 space-y-2">
                  <p>
                    Don't have an account?{' '}
                    <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
                      Register here
                    </Link>
                  </p>
                </div>
              </form>
            </div>
          </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Aureum Artchain Protocol. All rights reserved.
      </footer>
    </div>
  );
};

export default LoginPage;