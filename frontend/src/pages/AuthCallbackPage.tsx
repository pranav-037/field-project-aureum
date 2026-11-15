import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthCallbackPage: React.FC = () => {
  const location = useLocation();
  const { user, loading } = useAuth();
  const fragment = new URLSearchParams(location.hash.replace(/^#/, ''));
  const query = new URLSearchParams(location.search);
  const errorMessage =
    fragment.get('error_description') ||
    query.get('error_description') ||
    fragment.get('error') ||
    query.get('error');
  const confirmed = !errorMessage && Boolean(user);

  useEffect(() => {
    if (!loading && (location.hash || location.search)) {
      window.history.replaceState(null, document.title, location.pathname);
    }
  }, [loading, location.hash, location.pathname, location.search]);

  const dashboardPath =
    user?.role === 'ADMIN' || user?.role === 'AUTHENTICATOR'
      ? '/institution/dashboard'
      : user?.role === 'COLLECTOR'
        ? '/collector/dashboard'
        : '/profile';

  return (
    <main className="min-h-screen bg-[#0B0F17] px-4 py-12 text-slate-100">
      <div className="mx-auto max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl sm:p-9">
        <Link to="/" className="text-sm font-bold text-amber-300">Aureum</Link>
        <div
          className={`mt-6 rounded-xl border p-4 text-sm ${
            confirmed
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : errorMessage
                ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                : 'border-slate-700 bg-slate-800/50 text-slate-300'
          }`}
          role={confirmed || loading ? 'status' : 'alert'}
        >
          {loading
            ? 'Verifying your email...'
            : confirmed
              ? 'Your email has been verified.'
              : errorMessage || 'This verification link is invalid or expired. Request a new one from the registration page.'}
        </div>
        <Link to={confirmed ? dashboardPath : '/register'} className="mt-5 inline-block font-semibold text-indigo-300">
          {confirmed ? 'Continue to your account' : 'Return to registration'}
        </Link>
      </div>
    </main>
  );
};

export default AuthCallbackPage;
