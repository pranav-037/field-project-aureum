import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import WalletButton from '../components/WalletButton';

const AdminConsole: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'institutions' | 'users' | 'flags' | 'audit' | 'settings'>('institutions');

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient Glows */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-amber-500/10 blur-[140px] rounded-full pointer-events-none -z-10"></div>

      {/* Navigation */}
      <nav className="sticky top-0 z-40 backdrop-blur-xl bg-[#0B0F17]/85 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-500 p-[1.5px] shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition">
              <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400 group-hover:scale-110 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Admin Console</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <WalletButton />
            <Link to="/collector/dashboard" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
              Collector Dashboard
            </Link>
            <Link to="/institution/dashboard" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
              Institution Dashboard
            </Link>
            <button
              onClick={() => navigate('/login')}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 transition"
              title="Sign Out"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
            Protocol Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Aureum Admin Console
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage certified institutions, platform users, integrity flags, and cryptographic audit logs.
          </p>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto text-xs sm:text-sm font-semibold">
          {[
            { id: 'institutions', label: 'Institutions' },
            { id: 'users', label: 'Users' },
            { id: 'flags', label: 'Flags & Disputes' },
            { id: 'audit', label: 'Audit Log' },
            { id: 'settings', label: 'System Settings' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Admin Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pending Applications</span>
            <div className="mt-3 text-3xl font-extrabold text-amber-400">3</div>
            <p className="text-xs text-slate-500 mt-1">Institutions waiting review</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Active Institutions</span>
            <div className="mt-3 text-3xl font-extrabold text-white">12</div>
            <p className="text-xs text-slate-500 mt-1">Approved authenticators</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Artworks</span>
            <div className="mt-3 text-3xl font-extrabold text-emerald-400">456</div>
            <p className="text-xs text-slate-500 mt-1">Genesis tokens anchored</p>
          </div>
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dispute Flags</span>
            <div className="mt-3 text-3xl font-extrabold text-emerald-400">0</div>
            <p className="text-xs text-slate-500 mt-1">All chains verified</p>
          </div>
        </div>

        {/* Quick Review Table */}
        <div className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Pending Institution Registrations</h2>
            <span className="text-xs text-slate-400">Action required within 48h</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {[
              { name: "Sotheby's Zurich Vault", jur: 'Switzerland', date: 'Yesterday', id: 'APP-902' },
              { name: 'Tokyo Art Authentication Bureau', jur: 'Japan', date: '2 days ago', id: 'APP-901' },
              { name: 'Galleria Borghese Archive', jur: 'Italy', date: '3 days ago', id: 'APP-899' },
            ].map(app => (
              <div key={app.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{app.name}</h3>
                  <p className="text-xs text-slate-400">Jurisdiction: {app.jur} • Submitted {app.date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer">
                    Approve
                  </button>
                  <button className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition cursor-pointer">
                    Review Docs
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-8 border-t border-slate-800/60 text-center text-xs text-slate-500 mt-auto">
        &copy; 2026 Aureum Artchain Protocol. All rights reserved.
      </footer>
    </div>
  );
};

export default AdminConsole;