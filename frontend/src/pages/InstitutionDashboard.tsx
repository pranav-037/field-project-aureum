import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import WalletButton from '../components/WalletButton';

const InstitutionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  const activities = [
    {
      id: 'act-1',
      type: 'GENESIS',
      title: 'Genesis Record Created',
      detail: '"Starry Night" by Vincent van Gogh',
      time: '2 hours ago',
      badge: 'NFC-BOUND',
      txHash: '0x742d35Cc6634C0532925a3b8D4C0532950532950',
    },
    {
      id: 'act-2',
      type: 'TRANSFER',
      title: 'Custody Transfer Initiated',
      detail: 'Artwork #AUR-7890 to Guggenheim Escrow',
      time: '5 hours ago',
      badge: 'MULTISIG ESCROW',
      txHash: '0x8f2d35Cc6634C0532925a3b8D4C05329505329b1',
    },
    {
      id: 'act-3',
      type: 'VERIFICATION',
      title: 'Physical Authentication Verified',
      detail: 'Spectrometry & Pigment Analysis Verified',
      time: '1 day ago',
      badge: 'ZKP PROOF',
      txHash: '0x3c7e91Da9931B0532925a3b8D4C05329505329a4',
    },
  ];

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
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B0F17]/85 border-b border-slate-800/80 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-500 p-[1.5px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition duration-300">
              <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400 group-hover:scale-110 transition duration-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Institution Portal</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/institution/dashboard" className="text-white font-semibold flex items-center gap-2 border-b-2 border-indigo-500 pb-1 pt-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              Overview
            </Link>
            <Link to="/artwork/register" className="text-slate-400 hover:text-slate-200 transition">
              Register Artwork
            </Link>
            <Link to="/verify" className="text-slate-400 hover:text-amber-300 transition flex items-center gap-1.5">
              Verify
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </Link>
            <Link to="/admin" className="text-slate-400 hover:text-slate-200 transition">
              Admin Console
            </Link>
          </div>

          {/* Right Action Area */}
          <div className="flex items-center gap-3">
            {/* Web3 Connected Wallet */}
            <WalletButton />

            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#6366f1]"></span>
              <span className="text-indigo-200 font-semibold">Metropolitan Guild</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-slate-400 text-[11px]">INST-8841</span>
            </div>

            <Link
              to="/collector/dashboard"
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/60 transition"
              title="Switch to Collector View"
            >
              Collector Mode
            </Link>

            <button
              onClick={() => navigate('/login')}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
              title="Sign Out"
              aria-label="Sign out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
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
              Welcome back, <span className="text-white font-medium">Metropolitan Museum of Art Guild</span>. Oversee Genesis provenance registrations and authorized custody handoffs.
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
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Authenticated Artworks
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                🎨
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">12</span>
              <span className="text-xs font-semibold text-emerald-400">+2 this month</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Genesis physical records verified</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Pending Transfers
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                🔄
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">3</span>
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
                ✅
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">45</span>
              <span className="text-xs font-semibold text-emerald-400">100% Settled</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Historical handoffs recorded on ledger</p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-violet-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Active Flags & Disputes
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                🛡️
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
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Recent Institutional Activity
            </h2>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl divide-y divide-slate-800/80">
            {activities.map(act => (
              <div key={act.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-800/20 transition">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg flex-shrink-0">
                    {act.type === 'GENESIS' ? '🎨' : act.type === 'TRANSFER' ? '🔄' : '🛡️'}
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
            ))}
          </div>
        </section>

        {/* Quick Actions Grid */}
        <section className="space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Institutional Operations
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/artwork/register"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 shadow-xl backdrop-blur-xl group transition hover:-translate-y-1 block"
            >
              <div className="text-2xl mb-3">🎨</div>
              <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">Register Artwork</h3>
              <p className="text-xs text-slate-400 mt-1">Bind new physical masterpiece with NFC security tag</p>
            </Link>

            <Link
              to="/collector/dashboard"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 shadow-xl backdrop-blur-xl group transition hover:-translate-y-1 block"
            >
              <div className="text-2xl mb-3">🔄</div>
              <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition">Initiate Transfer</h3>
              <p className="text-xs text-slate-400 mt-1">Transfer custody to escrow or verified collector</p>
            </Link>

            <Link
              to="/verify"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 shadow-xl backdrop-blur-xl group transition hover:-translate-y-1 block"
            >
              <div className="text-2xl mb-3">🔍</div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">Verify Provenance</h3>
              <p className="text-xs text-slate-400 mt-1">Query cryptographic chain of custody records</p>
            </Link>

            <Link
              to="/admin"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-violet-500/50 shadow-xl backdrop-blur-xl group transition hover:-translate-y-1 block"
            >
              <div className="text-2xl mb-3">⚙️</div>
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