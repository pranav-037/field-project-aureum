import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import WalletButton from './WalletButton';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    logout();
    setDropdownOpen(false);
    navigate('/login');
  };

  const navLinks = [
    ...(user?.role === 'COLLECTOR' || user?.role === 'ADMIN' || !user
      ? [{ name: 'Collector Vault', path: '/collector/dashboard' }]
      : []),
    ...(user?.role === 'AUTHENTICATOR' || user?.role === 'ADMIN'
      ? [{ name: 'Institution Portal', path: '/institution/dashboard' }]
      : []),
    { name: 'Verify Artwork', path: '/verify', badge: true },
  ];

  const isLinkActive = (path: string) => {
    return location.pathname === path;
  };

  const userInitial = user?.name ? user.name.trim()[0].toUpperCase() : 'U';

  const homeTarget = !isAuthenticated
    ? '/'
    : (user?.role === 'ADMIN' || user?.role === 'AUTHENTICATOR' ? '/institution/dashboard' : '/collector/dashboard');

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B0F17]/85 border-b border-slate-800/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to={homeTarget} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-500 p-[1.5px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition duration-300">
            <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
              <svg
                className="w-5 h-5 text-amber-400 group-hover:scale-110 transition duration-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="12 2 2 7 12 12 22 7 12 2" />
                <polyline points="2 17 12 22 22 17" />
                <polyline points="2 12 12 17 22 12" />
              </svg>
            </div>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5 font-sans">
              Aureum
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-indigo-500/20 text-amber-300 border border-amber-500/30">
                Artchain
              </span>
            </span>
            <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Sovereign Provenance Trail</p>
          </div>
        </Link>

        {/* Center Navigation Links - Profile Dashboard explicitly removed */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          {navLinks.map((link) => {
            const active = isLinkActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-all duration-200 flex items-center gap-2 pb-1 pt-1 ${
                  active
                    ? 'text-white font-semibold border-b-2 border-indigo-500 shadow-[0_1px_0_0_#6366f1]'
                    : 'text-slate-400 hover:text-slate-200 hover:border-b-2 hover:border-slate-700'
                }`}
              >
                {active && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />}
                {link.name}
                {link.badge && !active && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>

        {/* Top-Right Header Section */}
        <div className="flex items-center gap-3">
          {/* Web3 Wallet Button */}
          <WalletButton />

          {!isAuthenticated ? (
            /* Logged-Out State: No avatar or placeholder, display Sign In, Register, Connect Wallet */
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="text-xs sm:text-sm font-medium px-3.5 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/30 transition duration-200"
              >
                Register
              </Link>
            </div>
          ) : (
            /* Logged-In State: Display profile pill with initial avatar, user.name, user.role */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 border border-slate-700/70 hover:border-indigo-500/50 shadow-md transition-all duration-200 group text-left"
                aria-label="User Profile Menu"
              >
                {/* Initial Avatar */}
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                  {userInitial}
                </div>

                {/* Name & Role */}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors truncate max-w-[120px]">
                    {user?.name || 'Collector'}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-mono tracking-wider uppercase text-amber-400 font-semibold">
                      {user?.role || 'COLLECTOR'}
                    </span>
                  </div>
                </div>

                {/* Dropdown Chevron */}
                <svg
                  className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200 transition-transform duration-200 ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* User Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-[#0F172A] border border-slate-700/80 shadow-2xl shadow-black/80 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-slate-800">
                    <p className="text-xs font-medium text-slate-200 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono truncate">{user?.email}</p>
                    <span className="inline-block mt-1 text-[9px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                      {user?.role || 'COLLECTOR'}
                    </span>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-indigo-600/20 hover:text-indigo-300 transition"
                    >
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile Dashboard
                    </Link>

                    {user?.role === 'AUTHENTICATOR' || user?.role === 'ADMIN' ? (
                      <Link
                        to="/institution/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                      >
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Institution Dashboard
                      </Link>
                    ) : (
                      <Link
                        to="/collector/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                      >
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                        </svg>
                        Collector Vault
                      </Link>
                    )}
                  </div>

                  <div className="border-t border-slate-800 pt-1">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition text-left"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            aria-label="Toggle Mobile Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#0B0F17]/95 px-4 py-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                isLinkActive(link.path)
                  ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {isAuthenticated && (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 rounded-lg text-sm font-medium text-amber-300 hover:bg-slate-800"
            >
              Profile Dashboard
            </Link>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
