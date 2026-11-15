import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGoogleAuth } from '../hooks/useGoogleAuth';
import { useAuth } from '../context/AuthContext';
import { requestEmailOtp } from '../services/emailOtp';
import {
  emailSchema,
  fullNameSchema,
  institutionNameSchema,
  otpRegistrationSchema,
  signupPasswordSchema,
} from '../schemas/authSchemas';

function getDashboardPath(role?: string): string {
  if (role === 'ADMIN' || role === 'AUTHENTICATOR') return '/institution/dashboard';
  if (role === 'COLLECTOR') return '/collector/dashboard';
  return '/profile';
}

type RegistrationField = 'fullName' | 'email' | 'password' | 'confirmPassword' | 'institutionName';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<RegistrationField, string>>>({});
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const currentRole = formData.userType === 'institution' ? 'AUTHENTICATOR' : 'COLLECTOR';

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
    if (['fullName', 'email', 'password', 'confirmPassword', 'institutionName'].includes(fieldName)) {
      setFieldErrors((previous) => ({
        ...previous,
        [fieldName as RegistrationField]: undefined,
      }));
    }
    setError(null);
  };

  const validateField = (field: RegistrationField) => {
    let messages: string[] = [];

    if (field === 'fullName') {
      const result = fullNameSchema.safeParse(formData.fullName);
      if (!result.success) messages = result.error.issues.map((issue) => issue.message);
    } else if (field === 'email') {
      const result = emailSchema.safeParse(formData.email);
      if (!result.success) messages = result.error.issues.map((issue) => issue.message);
    } else if (field === 'password') {
      const result = signupPasswordSchema.safeParse(formData.password);
      if (!result.success) messages = result.error.issues.map((issue) => issue.message);
    } else if (field === 'confirmPassword') {
      if (!formData.confirmPassword) messages = ['Confirm your password.'];
      else if (formData.password !== formData.confirmPassword) messages = ['Passwords do not match.'];
    } else if (field === 'institutionName' && formData.userType === 'institution') {
      const result = institutionNameSchema.safeParse(formData.institutionName);
      if (!result.success) messages = result.error.issues.map((issue) => issue.message);
    }

    setFieldErrors((previous) => ({
      ...previous,
      [field]: messages.length > 0 ? [...new Set(messages)].join(' ') : undefined,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const validation = otpRegistrationSchema.safeParse(formData);
    if (!validation.success) {
      const nextErrors: Partial<Record<RegistrationField, string>> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0];
        if (
          field === 'fullName' ||
          field === 'email' ||
          field === 'password' ||
          field === 'confirmPassword' ||
          field === 'institutionName'
        ) {
          nextErrors[field] = nextErrors[field]
            ? `${nextErrors[field]} ${issue.message}`
            : issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const role = validation.data.userType === 'institution' ? 'AUTHENTICATOR' : 'COLLECTOR';
      await requestEmailOtp(validation.data.email, {
        shouldCreateUser: true,
        data: {
          name: validation.data.fullName,
          role,
          accountType: validation.data.userType,
          institutionName: validation.data.institutionName ?? '',
        },
      });
      navigate(`/verify-otp?email=${encodeURIComponent(validation.data.email)}`);
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Could not send a verification code.');
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
              <form onSubmit={handleSubmit} noValidate autoComplete="off" className="space-y-4 text-left">
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
                      minLength={2}
                      maxLength={100}
                      autoComplete="name"
                      value={formData.fullName}
                      onChange={handleChange}
                      onBlur={() => validateField('fullName')}
                      aria-invalid={Boolean(fieldErrors.fullName)}
                      aria-describedby={fieldErrors.fullName ? 'register-name-error' : undefined}
                      disabled={loading}
                      placeholder="Your full legal name"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />
                  </div>
                  {fieldErrors.fullName && (
                    <p id="register-name-error" className="mt-1 text-xs text-rose-300" role="alert">
                      {fieldErrors.fullName}
                    </p>
                  )}
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
                      maxLength={254}
                      autoComplete="off"
                      value={formData.email}
                      onChange={handleChange}
                      onBlur={() => validateField('email')}
                      aria-invalid={Boolean(fieldErrors.email)}
                      aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                      disabled={loading}
                      placeholder="yourname@domain.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                    />
                  </div>
                  {fieldErrors.email && (
                    <p id="register-email-error" className="mt-1 text-xs text-rose-300" role="alert">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <p className="text-xs text-slate-400">
                  We’ll email a 6-digit code to verify your address and create your account.
                </p>

                {/* Password Field with Show/Hide Toggle */}
                <div className="hidden">
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
                      minLength={8}
                      autoComplete="new-password"
                      value={formData.password}
                      onChange={handleChange}
                      onBlur={() => validateField('password')}
                      aria-invalid={Boolean(fieldErrors.password)}
                      aria-describedby={fieldErrors.password ? 'register-password-error' : 'register-password-hint'}
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
                  <p id="register-password-hint" className="mt-1 text-[11px] text-slate-400">
                    Use at least 8 characters with uppercase, lowercase, number, and special character.
                  </p>
                  {fieldErrors.password && (
                    <p id="register-password-error" className="mt-1 text-xs text-rose-300" role="alert">
                      {fieldErrors.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field with Show/Hide Toggle */}
                <div className="hidden">
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
                      onBlur={() => validateField('confirmPassword')}
                      aria-invalid={Boolean(fieldErrors.confirmPassword)}
                      aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-error' : undefined}
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
                  {fieldErrors.confirmPassword && (
                    <p id="register-confirm-error" className="mt-1 text-xs text-rose-300" role="alert">
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
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
                          required
                          minLength={2}
                          maxLength={120}
                          value={formData.institutionName}
                          onChange={handleChange}
                          onBlur={() => validateField('institutionName')}
                          aria-invalid={Boolean(fieldErrors.institutionName)}
                          aria-describedby={fieldErrors.institutionName ? 'register-institution-error' : undefined}
                          disabled={loading}
                          placeholder="e.g., Sotheby's, Christie's, or your gallery name"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                        />
                      </div>
                      {fieldErrors.institutionName && (
                        <p id="register-institution-error" className="mt-1 text-xs text-rose-300" role="alert">
                          {fieldErrors.institutionName}
                        </p>
                      )}
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
                        <span>Sending verification code...</span>
                      </>
                    ) : (
                      <span>Send verification code</span>
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