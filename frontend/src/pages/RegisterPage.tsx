import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { authApi, formatAuthError } from '../services/api';

/** Returns the dashboard path for the stored user, or null if not logged in */
function getLoggedInDashboard(): string | null {
  try {
    const token = localStorage.getItem('aureum_token');
    const userRaw = localStorage.getItem('aureum_user');
    if (!token || !userRaw) return null;
    const user = JSON.parse(userRaw) as { role?: string };
    const role = user?.role || '';
    if (role === 'ADMIN' || role === 'AUTHENTICATOR') return '/institution/dashboard';
    return '/collector/dashboard';
  } catch {
    return null;
  }
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    userType: 'institution', // or 'collector'
    institutionName: '',
    jurisdiction: '',
    registrationNumber: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const currentRole = formData.userType === 'institution' ? 'AUTHENTICATOR' : 'COLLECTOR';

  const { isConfigured, renderButton } = useGoogleAuth({
    role: currentRole,
    onSuccess: (data) => {
      const role = (data.user as { role?: string })?.role || '';
      if (role === 'AUTHENTICATOR' || role === 'ADMIN') {
        navigate('/institution/dashboard');
      } else {
        navigate('/collector/dashboard');
      }
    },
    onError: (msg) => setError(msg),
  });

  useEffect(() => {
    if (isConfigured && googleBtnRef.current) {
      renderButton(googleBtnRef.current);
    }
  }, [isConfigured, renderButton, formData.userType]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, id, value, type } = e.target;
    const fieldName = name || id;

    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [fieldName]: (e.target as HTMLInputElement).checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldName]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Precise client-side validation
    const trimmedName = formData.fullName.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      setLoading(false);
      return;
    }

    if (trimmedName.length < 2) {
      setError('Full name must be at least 2 characters long.');
      setLoading(false);
      return;
    }

    if (!trimmedEmail) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Please enter a valid email address (e.g. name@example.com).');
      setLoading(false);
      return;
    }

    if (!formData.password) {
      setError('Please enter a password.');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match. Please verify your confirm password.');
      setLoading(false);
      return;
    }

    if (formData.userType === 'institution' && !formData.institutionName.trim()) {
      setError('Institution name is required for institution accounts.');
      setLoading(false);
      return;
    }

    try {
      const res = await authApi.register({
        fullName: trimmedName,
        email: trimmedEmail,
        password: formData.password,
        userType: formData.userType,
        role: formData.userType === 'institution' ? 'AUTHENTICATOR' : 'COLLECTOR',
      });

      if (res.data?.token) {
        localStorage.setItem('aureum_token', res.data.token);
        localStorage.setItem('aureum_user', JSON.stringify(res.data.user));
        if (formData.userType === 'institution') {
          navigate('/institution/dashboard');
        } else {
          navigate('/collector/dashboard');
        }
      } else {
        navigate('/login');
      }
    } catch (err: any) {
      const exactMsg = formatAuthError(err, 'Registration could not be completed.');
      setError(exactMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Minimal Navigation */}
      <header className="w-full border-b border-slate-800/80 bg-[#0B0F17]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link to={getLoggedInDashboard() ?? '/'} className="flex items-center gap-2.5 group">
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
            <Link to="/login" className="text-gold-400 hover:text-gold-300 font-medium text-xs sm:text-sm">
              Sign in
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 py-10">
        <div className="w-full max-w-md mx-auto">
          <div className="rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-gold-500/30 shadow-2xl backdrop-blur-2xl p-6 sm:p-9 transition">

              {/* Card Header */}
              <div className="mb-6 text-center">
                <span className="text-[10px] uppercase tracking-[0.2em] font-display font-semibold text-gold-400">
                  PROTOCOL ONBOARDING
                </span>
                <h2 className="text-2xl sm:text-3xl font-serif font-light text-white tracking-tight mt-1">
                  Create Sovereign Account
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  Join our network of accredited authenticators and sovereign art collectors
                </p>
              </div>

              {/* Segmented Account-Type Control */}
              <div className="mb-6 p-1 rounded-xl bg-slate-950/80 border border-slate-800 grid grid-cols-2 gap-1" role="tablist">
                <button
                  type="button"
                  role="tab"
                  aria-selected={formData.userType === 'institution'}
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'institution' }))}
                  className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    formData.userType === 'institution'
                      ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                  }`}
                >
                  Institution
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={formData.userType === 'collector'}
                  onClick={() => setFormData(prev => ({ ...prev, userType: 'collector' }))}
                  className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 cursor-pointer ${
                    formData.userType === 'collector'
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

              {/* Google Sign-Up */}
              {isConfigured && (
                <div className="mb-4">
                  <div ref={googleBtnRef} className="w-full flex justify-center" />
                  <div className="flex items-center gap-3 mt-5 mb-5">
                    <div className="flex-1 h-px bg-slate-800" />
                    <span className="text-xs text-slate-500 font-medium">or register with email</span>
                    <div className="flex-1 h-px bg-slate-800" />
                  </div>
                </div>
              )}

              {/* Registration Form */}
              <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4 text-left">
                {/* Full Name Field */}
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      autoComplete="name"
                      value={formData.fullName}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="Your full legal name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      autoComplete="off"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="yourname@domain.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />
                  </div>
                </div>

                {/* Password Field with Show/Hide Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Password
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Field with Show/Hide Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="confirmPassword" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      Confirm Password
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      disabled={loading}
                      placeholder="••••••••••••"
                      className="w-full px-3.5 py-2.5 pr-10 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />
                    <button
                      type="button"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition p-1"
                    >
                      {showConfirmPassword ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {/* Institution Details (Conditional) */}
                {formData.userType === 'institution' && (
                  <>
                    {/* Institution Name */}
                    <div>
                      <label htmlFor="institutionName" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                        Institution Name
                      </label>
                      <div className="relative">
                        <input
                          id="institutionName"
                          name="institutionName"
                          type="text"
                          value={formData.institutionName}
                          onChange={handleChange}
                          disabled={loading}
                          placeholder="e.g., Sotheby's, Christie's, or your gallery name"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        />
                      </div>
                    </div>

                    {/* Jurisdiction & Registration Number Group */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6">
                      {/* Jurisdiction */}
                      <div>
                        <label htmlFor="jurisdiction" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                          Jurisdiction
                        </label>
                        <div className="relative">
                          <input
                            id="jurisdiction"
                            name="jurisdiction"
                            type="text"
                            value={formData.jurisdiction}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Country and/or state"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                          />
                        </div>
                      </div>

                      {/* Registration Number */}
                      <div>
                        <label htmlFor="registrationNumber" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                          Registration Number
                        </label>
                        <div className="relative">
                          <input
                            id="registrationNumber"
                            name="registrationNumber"
                            type="text"
                            value={formData.registrationNumber}
                            onChange={handleChange}
                            disabled={loading}
                            placeholder="Business registration or license number"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

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
                        <span>Establishing Sovereign Account...</span>
                      </>
                    ) : (
                      <span>Complete Registration</span>
                    )}
                  </button>
                </div>

                {/* Footer Links */}
                <div className="pt-4 border-t border-slate-800 text-center text-xs text-slate-400 space-y-2">
                  <p>
                    Already have an account?{' '}
                    <Link to="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition">
                      Sign in here
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

export default RegisterPage;