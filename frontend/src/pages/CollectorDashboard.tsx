import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: string;
  medium: string;
  dimensions: string;
  status: 'VERIFIED' | 'PENDING' | 'IN_ESCROW';
  thumbnailGradient: string;
  nfcTag: string;
  authenticator: string;
}

interface TransferItem {
  id: string;
  type: 'INCOMING' | 'OUTGOING' | 'VERIFICATION';
  title: string;
  artist: string;
  counterparty: string;
  date: string;
  status: 'PENDING_ACCEPTANCE' | 'COMPLETED' | 'IN_PROGRESS';
  txHash: string;
}

const CollectorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'ALL' | 'VERIFIED' | 'ESCROW'>('ALL');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferArtwork, setTransferArtwork] = useState<Artwork | null>(null);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [incomingAccepted, setIncomingAccepted] = useState(false);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);

  // Mock Owned Artworks
  const artworks: Artwork[] = [
    {
      id: 'AUR-1503-ML',
      title: 'Mona Lisa',
      artist: 'Leonardo da Vinci',
      year: '1503–1506',
      medium: 'Oil on poplar panel',
      dimensions: '77 cm × 53 cm',
      status: 'VERIFIED',
      thumbnailGradient: 'from-amber-700/60 via-amber-900/40 to-slate-900',
      nfcTag: 'NFC-SECURE-9024',
      authenticator: 'Musée du Louvre Authentication Guild',
    },
    {
      id: 'AUR-1931-DAL',
      title: 'The Persistence of Memory',
      artist: 'Salvador Dalí',
      year: '1931',
      medium: 'Oil on canvas',
      dimensions: '24 cm × 33 cm',
      status: 'VERIFIED',
      thumbnailGradient: 'from-indigo-900/60 via-violet-900/40 to-slate-900',
      nfcTag: 'NFC-SECURE-8142',
      authenticator: 'Fundació Gala-Salvador Dalí Heritage',
    },
    {
      id: 'AUR-1665-JVE',
      title: 'Girl with a Pearl Earring',
      artist: 'Johannes Vermeer',
      year: '1665',
      medium: 'Oil on canvas',
      dimensions: '44.5 cm × 39 cm',
      status: 'VERIFIED',
      thumbnailGradient: 'from-blue-900/60 via-cyan-900/40 to-slate-900',
      nfcTag: 'NFC-SECURE-7319',
      authenticator: 'Mauritshuis Research Board',
    },
    {
      id: 'AUR-1889-SVG',
      title: 'The Starry Night',
      artist: 'Vincent van Gogh',
      year: '1889',
      medium: 'Oil on canvas',
      dimensions: '73.7 cm × 92.1 cm',
      status: 'VERIFIED',
      thumbnailGradient: 'from-blue-800/60 via-amber-700/40 to-slate-900',
      nfcTag: 'NFC-SECURE-6012',
      authenticator: 'Metropolitan Museum of Art Guild',
    },
    {
      id: 'AUR-1907-GKL',
      title: 'The Kiss',
      artist: 'Gustav Klimt',
      year: '1907–1908',
      medium: 'Oil and gold leaf on canvas',
      dimensions: '180 cm × 180 cm',
      status: 'VERIFIED',
      thumbnailGradient: 'from-amber-600/60 via-yellow-700/40 to-slate-900',
      nfcTag: 'NFC-SECURE-5511',
      authenticator: 'Österreichische Galerie Belvedere',
    },
  ];

  // Recent Transactions
  const [transactions, setTransactions] = useState<TransferItem[]>([
    {
      id: 'tx-101',
      type: 'INCOMING',
      title: 'Water Lilies (Nymphéas)',
      artist: 'Claude Monet',
      counterparty: 'Sotheby’s Contemporary Custody Escrow',
      date: '1 day ago',
      status: 'PENDING_ACCEPTANCE',
      txHash: '0x8f2d35Cc6634C0532925a3b8D4C05329505329b1',
    },
    {
      id: 'tx-102',
      type: 'VERIFICATION',
      title: 'The Persistence of Memory',
      artist: 'Salvador Dalí',
      counterparty: 'Fundació Gala-Salvador Dalí',
      date: '3 weeks ago',
      status: 'COMPLETED',
      txHash: '0x3c7e91Da9931B0532925a3b8D4C05329505329a4',
    },
    {
      id: 'tx-103',
      type: 'INCOMING',
      title: 'Girl with a Pearl Earring',
      artist: 'Johannes Vermeer',
      counterparty: 'The Sovereign Heritage Trust',
      date: '2 months ago',
      status: 'COMPLETED',
      txHash: '0x992d35Cc6634C0532925a3b8D4C05329505329b2',
    },
  ]);

  const filteredArtworks = artworks.filter(item => {
    if (filter === 'VERIFIED') return item.status === 'VERIFIED';
    if (filter === 'ESCROW') return item.status === 'IN_ESCROW';
    return true;
  });

  const handleCopyTx = (tx: string) => {
    navigator.clipboard?.writeText(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const handleAcceptTransfer = () => {
    setIncomingAccepted(true);
    setTransactions(prev =>
      prev.map(t =>
        t.id === 'tx-101' ? { ...t, status: 'COMPLETED' as const } : t
      )
    );
    setShowIncomingModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient Gradient Glows */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-amber-500/10 blur-[140px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute top-80 right-10 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      {/* 1. Standard Aureum Navigation Bar */}
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
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Collector Dashboard</p>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium">
            <Link to="/collector/dashboard" className="text-white font-semibold flex items-center gap-2 border-b-2 border-indigo-500 pb-1 pt-1">
              <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
              Overview
            </Link>
            <a href="#collection" className="text-slate-400 hover:text-slate-200 transition">
              My Collection
            </a>
            <a href="#transfers" className="text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5">
              Transfers
              {!incomingAccepted && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  1
                </span>
              )}
            </a>
            <Link to="/verify" className="text-slate-400 hover:text-amber-300 transition flex items-center gap-1.5">
              Verify
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </Link>
          </div>

          {/* Right Action / Profile Controls */}
          <div className="flex items-center gap-3">
            {/* Collector Role Pill */}
            <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
              <span className="text-amber-200 font-semibold">Collector</span>
              <span className="text-slate-500">•</span>
              <span className="font-mono text-slate-400 text-[11px]">0x71C...49A2</span>
            </div>

            <Link
              to="/institution/dashboard"
              className="text-xs font-semibold px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 hover:text-white border border-slate-700/60 transition"
              title="Switch to Institution View"
            >
              Institution Mode
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

      {/* 2. Main Content Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
        
        {/* Welcome Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-800/80">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-2">
              <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Sovereign Custody Portfolio
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
              Collector Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Welcome back, <span className="text-white font-medium">collector</span>. Manage your authenticated artworks, track physical custody, and sign transfers.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/verify"
              className="px-4 py-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white text-xs sm:text-sm font-semibold transition flex items-center gap-2 shadow-sm"
            >
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Verify Artwork
            </Link>
            <button
              onClick={() => {
                setTransferArtwork(artworks[0]);
                setShowTransferModal(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition duration-200 flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Initiate Transfer
            </button>
          </div>
        </div>

        {/* 3. Stats Grid (The 4 core metrics) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Stat 1: Owned Artworks */}
          <div className="relative group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Owned Artworks
              </span>
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">5</span>
              <span className="text-xs font-semibold text-emerald-400 flex items-center">
                +1 this quarter
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              All registered on Artchain Ledger
            </p>
          </div>

          {/* Stat 2: Incoming Transfers */}
          <div className="relative group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Incoming Transfers
              </span>
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16l-4-4m0 0l4-4m-4 4h18" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                {incomingAccepted ? '0' : '1'}
              </span>
              {!incomingAccepted && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Awaiting sign-off
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              {incomingAccepted ? 'No pending requests' : '1 artwork ready for acceptance'}
            </p>
          </div>

          {/* Stat 3: Outgoing Transfers */}
          <div className="relative group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-violet-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Outgoing Transfers
              </span>
              <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 group-hover:scale-110 transition duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">0</span>
              <span className="text-xs font-semibold text-slate-400">Active</span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
              Full custody retained in your vault
            </p>
          </div>

          {/* Stat 4: Verified Provenance */}
          <div className="relative group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/40 shadow-xl backdrop-blur-xl transition duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Verified Provenance
              </span>
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition duration-300">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">5</span>
              <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                100% Rate
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              All records anchored with NFC binding
            </p>
          </div>
        </div>

        {/* 4. Action Banner for Pending Incoming Transfer (if not accepted) */}
        {!incomingAccepted && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-slate-900/70 border border-indigo-500/40 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 flex-shrink-0 text-xl">
                📥
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
                    Action Required
                  </span>
                  <span className="text-xs text-slate-400">1 day ago</span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  Incoming Transfer Pending: "Water Lilies (Nymphéas)" by Claude Monet
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Origin: Sotheby’s Contemporary Custody Escrow. Requires your cryptographic acceptance signature to complete custody transfer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => setShowIncomingModal(true)}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Review & Accept Transfer
              </button>
            </div>
          </div>
        )}

        {/* 5. My Collection Section */}
        <section id="collection" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
                My Collection
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {filteredArtworks.length} Masterpieces
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Physical fine art custody secured by Artchain cryptographic certificates
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="p-1 rounded-xl bg-slate-900/80 border border-slate-800 inline-flex items-center gap-1 self-start sm:self-auto">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All Artworks ({artworks.length})
              </button>
              <button
                onClick={() => setFilter('VERIFIED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filter === 'VERIFIED'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Verified Provenance (5)
              </button>
            </div>
          </div>

          {/* Artworks Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArtworks.map(artwork => (
              <div
                key={artwork.id}
                className="group rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 shadow-xl backdrop-blur-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                {/* Visual Canvas Representation */}
                <div className={`relative h-44 w-full bg-gradient-to-br ${artwork.thumbnailGradient} p-4 flex flex-col justify-between border-b border-slate-800/80 overflow-hidden`}>
                  {/* Subtle Grid / Texture effect */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  
                  {/* Top Badges */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/60 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                      {artwork.id}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      Verified Provenance
                    </span>
                  </div>

                  {/* Canvas Centerpiece Mock */}
                  <div className="relative z-10 my-auto text-center">
                    <span className="text-3xl opacity-80 group-hover:scale-110 transition duration-300 inline-block">
                      🎨
                    </span>
                  </div>

                  {/* Bottom Art Specifications */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-300/90 font-medium">
                    <span>{artwork.medium}</span>
                    <span className="font-mono text-[10px] text-slate-400">{artwork.nfcTag}</span>
                  </div>
                </div>

                {/* Artwork Content Info */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <h3 className="text-lg font-bold text-white group-hover:text-amber-300 transition tracking-tight">
                      {artwork.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                      <span className="font-medium text-slate-300">{artwork.artist}</span>
                      <span>{artwork.year}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
                      Validated by: {artwork.authenticator}
                    </p>
                  </div>

                  {/* Card Action Controls */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedArtwork(artwork)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white transition cursor-pointer flex-1 text-center"
                    >
                      Certificate
                    </button>
                    <Link
                      to="/verify"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition flex items-center justify-center gap-1"
                    >
                      Audit Trail
                    </Link>
                    <button
                      onClick={() => {
                        setTransferArtwork(artwork);
                        setShowTransferModal(true);
                      }}
                      className="text-xs font-semibold p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                      title="Initiate Transfer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 6. Recent Transactions & Activity */}
        <section id="transfers" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Recent Transactions & Custody Transfers
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Immutable ledger of custody events, verification anchors, and ownership handoffs
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Type & Artwork</th>
                    <th className="px-5 py-3.5">Counterparty</th>
                    <th className="px-5 py-3.5">Tx Hash</th>
                    <th className="px-5 py-3.5">Time</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                            tx.type === 'INCOMING' ? 'bg-indigo-500/20 text-indigo-400' :
                            tx.type === 'OUTGOING' ? 'bg-amber-500/20 text-amber-400' :
                            'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {tx.type === 'INCOMING' ? '📥' : tx.type === 'OUTGOING' ? '📤' : '🛡️'}
                          </div>
                          <div>
                            <span className="font-semibold text-white block">{tx.title}</span>
                            <span className="text-[11px] text-slate-400">{tx.artist}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-300 font-medium">
                        {tx.counterparty}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleCopyTx(tx.txHash)}
                          className="font-mono text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition cursor-pointer"
                          title="Click to copy hash"
                        >
                          {tx.txHash.slice(0, 8)}...{tx.txHash.slice(-6)}
                          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        {copiedTx === tx.txHash && (
                          <span className="text-[10px] text-emerald-400 block mt-0.5">Copied!</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {tx.date}
                      </td>
                      <td className="px-5 py-4">
                        {tx.status === 'PENDING_ACCEPTANCE' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            Pending Review
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Verified Anchor
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {tx.status === 'PENDING_ACCEPTANCE' ? (
                          <button
                            onClick={() => setShowIncomingModal(true)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                          >
                            Review
                          </button>
                        ) : (
                          <Link
                            to="/verify"
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
                          >
                            View Record
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 7. Quick Actions Cards Grid */}
        <section className="space-y-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Quick Actions
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Instant operations across the Aureum physical fine art protocol
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Action 1: Verify */}
            <Link
              to="/verify"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 shadow-xl backdrop-blur-xl group transition-all duration-200 hover:-translate-y-1 block"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition duration-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mt-4 group-hover:text-indigo-300 transition">
                Verify Artwork Provenance
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Query the public explorer with NFC token ID, artwork title, or digital ledger certificate.
              </p>
              <span className="text-xs font-semibold text-indigo-400 mt-3 inline-flex items-center gap-1 group-hover:translate-x-1 transition">
                Launch Explorer &rarr;
              </span>
            </Link>

            {/* Action 2: Initiate Transfer */}
            <button
              onClick={() => {
                setTransferArtwork(artworks[0]);
                setShowTransferModal(true);
              }}
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-amber-500/50 shadow-xl backdrop-blur-xl group transition-all duration-200 hover:-translate-y-1 text-left cursor-pointer w-full"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-600 group-hover:text-white transition duration-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mt-4 group-hover:text-amber-300 transition">
                Initiate Physical Custody Transfer
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Generate cryptographic transfer request to hand over ownership to another collector or institution.
              </p>
              <span className="text-xs font-semibold text-amber-400 mt-3 inline-flex items-center gap-1 group-hover:translate-x-1 transition">
                Transfer Artwork &rarr;
              </span>
            </button>

            {/* Action 3: Genesis Registry */}
            <Link
              to="/artwork/register"
              className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-emerald-500/50 shadow-xl backdrop-blur-xl group transition-all duration-200 hover:-translate-y-1 block"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 group-hover:bg-emerald-600 group-hover:text-white transition duration-200">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-base font-bold text-white mt-4 group-hover:text-emerald-300 transition">
                Register New Genesis Record
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Certified galleries and authentication guilds can create an immutably anchored origin record.
              </p>
              <span className="text-xs font-semibold text-emerald-400 mt-3 inline-flex items-center gap-1 group-hover:translate-x-1 transition">
                Create Record &rarr;
              </span>
            </Link>
          </div>
        </section>
      </main>

      {/* 8. Certificate Modal */}
      {selectedArtwork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6">
            <button
              onClick={() => setSelectedArtwork(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>

            <div className="text-center space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Digital Certificate of Authenticity
              </span>
              <h2 className="text-2xl font-bold text-white">{selectedArtwork.title}</h2>
              <p className="text-xs text-slate-400">By {selectedArtwork.artist} • {selectedArtwork.year}</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Ledger ID:</span>
                <span className="font-mono text-white font-semibold">{selectedArtwork.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Physical Binding:</span>
                <span className="font-mono text-emerald-400 font-semibold">{selectedArtwork.nfcTag}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Medium & Dimensions:</span>
                <span className="text-slate-200">{selectedArtwork.medium} ({selectedArtwork.dimensions})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Authenticating Authority:</span>
                <span className="text-slate-200">{selectedArtwork.authenticator}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Provenance Integrity:</span>
                <span className="text-emerald-400 font-semibold">Zero-Knowledge Proof Verified</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                to="/verify"
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs text-center shadow-md transition"
              >
                Inspect Public Blockchain Proof
              </Link>
              <button
                onClick={() => setSelectedArtwork(null)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Incoming Transfer Review Modal */}
      {showIncomingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6">
            <button
              onClick={() => setShowIncomingModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
                Custody Handoff Protocol
              </span>
              <h2 className="text-xl font-bold text-white mt-2">Incoming Custody Transfer</h2>
              <p className="text-xs text-slate-400">Review signatures and verify NFC binding before acceptance</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Artwork:</span>
                <span className="text-white font-semibold">Water Lilies (Nymphéas) - 1916</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Artist:</span>
                <span className="text-slate-200">Claude Monet</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">From Custodian:</span>
                <span className="text-slate-200">Sotheby’s Contemporary Custody Escrow</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Escrow Contract:</span>
                <span className="font-mono text-indigo-400">0x8f2d...29b1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">NFC Security Binding:</span>
                <span className="font-mono text-emerald-400">NFC-VERIFIED-9844</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleAcceptTransfer}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Sign & Accept Physical Custody
              </button>
              <button
                onClick={() => setShowIncomingModal(false)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Initiate Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-6 sm:p-8 space-y-6">
            <button
              onClick={() => setShowTransferModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1"
            >
              ✕
            </button>

            <div className="text-center space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                Peer-To-Peer Custody Transfer
              </span>
              <h2 className="text-xl font-bold text-white mt-2">Initiate Custody Transfer</h2>
              <p className="text-xs text-slate-400">Hand over physical artwork provenance to a verified recipient</p>
            </div>

            <div className="space-y-4 text-xs text-left">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Artwork</label>
                <select
                  value={transferArtwork?.id || ''}
                  onChange={(e) => {
                    const found = artworks.find(a => a.id === e.target.value);
                    if (found) setTransferArtwork(found);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {artworks.map(art => (
                    <option key={art.id} value={art.id}>
                      {art.title} ({art.artist}) - {art.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Recipient Wallet / Institution ID</label>
                <input
                  type="text"
                  placeholder="0x... or INST-ID"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Transfer Price Visibility</label>
                <select className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                  <option>Transacting Parties Only (Encrypted)</option>
                  <option>Public Chain of Custody</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  alert('Transfer escrow initialized on Artchain testnet.');
                  setShowTransferModal(false);
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer"
              >
                Initiate Secure Escrow
              </button>
              <button
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 11. Consistent App Footer */}
      <footer className="py-8 border-t border-slate-800/60 text-center text-xs text-slate-500 mt-auto">
        &copy; 2026 Aureum Artchain Protocol. All rights reserved.
      </footer>
    </div>
  );
};

export default CollectorDashboard;