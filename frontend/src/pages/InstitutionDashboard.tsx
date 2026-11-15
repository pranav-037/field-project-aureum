import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { activityApi, artworkApi, transferApi } from '../services/api';

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  try {
    const diff = Date.now() - new Date(dateStr).getTime();
    if (isNaN(diff)) return dateStr;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  } catch {
    return dateStr;
  }
}

const InstitutionDashboard: React.FC = () => {
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [artworkCount, setArtworkCount] = useState<number>(0);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('aureum_user');
      if (stored) setCurrentUser(JSON.parse(stored));
    } catch {}

    const fetchData = async () => {
      try {
        const [actRes, artRes, transRes] = await Promise.allSettled([
          activityApi.getAll({ limit: 15 }),
          artworkApi.getAll(),
          transferApi.getAll(),
        ]);

        if (actRes.status === 'fulfilled' && Array.isArray(actRes.value.data) && actRes.value.data.length > 0) {
          setActivities(actRes.value.data.map(a => ({
            id: a.id,
            type: a.type,
            title: a.title,
            detail: a.detail || `${a.type} operation`,
            badge: a.badge || a.type,
            time: formatTimeAgo(a.createdAt),
            txHash: a.txHash || '0x' + '0'.repeat(40),
          })));
        } else {
          setActivities([]);
        }

        if (artRes.status === 'fulfilled' && Array.isArray(artRes.value.data)) {
          setArtworkCount(artRes.value.data.length);
        }

        if (transRes.status === 'fulfilled' && Array.isArray(transRes.value.data)) {
          const transfers = transRes.value.data;
          setPendingCount(transfers.filter((t: any) => t.status === 'PENDING').length);
          setCompletedCount(transfers.filter((t: any) => t.status === 'FINALIZED').length);
        }
      } catch (err) {
        console.warn('Could not load institution stats:', err);
        setActivities([]);
      }
    };

    fetchData();
  }, []);

  const handleCopy = (tx: string) => {
    navigator.clipboard?.writeText(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient Gradient Glows */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-amber-500/10 blur-[140px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute top-80 left-10 w-96 h-96 bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      {/* Navigation Bar */}
      <Navbar />

      {/* Main Container */}
      <main id="overview" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 scroll-mt-24">
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Certified Authenticator & Custodian Portal
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Institution Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Welcome back, <span className="text-white font-medium">{currentUser?.name || 'Metropolitan Museum of Art Guild'}</span>. Oversee Genesis provenance registrations and authorized custody handoffs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/artwork/register"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition duration-200 flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Register New Artwork
            </Link>
          </div>
        </div>

        {/* 4 Core Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-gold-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Authenticated Artworks
              </span>
              <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{artworkCount}</span>
              <span className="text-xs font-semibold text-emerald-400">Recorded</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Genesis physical records in database</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pending Transfers
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{pendingCount}</span>
              <span className="text-xs font-semibold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                In Escrow
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Awaiting dual verification</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Completed Transfers
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{completedCount}</span>
              <span className="text-xs font-semibold text-emerald-400">Settled</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Historical handoffs recorded on ledger</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-violet-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Flags & Disputes
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">0</span>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Clean Record
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Zero disputed ownership claims</p>
          </div>
        </div>

        {/* Recent Activity List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-serif">
              Recent Institutional Activity
            </h2>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl divide-y divide-slate-800/80">
            {activities.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-gold-400 mb-2">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <span className="block font-medium text-slate-300">No Institutional Activity Recorded Yet</span>
                <span className="text-[11px] text-slate-500">Genesis artwork registrations and verified custody transfers will appear here.</span>
              </div>
            ) : (
              activities.map(act => (
                <div key={act.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 text-slate-300">
                      {act.type === 'GENESIS' ? (
                        <svg className="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <polygon points="12 2 2 7 12 12 22 7 12 2" strokeWidth="1.5" />
                          <polyline points="2 17 12 22 22 17" strokeWidth="1.5" />
                          <polyline points="2 12 12 17 22 12" strokeWidth="1.5" />
                        </svg>
                      ) : act.type === 'TRANSFER' ? (
                        <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">{act.title}</h3>
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300 border border-slate-700">
                          {act.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{act.detail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 sm:flex-shrink-0 justify-between sm:justify-end">
                    <div className="text-right">
                      <button
                        onClick={() => handleCopy(act.txHash)}
                        className="font-mono text-xs text-indigo-400 hover:text-indigo-300 cursor-pointer block"
                        title="Copy hash"
                      >
                        {act.txHash.slice(0, 10)}...{act.txHash.slice(-6)}
                      </button>
                      {copiedTx === act.txHash && (
                        <span className="text-[10px] text-emerald-400">Copied!</span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">{act.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-serif">
            Institutional Operations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/artwork/register"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-gold-500/50 shadow-xl backdrop-blur-xl group transition hover:-translate-y-1 block"
            >
              <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400 mb-3 group-hover:scale-110 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" strokeWidth="1.5" />
                  <polyline points="2 17 12 22 22 17" strokeWidth="1.5" />
                  <polyline points="2 12 12 17 22 12" strokeWidth="1.5" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-gold-300 transition">Register Masterpiece</h3>
              <p className="text-xs text-slate-400 mt-1">Bind new physical artwork with cryptographic NFC seal</p>
            </Link>

            <Link
              to="/collector/dashboard"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 shadow-xl backdrop-blur-xl group transition hover:-translate-y-1 block"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">Initiate Transfer</h3>
              <p className="text-xs text-slate-400 mt-1">Transfer custody to escrow or verified collector</p>
            </Link>

            <Link
              to="/verify"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 shadow-xl backdrop-blur-xl group transition hover:-translate-y-1 block"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 group-hover:scale-110 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">Verify Provenance</h3>
              <p className="text-xs text-slate-400 mt-1">Query cryptographic chain of custody records</p>
            </Link>

            <Link
              to="/admin"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-violet-500/50 shadow-xl backdrop-blur-xl group transition hover:-translate-y-1 block"
            >
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-3 group-hover:scale-110 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="text-sm font-bold text-white group-hover:text-violet-300 transition">Admin Console</h3>
              <p className="text-xs text-slate-400 mt-1">Manage guild memberships and disputes</p>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-800/60 text-center text-xs text-slate-500 mt-auto">
        &copy; 2026 Aureum Artchain Protocol. All rights reserved.
      </footer>
    </div>
  );
};

export default InstitutionDashboard;