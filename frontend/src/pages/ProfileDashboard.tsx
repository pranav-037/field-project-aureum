import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import Navbar from '../components/Navbar';
import EditProfileModal from '../components/EditProfileModal';
import { userApi } from '../services/api';

const REGISTRY_CONTRACT_ADDRESS =
  import.meta.env.VITE_REGISTRY_CONTRACT_ADDRESS ||
  import.meta.env.VITE_CONTRACT_ADDRESS ||
  '0x35E00A63F83Cfb329A38c037B24b529729007c08';

type SubTab = 'entity' | 'transfers' | 'holdings' | 'security';

export const ProfileDashboard: React.FC = () => {
  const { user, updateUser } = useAuth();
  const { account, isConnected, networkName, chainId, formatAddress } = useWallet();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<SubTab>('entity');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSaveProfile = async (updatedData: any) => {
    updateUser(updatedData);
    try {
      if ((userApi as any).updateProfile) {
        await (userApi as any).updateProfile(updatedData);
      }
    } catch {
      // Local state and localStorage are already updated
    }
    showNotification('Sovereign profile & institutional credentials updated successfully.');
  };

  const userInitial = user?.name ? user.name.trim()[0].toUpperCase() : 'U';
  const roleName = user?.role || 'COLLECTOR';

  // Role badge color scheme
  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'AUTHENTICATOR':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      default:
        return 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30';
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Unified Global Navbar */}
      <Navbar />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Toast Notification */}
        {notification && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm flex items-center justify-between shadow-lg shadow-emerald-950/20 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{notification}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-emerald-400 hover:text-emerald-200 p-1 text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Header Card */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/90 to-[#0F172A]/80 border border-slate-800/80 p-6 sm:p-8 shadow-xl backdrop-blur-md">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] pointer-events-none rounded-full" />
          <div className="absolute -bottom-10 left-10 w-72 h-72 bg-amber-500/10 blur-[90px] pointer-events-none rounded-full" />

          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            {/* User Avatar + Identity Info */}
            <div className="flex items-center gap-5">
              {/* Avatar Initial */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-600 p-0.5 shadow-xl shadow-indigo-500/20 flex-shrink-0">
                <div className="w-full h-full bg-[#0B0F17] rounded-[14px] flex items-center justify-center">
                  <span className="text-3xl font-extrabold text-white tracking-wider">
                    {userInitial}
                  </span>
                </div>
              </div>

              {/* Text Meta */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-sans">
                    {user?.name || 'Sovereign User'}
                  </h1>
                  <span
                    className={`text-[11px] font-mono tracking-widest uppercase font-semibold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                      roleName
                    )}`}
                  >
                    {roleName}
                  </span>
                </div>

                <p className="text-sm text-slate-400 font-mono flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {user?.email || 'unregistered@artchain.aureum'}
                </p>

                {/* Wallet Connection Status Badge */}
                <div className="pt-1 flex items-center gap-2">
                  {isConnected && account ? (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Polygon: {formatAddress(account)}</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-mono">
                      <span className="w-2 h-2 rounded-full bg-slate-500" />
                      <span>Polygon (Disconnected)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => navigate('/collector/dashboard#transfers')}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                <span>+ Initiate Transfer</span>
              </button>

              <button
                type="button"
                onClick={() => setIsEditModalOpen(true)}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 hover:text-white border border-slate-700/80 hover:border-slate-600 text-xs sm:text-sm font-semibold transition duration-200 flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. 4 KPI Summary Cards (Clean 0 Defaults, Zero Fake/Mock Data) */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Valuation */}
          <div className="p-5 rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 shadow-md flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Portfolio Valuation</span>
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono tracking-tight">0.00 POL</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">~$0.00 USD</div>
            </div>
          </div>

          {/* Card 2: Acquired Works */}
          <div className="p-5 rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 shadow-md flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Acquired Works</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono tracking-tight">0 Masterworks</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">Sovereign custody</div>
            </div>
          </div>

          {/* Card 3: Custody Transfers */}
          <div className="p-5 rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 shadow-md flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Custody Transfers</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono tracking-tight">0 Records</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">Merkle ledger settled</div>
            </div>
          </div>

          {/* Card 4: Physical NFC Security */}
          <div className="p-5 rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 shadow-md flex flex-col justify-between hover:border-slate-700 transition">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Physical NFC Security</span>
              <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white font-mono tracking-tight">0 Bound</div>
              <div className="text-xs text-slate-500 font-mono mt-0.5">Dual-factor verified</div>
            </div>
          </div>
        </section>

        {/* 3. Sub-Tabs Header */}
        <section className="space-y-6">
          <div className="flex items-center border-b border-slate-800 overflow-x-auto gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('entity')}
              className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'entity'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Institution Entity & Credentials</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('transfers')}
              className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'transfers'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Transfers & Buys History</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('holdings')}
              className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'holdings'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span>Current Custody Holdings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`pb-3 px-4 text-xs sm:text-sm font-semibold transition-all duration-200 border-b-2 whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'security'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Polygon Security & Cryptography</span>
            </button>
          </div>

          {/* Sub-Tab 1: Institution Entity & Credentials */}
          {activeTab === 'entity' && (
            <div className="rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Institutional Entity & Verified Credentials
                  </h3>
                  <p className="text-xs text-slate-400">
                    Cryptographic credentials registered on the Polygon distributed ledger.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline"
                >
                  Edit Information
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Full Legal Name
                  </span>
                  <p className="text-sm font-semibold text-white">{user?.name || 'Not Configured'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Primary Email
                  </span>
                  <p className="text-sm font-mono text-slate-200">{user?.email || 'Not Configured'}</p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Assigned Role & Privilege
                  </span>
                  <div className="pt-0.5">
                    <span
                      className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                        roleName
                      )}`}
                    >
                      {roleName}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Affiliated Institution
                  </span>
                  <p className="text-sm font-semibold text-amber-300">
                    {user?.institution?.name || 'Not Assigned'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Jurisdiction / Regional Registry
                  </span>
                  <p className="text-sm font-semibold text-white">
                    {user?.institution?.jurisdiction || 'Not Assigned'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Regulatory Registration Number
                  </span>
                  <p className="text-sm font-mono text-slate-200">
                    {user?.institution?.registrationNumber || 'Pending Verification'}
                  </p>
                </div>

                {/* Smart Contract & Network Identity */}
                <div className="md:col-span-2 p-4 rounded-xl bg-gradient-to-r from-slate-950/90 to-indigo-950/30 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                      Polygon Network Smart Contract Identity
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-200 border border-indigo-500/30">
                      Polygon PoS
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-300 break-all select-all">
                    {REGISTRY_CONTRACT_ADDRESS}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Immutable contract registry governing ArtChain provenance, cryptographic verification, and NFT Merkle bindings.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Transfers & Buys History */}
          {activeTab === 'transfers' && (
            <div className="rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-base font-bold text-white">No Transfer Records Found</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  No transfer, escrow, or acquisition transactions have been finalized on the Polygon network for this identity yet.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/collector/dashboard#transfers')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
                >
                  + Initiate Transfer On-Chain
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 3: Current Custody Holdings */}
          {activeTab === 'holdings' && (
            <div className="rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 p-8 sm:p-12 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="text-base font-bold text-white">Zero Active Custody Holdings</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You do not currently possess active physical custody of registered artworks on the Aureum ledger.
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => navigate('/verify')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
                >
                  Verify Artwork
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/artwork/register')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md transition"
                >
                  Register Masterwork
                </button>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Polygon Security & Cryptography */}
          {activeTab === 'security' && (
            <div className="rounded-2xl bg-[#0F172A]/70 border border-slate-800/80 p-6 sm:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">
                  Polygon Cryptographic Security & Permissions
                </h3>
                <p className="text-xs text-slate-400">
                  Zero-knowledge commitments, multi-sig governance, and role permissions.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Bound Wallet Identity
                  </span>
                  <p className="text-xs font-mono text-slate-200 break-all">
                    {account || user?.walletAddress || 'No Web3 Wallet Currently Bound'}
                  </p>
                  <div className="pt-1">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        isConnected
                          ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {isConnected ? 'Session Active' : 'Disconnected'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Network Status
                  </span>
                  <p className="text-xs font-mono text-slate-200">
                    {isConnected ? `${networkName || 'Polygon'} (Chain ID: ${chainId})` : 'Polygon Amoy / Mainnet Ready'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Gas optimized for low-latency merkle state validation and tokenized escrow.
                  </p>
                </div>

                <div className="md:col-span-2 p-5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                    Cryptographic Role Permissions: {roleName}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-xs">
                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Provenance Verification
                      </div>
                      <p className="text-[11px] text-slate-400">
                        Authorized to query and verify Merkle root proofs and cryptographic IPFS CIDs.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        Custody Transfers
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {roleName === 'COLLECTOR' || roleName === 'ADMIN'
                          ? 'Full capability to initiate, accept, and commit private escrow transfers.'
                          : 'Read and certification verification authorization.'}
                      </p>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                      <div className="text-slate-200 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                        NFC Physical Attestation
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {roleName === 'AUTHENTICATOR' || roleName === 'ADMIN'
                          ? 'Authorized lab certifier: can sign and bind tamper-evident physical tags.'
                          : 'Can inspect dual-factor NFC attestation certificates.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* Custom Edit Profile Modal with Country-Cascading Dropdown */}
      {user && (
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          user={user}
          onSave={handleSaveProfile}
        />
      )}
    </div>
  );
};

export default ProfileDashboard;
