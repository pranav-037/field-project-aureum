import { useEffect, useRef, useState } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Landmark, LogOut, Menu, Moon, ShieldCheck, Sun, UserRound, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import WalletButton from './WalletButton';

const ThemeSwitch = ({ expanded = false }: { expanded?: boolean }) => {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === 'light' ? 'dark' : 'light';
  const Icon = theme === 'light' ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      aria-pressed={theme === 'dark'}
      title={`Switch to ${nextTheme} mode`}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#DCD6CC] bg-white text-[#09090B] transition hover:bg-[#FDF6EC] dark:border-[#24302C] dark:bg-[#131A18] dark:text-[#F8FAFC] dark:hover:bg-[#1A2420] ${
        expanded ? 'w-full justify-between px-4' : 'w-11'
      }`}
    >
      {expanded && <span className="text-sm font-semibold">{theme === 'light' ? 'Dark appearance' : 'Light appearance'}</span>}
      <Icon className="h-4 w-4" aria-hidden="true" />
    </button>
  );
};

export const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: globalThis.MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };
    const handleHistoryNavigation = () => {
      setDropdownOpen(false);
      setMobileMenuOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    window.addEventListener('popstate', handleHistoryNavigation);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      window.removeEventListener('popstate', handleHistoryNavigation);
    };
  }, []);

  const handleSignOut = async () => {
    setLogoutError(null);
    try {
      await logout();
      setDropdownOpen(false);
      setMobileMenuOpen(false);
      navigate('/login');
    } catch (error: unknown) {
      setLogoutError(error instanceof Error ? error.message : 'Could not sign out.');
    }
  };

  const navLinks = !isAuthenticated
    ? [
        { name: 'Platform', path: '/#features' },
        { name: 'How it works', path: '/#how-it-works' },
        { name: 'Verify artwork', path: '/verify', badge: true },
      ]
    : [
        ...(user?.role === 'COLLECTOR' || user?.role === 'ADMIN'
          ? [{ name: 'Collector Vault', path: '/collector/dashboard' }]
          : []),
        ...(user?.role === 'AUTHENTICATOR' || user?.role === 'ADMIN'
          ? [{ name: 'Institution Portal', path: '/institution/dashboard' }]
          : []),
        { name: 'Verify artwork', path: '/verify', badge: true },
      ];

  const homeTarget = !isAuthenticated
    ? '/'
    : user?.role === 'ADMIN' || user?.role === 'AUTHENTICATOR'
      ? '/institution/dashboard'
      : '/collector/dashboard';

  const isLinkActive = (path: string) =>
    location.pathname === path || (path.startsWith('/#') && location.hash === path.slice(1));

  const handleNavLinkClick = (event: ReactMouseEvent<HTMLAnchorElement>, path: string) => {
    const sectionId = path.startsWith('/#') ? path.slice(2) : '';
    if (sectionId && location.pathname === '/') {
      event.preventDefault();
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.pushState(null, '', `/#${sectionId}`);
    }
    setMobileMenuOpen(false);
  };

  const dashboardPath =
    user?.role === 'ADMIN' || user?.role === 'AUTHENTICATOR'
      ? '/institution/dashboard'
      : '/collector/dashboard';

  return (
    <nav className="aureum-nav sticky top-0 z-50 border-b border-[#DCD6CC] bg-[#FAF9F6]/90 text-[#09090B] backdrop-blur-md dark:border-[#24302C] dark:bg-[#0B0F0E]/90 dark:text-[#F8FAFC]">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link to={homeTarget} className="group flex min-w-0 items-center">
          <span className="text-xl font-extrabold tracking-[-0.06em] text-[#09090B] dark:text-[#F8FAFC]">
            Aureum<span className="text-[#D95D0B] dark:text-[#F27A24]">.</span>
            <span className="sr-only"> Home</span>
          </span>
          <span className="ml-3 hidden border-l border-[#DCD6CC] pl-3 text-[10px] font-semibold tracking-[0.12em] text-[#3F3F46] dark:border-[#24302C] dark:text-[#94A3B8] sm:block">
            ART PROVENANCE REGISTRY
          </span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-semibold lg:flex">
          {navLinks.map((link) => {
            const active = isLinkActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={(event) => handleNavLinkClick(event, link.path)}
                aria-current={active ? 'page' : undefined}
                className={`inline-flex min-h-11 items-center gap-2 border-b-2 transition-colors ${
                  active
                    ? 'border-[#9C3D00] text-[#9C3D00] dark:border-[#F27A24] dark:text-[#F27A24]'
                    : 'border-transparent text-[#27272A] hover:text-[#9C3D00] dark:text-[#CBD5E1] dark:hover:text-[#F27A24]'
                }`}
              >
                {link.name}
                {link.badge && <span className="h-2 w-2 rounded-full bg-[#1E7A47] dark:bg-[#4ADE80]" aria-label="Available" />}
              </Link>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden lg:block">
            <WalletButton />
          </div>

          {!isAuthenticated ? (
            <div className="hidden items-center gap-2 lg:flex">
              <Link
                to="/login"
                className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-[#27272A] transition hover:text-[#9C3D00] dark:text-[#CBD5E1] dark:hover:text-[#F27A24]"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex min-h-11 items-center rounded-full bg-[#09090B] px-5 text-sm font-bold text-white transition hover:bg-[#142B22] dark:bg-[#F8FAFC] dark:text-[#09090B] dark:hover:bg-[#CBD5E1]"
              >
                Create account
              </Link>
            </div>
          ) : (
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen((open) => !open)}
                aria-label="Open profile menu"
                aria-haspopup="menu"
                aria-expanded={dropdownOpen}
                aria-controls="profile-menu"
                className="group inline-flex min-h-11 items-center gap-2 rounded-full border border-[#DCD6CC] bg-white px-2.5 text-left transition hover:bg-[#FDF6EC] dark:border-[#24302C] dark:bg-[#131A18] dark:hover:bg-[#1A2420] sm:px-3"
              >
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#FDF6EC] text-[#9C3D00] dark:bg-[#1A2420] dark:text-[#F27A24]">
                  <UserRound className="h-4 w-4" aria-hidden="true" />
                </span>
                <span className="hidden max-w-32 sm:block">
                  <span className="block truncate text-xs font-bold text-[#09090B] dark:text-[#F8FAFC]">
                    {user?.name || 'Account'}
                  </span>
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#3F3F46] dark:text-[#94A3B8]">
                    {user?.role || 'COLLECTOR'}
                  </span>
                </span>
                <ChevronDown
                  className={`hidden h-4 w-4 text-[#3F3F46] transition-transform dark:text-[#94A3B8] sm:block ${
                    dropdownOpen ? 'rotate-180' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>

              {dropdownOpen && (
                <div
                  id="profile-menu"
                  role="menu"
                  className="absolute right-0 mt-2 w-[min(18rem,calc(100vw-1rem))] rounded-2xl border border-[#DCD6CC] bg-white p-2 shadow-xl dark:border-[#24302C] dark:bg-[#131A18]"
                >
                  <div className="border-b border-[#DCD6CC] px-3 py-2 dark:border-[#24302C]">
                    <p className="truncate text-sm font-bold text-[#09090B] dark:text-[#F8FAFC]">{user?.name}</p>
                    <p className="truncate text-xs text-[#3F3F46] dark:text-[#94A3B8]">{user?.email}</p>
                    {logoutError && <p className="mt-2 text-xs text-red-700 dark:text-red-300" role="alert">{logoutError}</p>}
                  </div>
                  <Link
                    role="menuitem"
                    to="/profile"
                    onClick={() => setDropdownOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#27272A] hover:bg-[#FDF6EC] dark:text-[#CBD5E1] dark:hover:bg-[#1A2420]"
                  >
                    <UserRound className="h-4 w-4 text-[#9C3D00] dark:text-[#F27A24]" aria-hidden="true" />
                    Profile
                  </Link>
                  <Link
                    role="menuitem"
                    to={dashboardPath}
                    onClick={() => setDropdownOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#27272A] hover:bg-[#FDF6EC] dark:text-[#CBD5E1] dark:hover:bg-[#1A2420]"
                  >
                    <Landmark className="h-4 w-4 text-[#9C3D00] dark:text-[#F27A24]" aria-hidden="true" />
                    {user?.role === 'ADMIN' || user?.role === 'AUTHENTICATOR' ? 'Institution dashboard' : 'Collector vault'}
                  </Link>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleSignOut}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          )}

          <ThemeSwitch />
          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#DCD6CC] bg-white text-[#09090B] transition hover:bg-[#FDF6EC] dark:border-[#24302C] dark:bg-[#131A18] dark:text-[#F8FAFC] dark:hover:bg-[#1A2420] lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div
          id="mobile-navigation"
          className="border-t border-[#DCD6CC] bg-[#FAF9F6] px-4 py-4 dark:border-[#24302C] dark:bg-[#0B0F0E] lg:hidden"
        >
          <nav aria-label="Mobile navigation" className="mx-auto max-w-7xl space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={(event) => handleNavLinkClick(event, link.path)}
                aria-current={isLinkActive(link.path) ? 'page' : undefined}
                className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold ${
                  isLinkActive(link.path)
                    ? 'bg-[#FDF6EC] text-[#9C3D00] dark:bg-[#1A2420] dark:text-[#F27A24]'
                    : 'text-[#27272A] hover:bg-[#FDF6EC] dark:text-[#CBD5E1] dark:hover:bg-[#1A2420]'
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="space-y-3 border-t border-[#DCD6CC] pt-3 dark:border-[#24302C]">
              <ThemeSwitch expanded />
              <WalletButton className="min-h-11 w-full justify-center" />
              {!isAuthenticated ? (
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#DCD6CC] px-4 text-sm font-semibold text-[#09090B] dark:border-[#24302C] dark:text-[#F8FAFC]"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#09090B] px-4 text-sm font-bold text-white dark:bg-[#F8FAFC] dark:text-[#09090B]"
                  >
                    Create account
                  </Link>
                </div>
              ) : (
                <div className="space-y-1">
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#27272A] hover:bg-[#FDF6EC] dark:text-[#CBD5E1] dark:hover:bg-[#1A2420]"
                  >
                    <UserRound className="h-4 w-4" aria-hidden="true" />
                    Profile
                  </Link>
                  <Link
                    to={dashboardPath}
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-[#27272A] hover:bg-[#FDF6EC] dark:text-[#CBD5E1] dark:hover:bg-[#1A2420]"
                  >
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                    Dashboard
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign out
                  </button>
                  {logoutError && <p className="px-3 text-xs text-red-700 dark:text-red-300" role="alert">{logoutError}</p>}
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
