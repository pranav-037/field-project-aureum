import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const handleConnectWallet = () => {
    if (!walletConnected) {
      setWalletAddress('0x71C...49A2');
      setWalletConnected(true);
    } else {
      setWalletConnected(false);
      setWalletAddress('');
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 1. Professional Navigation Bar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B0F17]/80 border-b border-slate-800/80 transition-all duration-300">
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
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Provenance Trail</p>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#features" className="hover:text-amber-300 transition duration-200">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-indigo-300 transition duration-200">
              How It Works
            </a>
            <Link to="/verify" className="hover:text-indigo-300 transition duration-200 flex items-center gap-1">
              Verify Artwork
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </Link>
            <a href="#about" className="hover:text-amber-300 transition duration-200">
              About
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition duration-200"
            >
              Sign In
            </Link>
            <button
              onClick={handleConnectWallet}
              className="text-sm font-semibold px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition duration-200 flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {walletConnected ? walletAddress : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32">
        {/* Ambient Gradient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-indigo-600/20 via-violet-600/15 to-amber-500/10 blur-[130px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-10 right-10 w-96 h-96 bg-indigo-500/10 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content Column */}
            <div className="lg:col-span-7 space-y-8 text-left">
              {/* Badge */}
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 text-xs font-medium text-slate-300 shadow-sm backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-amber-400 shadow-[0_0_8px_#f59e0b]"></span>
                <span className="text-amber-200/90 font-semibold tracking-wide uppercase text-[10px]">Web3 Physical Provenance</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-400">Tamper-Proof Custody</span>
              </div>

              {/* Main Headline */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
                Immutable Provenance for the World's{' '}
                <span className="bg-gradient-to-r from-amber-200 via-indigo-300 to-violet-400 bg-clip-text text-transparent">
                  Fine Art Masterpieces
                </span>
              </h1>

              {/* Body Text */}
              <p className="text-lg text-slate-300/90 leading-relaxed max-w-2xl font-normal">
                Aureum unifies physical fine art identities with decentralized cryptographic consensus.
                Trusted authenticators seal physical inspection records into permanent on-chain Genesis blocks,
                creating an unbroken, verifiable chain of custody.
              </p>

              {/* Distinct Well-Spaced Hero Action Buttons */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  to="/register"
                  className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-center shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition duration-200 flex items-center justify-center gap-2"
                >
                  <span>Get Started Free</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </Link>

                <Link
                  to="/verify"
                  className="px-6 py-3.5 rounded-xl border border-slate-700/90 hover:border-slate-500 bg-slate-900/60 hover:bg-slate-800/80 text-slate-200 font-semibold text-center backdrop-blur-sm transition duration-200 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Verify an Artwork</span>
                </Link>
              </div>

              {/* Trust Metrics / Micro Badges */}
              <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-6 max-w-lg">
                <div>
                  <p className="text-2xl font-bold text-white tracking-tight font-sans">100%</p>
                  <p className="text-xs text-slate-400 mt-0.5">On-Chain Custody</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-300 tracking-tight font-sans">$45M+</p>
                  <p className="text-xs text-slate-400 mt-0.5">Art Value Anchored</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-indigo-300 tracking-tight font-sans">0 Fraud</p>
                  <p className="text-xs text-slate-400 mt-0.5">Cryptographic Seals</p>
                </div>
              </div>
            </div>

            {/* Right Abstract Web3 / Fine Art Graphic Column */}
            <div className="lg:col-span-5 relative">
              {/* Outer Glow & Glass Frame */}
              <div className="relative mx-auto max-w-md rounded-2xl bg-gradient-to-b from-slate-700/50 via-slate-800/30 to-slate-900/70 p-[1px] shadow-2xl shadow-indigo-950/60">
                <div className="rounded-[15px] bg-[#0F1422]/95 backdrop-blur-xl p-5 overflow-hidden">
                  {/* Top Bar with Token Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                      <span className="text-xs font-mono font-medium text-slate-300">GENESIS #0842</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/10 text-amber-300 border border-amber-400/20">
                      AUTHENTICATED
                    </span>
                  </div>

                  {/* Artwork Showcase Image / Graphic Canvas */}
                  <div className="relative my-4 rounded-xl overflow-hidden aspect-[4/3] bg-gradient-to-br from-slate-900 via-indigo-950/80 to-[#1e1333] border border-slate-800 group">
                    {/* Abstract Fine Art Visual Representation */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-85">
                      <div className="relative w-44 h-44">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-amber-500/40 via-violet-600/30 to-indigo-500/40 blur-xl animate-pulse"></div>
                        <div className="absolute inset-4 rounded-2xl rotate-12 border border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-transparent backdrop-blur-sm"></div>
                        <div className="absolute inset-8 rounded-full -rotate-6 border border-indigo-400/60 bg-gradient-to-tl from-indigo-500/20 to-transparent backdrop-blur-sm"></div>
                        <div className="absolute inset-14 rounded-xl rotate-45 border border-violet-400/50 bg-violet-600/20 backdrop-blur-md flex items-center justify-center">
                          <svg className="w-8 h-8 text-amber-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Artwork Title Overlay */}
                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent">
                      <p className="text-xs font-mono text-indigo-300">Oil on Linen • 1889</p>
                      <h4 className="text-base font-bold text-white tracking-tight">Symphony in Gold & Obsidian</h4>
                      <p className="text-xs text-slate-400">Provenance Registry ID: <span className="font-mono text-slate-300">0x9F4b...39E1</span></p>
                    </div>
                  </div>

                  {/* Verification Status Ledger Cards */}
                  <div className="space-y-2.5 pt-1">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-slate-300">Physical Tag Binding</span>
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">NFC-SECURE-902</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span className="text-slate-300">Latest Chain Block</span>
                      </div>
                      <span className="font-mono text-indigo-300 text-[11px]">#19,842,109</span>
                    </div>

                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-xs">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        <span className="text-slate-300">Custodial Status</span>
                      </div>
                      <span className="text-amber-300 font-medium text-[11px]">Institution Escrow</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. "How It Works" Section Redesign (Modern 3-Column Glass Card Layout) */}
      <section id="how-it-works" className="py-24 relative border-t border-slate-800/60 bg-[#0B0F17]">
        {/* Subtle Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-80 bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Section Heading */}
          <div className="max-w-3xl mx-auto space-y-4 mb-16">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Architecture & Custody
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
              How Aureum Secures Artwork Provenance
            </h2>
            <p className="text-base sm:text-lg text-slate-400">
              A physical-to-digital chain of custody engineered for international galleries, authenticators, and collectors.
            </p>
          </div>

          {/* 3-Column Grid Card Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Step 1 Card */}
            <div className="group relative rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-8 hover:border-amber-500/50 hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-amber-500/5 transition-all duration-300 flex flex-col text-left">
              {/* Badge & Number */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:bg-amber-500/20 transition duration-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <span className="font-mono text-3xl font-extrabold text-slate-700 group-hover:text-amber-400/40 transition duration-300">
                  01
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-amber-300 transition duration-200">
                Artwork Authentication
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-1">
                Accredited authenticators inspect physical mediums, bind cryptographic NFC seals, and anchor Genesis records to IPFS metadata and the blockchain.
              </p>

              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                <span>Physical Genesis Binding</span>
              </div>
            </div>

            {/* Step 2 Card */}
            <div className="group relative rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-8 hover:border-indigo-500/50 hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-300 flex flex-col text-left">
              {/* Badge & Number */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition duration-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <span className="font-mono text-3xl font-extrabold text-slate-700 group-hover:text-indigo-400/40 transition duration-300">
                  02
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-indigo-300 transition duration-200">
                Ownership Transfer
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-1">
                Every sale, auction consignment, or gallery transfer requires dual-signature verification, permanently logging historical custody while respecting privacy.
              </p>

              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                <span>Dual-Signature Custody</span>
              </div>
            </div>

            {/* Step 3 Card */}
            <div className="group relative rounded-2xl bg-slate-900/40 backdrop-blur-md border border-slate-800/80 p-8 hover:border-violet-500/50 hover:bg-slate-900/70 hover:shadow-2xl hover:shadow-violet-500/5 transition-all duration-300 flex flex-col text-left">
              {/* Badge & Number */}
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 group-hover:scale-110 group-hover:bg-violet-500/20 transition duration-300">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <span className="font-mono text-3xl font-extrabold text-slate-700 group-hover:text-violet-400/40 transition duration-300">
                  03
                </span>
              </div>

              <h3 className="text-xl font-bold text-white mb-3 tracking-tight group-hover:text-violet-300 transition duration-200">
                Provenance Verification
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-6 flex-1">
                Collectors, insurers, and museum registrars instantly verify the full chronological pedigree of an artwork through public or permissioned queries.
              </p>

              <div className="pt-4 border-t border-slate-800/80 flex items-center gap-2 text-xs font-mono text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                <span>Instant Verifiability</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. High-End Call To Action Banner */}
      <section className="py-20 relative overflow-hidden bg-gradient-to-b from-[#0B0F17] via-slate-900/60 to-[#0B0F17] border-t border-slate-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="rounded-3xl p-10 sm:p-14 bg-gradient-to-tr from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-slate-700/60 shadow-2xl shadow-indigo-950/40 backdrop-blur-xl space-y-6">
            <span className="inline-block text-xs font-semibold uppercase tracking-widest text-amber-300 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20">
              Transform Your Art Gallery
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Ready to Safeguard Artwork Legacies?
            </h2>
            <p className="text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Join leading museums, international galleries, and certified appraisers on the standard decentralized provenance protocol.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 hover:-translate-y-0.5 transition duration-200"
              >
                Register as Authenticator
              </Link>
              <Link
                to="/verify"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold transition duration-200"
              >
                Lookup Artwork History
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Minimalist Footer */}
      <footer className="border-t border-slate-800/80 py-12 bg-[#080B11] text-slate-400 text-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-tight text-base">Aureum</span>
            <span className="text-xs text-slate-500">• Artchain Provenance Trail</span>
          </div>
          <div className="flex items-center gap-6 text-xs text-slate-400">
            <a href="#features" className="hover:text-slate-200 transition">Features</a>
            <a href="#how-it-works" className="hover:text-slate-200 transition">How It Works</a>
            <Link to="/verify" className="hover:text-slate-200 transition">Verification Portal</Link>
            <a href="#privacy" className="hover:text-slate-200 transition">Privacy</a>
          </div>
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Aureum Artchain Protocol. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;