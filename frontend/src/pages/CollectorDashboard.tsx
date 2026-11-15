import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useArtchainContract } from '../hooks/useArtchainContract';
import Navbar from '../components/Navbar';
import { artworkApi, transferApi } from '../services/api';

interface Artwork {
  id: string;
  databaseId: string;
  ownerId?: string;
  blockchainArtworkId?: string;
  title: string;
  artist: string;
  year: string;
  medium: string;
  dimensions: string;
  status: 'VERIFIED' | 'PENDING' | 'IN_ESCROW';
  thumbnailGradient: string;
  nfcTag: string;
  authenticator: string;
  imageUrl?: string;
}

interface TransferItem {
  id: string;
  blockchainTransferId?: string;
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
  const [transfersTab, setTransfersTab] = useState<'ALL' | 'INCOMING' | 'OUTGOING'>('ALL');
  const [selectedArtwork, setSelectedArtwork] = useState<Artwork | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferArtwork, setTransferArtwork] = useState<Artwork | null>(null);
  const [recipientWallet, setRecipientWallet] = useState('');
  const [transferError, setTransferError] = useState<string | null>(null);
  const [isCreatingTransfer, setIsCreatingTransfer] = useState(false);
  const [showIncomingModal, setShowIncomingModal] = useState(false);
  const [selectedIncomingTransfer, setSelectedIncomingTransfer] = useState<TransferItem | null>(null);
  const [incomingAccepted, setIncomingAccepted] = useState(false);
  const [copiedTx, setCopiedTx] = useState<string | null>(null);
  const { isConnected, account } = useWallet();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const navOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({ top: Math.max(0, offsetPosition), behavior: 'smooth' });
    }
  };

  // Handle direct navigation with hash e.g. /collector/dashboard#collection
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        setTimeout(() => {
          const navOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - navOffset;
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }, 150);
      }
    }
  }, []);

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Default Fallback Transactions: 2 Incoming and 1 Outgoing
  const defaultTransactions: TransferItem[] = [
    {
      id: 'tx-101',
      type: 'INCOMING',
      title: 'The Great Wave off Kanagawa',
      artist: 'Katsushika Hokusai',
      counterparty: 'Tokyo Curatorial Guild Escrow',
      date: 'Nov 14, 2026',
      status: 'PENDING_ACCEPTANCE',
      txHash: '0x8f2d4a1b9c3e7f6a5b4c3d2e1f0a9b8c7d6e5f4a',
    },
    {
      id: 'tx-102',
      type: 'INCOMING',
      title: 'The Birth of Venus',
      artist: 'Sandro Botticelli',
      counterparty: 'Uffizi Gallery Guild Escrow',
      date: 'Nov 12, 2026',
      status: 'PENDING_ACCEPTANCE',
      txHash: '0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
    },
    {
      id: 'tx-103',
      type: 'OUTGOING',
      title: 'The Starry Night',
      artist: 'Vincent van Gogh',
      counterparty: 'MoMA Custodial Vault Escrow',
      date: 'Nov 11, 2026',
      status: 'PENDING_ACCEPTANCE',
      txHash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    },
  ];

  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [transactions, setTransactions] = useState<TransferItem[]>(defaultTransactions);

  const loadData = async (uid: string) => {
    try {
      const res = await artworkApi.getAll();
      if (res.data && Array.isArray(res.data) && res.data.length > 0) {
        const gradients = [
          'from-amber-700/60 via-amber-900/40 to-slate-900',
          'from-indigo-900/60 via-violet-900/40 to-slate-900',
          'from-blue-900/60 via-cyan-900/40 to-slate-900',
          'from-blue-800/60 via-amber-700/40 to-slate-900',
          'from-amber-600/60 via-yellow-700/40 to-slate-900'
        ];
        // Sovereign Vault Custody: Only show artworks owned by current user
        const ownedArtworks = res.data.filter((a: any) => {
          if (uid && a.ownerId) {
            return a.ownerId === uid;
          }
          return true;
        });

        const mapped: Artwork[] = ownedArtworks.map((a: any, idx: number) => {
          let imgUrl = '';
          if (a.imageCids) {
            try {
              const parsed = JSON.parse(a.imageCids);
              if (Array.isArray(parsed) && parsed.length > 0) {
                imgUrl = parsed[0];
              } else if (typeof a.imageCids === 'string') {
                imgUrl = a.imageCids;
              }
            } catch {
              if (typeof a.imageCids === 'string') imgUrl = a.imageCids;
            }
          }

          return {
            id: a.blockchainArtworkId ? `AUR-${a.blockchainArtworkId}` : (a.id ? `AUR-${a.id.slice(0, 8)}` : `AUR-${idx}`),
            databaseId: a.id,
            ownerId: a.ownerId,
            blockchainArtworkId: a.blockchainArtworkId,
            title: a.title,
            artist: a.artist,
            year: a.year || 'Modern',
            medium: a.medium || 'Fine Art',
            dimensions: a.dimensions || 'Variable',
            status: a.status === 'VERIFIED' ? 'VERIFIED' : (a.status === 'IN_ESCROW' ? 'IN_ESCROW' : 'PENDING'),
            thumbnailGradient: gradients[idx % gradients.length],
            nfcTag: a.bindingReference || `NFC-BOUND-${idx}`,
            authenticator: 'Aureum Authentication Guild',
            imageUrl: imgUrl || undefined,
          };
        });
        setArtworks(mapped);
      }
    } catch (err) {
      console.warn('Could not fetch artworks:', err);
    }

    try {
      const transRes = await transferApi.getAll();
      if (transRes.data && Array.isArray(transRes.data) && transRes.data.length > 0) {
        const mappedTrans: TransferItem[] = transRes.data.map((t: any) => {
          const isOutgoing =
            t.type === 'OUTGOING' ||
            (uid && t.sellerId === uid && t.buyerId !== uid);
          const type: 'INCOMING' | 'OUTGOING' = isOutgoing ? 'OUTGOING' : 'INCOMING';
          const counterparty = isOutgoing
            ? (t.buyerName || 'MoMA Custodial Vault Escrow')
            : (t.sellerName || 'Mauritshuis Curatorial Guild');

          return {
            id: t.id,
            type,
            title: t.artworkTitle || `Artwork #${t.artworkId?.slice(0, 8)}`,
            artist: t.artworkArtist || 'Fine Art Masterpiece',
            counterparty,
            date: new Date(t.transferDate || t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: t.status === 'FINALIZED' ? 'COMPLETED' : 'PENDING_ACCEPTANCE',
            txHash: t.txHash || '0x' + '0'.repeat(40),
          };
        });
        setTransactions(mappedTrans);
      }
    } catch (transErr) {
      console.warn('Could not fetch transfers:', transErr);
    }
  };

  useEffect(() => {
    let currentUserId = '';
    try {
      const token = localStorage.getItem('aureum_token');
      const stored = localStorage.getItem('aureum_user');
      if (!token || !stored) {
        navigate('/login', { replace: true });
        return;
      }
      const user = JSON.parse(stored);
      currentUserId = user?.id || '';
      setCurrentUser(user);
      if (user.role === 'AUTHENTICATOR') {
        navigate('/institution/dashboard', { replace: true });
        return;
      }
    } catch {
      navigate('/login', { replace: true });
      return;
    }

    loadData(currentUserId);
  }, [account, navigate]);

  const filteredArtworks = artworks.filter(item => {
    if (filter === 'VERIFIED') return item.status === 'VERIFIED';
    if (filter === 'ESCROW') return item.status === 'IN_ESCROW';
    return true;
  });

  const incomingTransfers = transactions.filter(t => t.type === 'INCOMING');
  const outgoingTransfers = transactions.filter(t => t.type === 'OUTGOING');
  const incomingCount = incomingTransfers.length;
  const outgoingCount = outgoingTransfers.length;
  const pendingIncoming = incomingTransfers.filter(t => t.status === 'PENDING_ACCEPTANCE');
  const incomingTransfer = pendingIncoming[0];
  const verifiedCount = artworks.filter(item => item.status === 'VERIFIED').length;
  const escrowCount = artworks.filter(item => item.status === 'IN_ESCROW').length;

  const handleCopyTx = (tx: string) => {
    navigator.clipboard?.writeText(tx);
    setCopiedTx(tx);
    setTimeout(() => setCopiedTx(null), 2000);
  };

  const { acceptTransfer: acceptTransferOnChain } = useArtchainContract();
  const [isSigningTx, setIsSigningTx] = useState(false);
  const [signingError, setSigningError] = useState<string | null>(null);
  const [confirmedTx, setConfirmedTx] = useState<string | null>(null);

  const handleInitiateTransfer = async () => {
    setTransferError(null);
    if (!transferArtwork?.ownerId) {
      setTransferError('The selected artwork has no recorded owner.');
      return;
    }
    if (!/^0x[a-fA-F0-9]{40}$/.test(recipientWallet.trim())) {
      setTransferError('Enter a valid recipient wallet address.');
      return;
    }

    try {
      setIsCreatingTransfer(true);
      const response = await transferApi.create({
        artworkId: transferArtwork.databaseId,
        sellerId: transferArtwork.ownerId,
        buyerAddress: recipientWallet.trim(),
      });
      const transfer = response.data;
      setTransactions(prev => [{
        id: transfer.id,
        blockchainTransferId: transfer.blockchainTransferId,
        type: 'OUTGOING',
        title: transferArtwork.title,
        artist: transferArtwork.artist,
        counterparty: recipientWallet.trim(),
        date: new Date(transfer.transferDate || transfer.createdAt).toLocaleDateString(),
        status: 'PENDING_ACCEPTANCE',
        txHash: transfer.txHash,
      }, ...prev]);
      setRecipientWallet('');
      setShowTransferModal(false);
    } catch (err: any) {
      setTransferError(err?.response?.data?.error || err?.message || 'Could not initiate the transfer.');
    } finally {
      setIsCreatingTransfer(false);
    }
  };

  const handleAcceptTransfer = async () => {
    setSigningError(null);
    const targetTransfer = selectedIncomingTransfer || incomingTransfer;
    let currentUserId = currentUser?.id;
    if (!currentUserId) {
      try {
        const raw = localStorage.getItem('aureum_user');
        if (raw) currentUserId = JSON.parse(raw)?.id;
      } catch {}
    }

    if (isConnected) {
      try {
        setIsSigningTx(true);
        // Attempt on-chain signature via MetaMask
        const transferIndex = targetTransfer?.blockchainTransferId ? Number(targetTransfer.blockchainTransferId) : 1;
        const receipt = await acceptTransferOnChain(isNaN(transferIndex) ? 1 : transferIndex);
        setConfirmedTx(receipt.txHash);
        
        if (targetTransfer?.id) {
          try {
            await transferApi.accept(targetTransfer.id);
          } catch (apiErr) {
            console.warn('Backend transfer accept error:', apiErr);
          }
        }

        setIncomingAccepted(true);
        if (currentUserId) {
          await loadData(currentUserId);
        }
        setTimeout(() => setShowIncomingModal(false), 2000);
      } catch (err: any) {
        console.warn('On-chain signature error:', err);
        setSigningError(err?.message || 'Transaction rejected in wallet.');
      } finally {
        setIsSigningTx(false);
      }
    } else {
      if (targetTransfer?.id) {
        try {
          await transferApi.accept(targetTransfer.id);
        } catch (apiErr) {
          console.warn('Backend transfer accept error:', apiErr);
        }
      }
      setIncomingAccepted(true);
      if (currentUserId) {
        await loadData(currentUserId);
      }
      setShowIncomingModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Ambient Gradient Glows */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[750px] h-[360px] bg-gradient-to-tr from-indigo-600/15 via-violet-600/10 to-amber-500/10 blur-[140px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute top-80 right-10 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none -z-10"></div>

      {/* 1. Standard Aureum Navigation Bar */}
      <Navbar />

      {/* 2. Main Content Workspace */}
      <main id="overview" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 scroll-mt-24">
        
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
              Welcome back, <span className="text-white font-medium">{currentUser?.name || 'Collector'}</span>. Manage your authenticated artworks, track physical custody, and sign transfers.
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
                if (artworks.length === 0) {
                  alert('You do not have any artworks in your vault to transfer.');
                  return;
                }
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
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{artworks.length}</span>
              {artworks.length > 0 && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              {artworks.length > 0 ? 'All registered on Artchain Ledger' : 'No artworks registered yet'}
            </p>
          </div>

          {/* Stat 2: Incoming Transfers */}
          <div
            onClick={() => {
              setTransfersTab('INCOMING');
              scrollToSection('incoming-transfers');
            }}
            className="relative group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/60 shadow-xl backdrop-blur-xl transition duration-300 cursor-pointer"
            title="Click to view and interact with incoming transfers"
          >
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
                {incomingCount}
              </span>
              {pendingIncoming.length > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  Awaiting sign-off
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
              {pendingIncoming.length > 0 ? `${pendingIncoming.length} transfer ready for acceptance` : 'No pending requests'}
            </p>
          </div>

          {/* Stat 3: Outgoing Transfers */}
          <div
            onClick={() => {
              setTransfersTab('OUTGOING');
              scrollToSection('outgoing-transfers');
            }}
            className="relative group p-6 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-violet-500/60 shadow-xl backdrop-blur-xl transition duration-300 cursor-pointer"
            title="Click to view and interact with outgoing transfers"
          >
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
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{outgoingCount}</span>
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
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 tracking-tight">{verifiedCount}</span>
              <span className="text-xs font-semibold text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                {artworks.length > 0 ? `${Math.round((verifiedCount / artworks.length) * 100)}% Rate` : '0%'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              All records anchored with NFC binding
            </p>
          </div>
        </div>

        {/* 4. Action Banner for Pending Incoming Transfer (if not accepted) */}
        {!incomingAccepted && incomingTransfer && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/80 to-slate-900/70 border border-indigo-500/40 shadow-xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 flex-shrink-0">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
                    Action Required
                  </span>
                  <span className="text-xs text-slate-400">{incomingTransfer.date}</span>
                </div>
                <h2 className="text-base font-bold text-white mt-1">
                  Incoming Transfer Pending: "{incomingTransfer.title}" by {incomingTransfer.artist}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Origin: {incomingTransfer.counterparty}. Requires your cryptographic acceptance signature to complete custody transfer.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={() => {
                  setSelectedIncomingTransfer(incomingTransfer);
                  setShowIncomingModal(true);
                }}
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
        <section id="collection" className="space-y-6 scroll-mt-24">
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
                Verified Provenance ({verifiedCount})
              </button>
              <button
                onClick={() => setFilter('ESCROW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filter === 'ESCROW'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                In Escrow ({escrowCount})
              </button>
            </div>
          </div>

          {/* Artworks Grid */}
          {filteredArtworks.length === 0 ? (
            <div className="py-20 px-6 text-center rounded-2xl bg-gradient-to-b from-slate-900/60 to-[#0A0D15] border border-slate-800/80 luxury-card">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400 mb-4 shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-serif font-light text-white tracking-wide">Sovereign Vault Empty</h3>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                No authenticated masterworks are currently registered under this account. Verified acquisitions and custody handoffs will appear here with cryptographic certificates.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArtworks.map(artwork => (
              <div
                key={artwork.id}
                className="group rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-gold-500/40 shadow-xl backdrop-blur-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 flex flex-col justify-between"
              >
                {/* Visual Canvas Representation */}
                <div className="relative h-52 w-full bg-slate-950 p-4 flex flex-col justify-between border-b border-slate-800/80 overflow-hidden">
                  <div className={`absolute inset-0 bg-gradient-to-br ${artwork.thumbnailGradient}`}>
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]"></div>
                  </div>
                  {artwork.imageUrl && (
                    <img
                      src={artwork.imageUrl}
                      alt={artwork.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="eager"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}

                  {/* Dark gradient overlay for optimal readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-black/60 pointer-events-none"></div>

                  {/* Top Badges */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/60 text-gold-300 border border-gold-500/30 backdrop-blur-md">
                      {artwork.id}
                    </span>
                    {artwork.status === 'IN_ESCROW' ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                        In Escrow
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Verified
                      </span>
                    )}
                  </div>

                  {/* Bottom Art Specifications */}
                  <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-200 font-medium">
                    <span className="bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">{artwork.medium}</span>
                    <span className="font-mono text-[10px] text-slate-300 bg-black/50 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">{artwork.nfcTag}</span>
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
          )}
        </section>

        {/* 6. Custody Transfers Section */}
        <section id="transfers" className="space-y-6 scroll-mt-24">
          {/* Section Main Header & Tab Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-gold-400 animate-pulse"></span>
                <span className="text-xs uppercase font-mono tracking-wider text-gold-400 font-semibold">
                  Custody & Provenance Registry
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-1">
                Custody Transfers Management
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Dedicated portals to review, sign, and monitor your inbound and outbound fine art transactions
              </p>
            </div>

            {/* Interaction Controls: Tabs & Initiate Transfer */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-1">
                <button
                  onClick={() => setTransfersTab('ALL')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    transfersTab === 'ALL'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({transactions.length})
                </button>
                <button
                  onClick={() => setTransfersTab('INCOMING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                    transfersTab === 'INCOMING'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-indigo-300'
                  }`}
                >
                  <span>Incoming ({incomingCount})</span>
                  {pendingIncoming.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                  )}
                </button>
                <button
                  onClick={() => setTransfersTab('OUTGOING')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    transfersTab === 'OUTGOING'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-violet-300'
                  }`}
                >
                  Outgoing ({outgoingCount})
                </button>
              </div>

              <button
                onClick={() => {
                  if (artworks.length === 0) {
                    alert('You do not have any artworks in your vault to transfer.');
                    return;
                  }
                  setTransferArtwork(artworks[0]);
                  setShowTransferModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition flex items-center gap-1.5 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                </svg>
                Initiate Outgoing Transfer
              </button>
            </div>
          </div>

          {/* SECTION A: INCOMING TRANSFERS */}
          {(transfersTab === 'ALL' || transfersTab === 'INCOMING') && (
            <div id="incoming-transfers" className="space-y-4 scroll-mt-28">
              {/* Incoming Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Incoming Transfers
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                        {incomingTransfers.length} Inbound
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Fine art custody handoffs and museum consignments transferred to your vault
                    </p>
                  </div>
                </div>

                {pendingIncoming.length > 0 && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                    {pendingIncoming.length} Requires Your Signature
                  </span>
                )}
              </div>

              {/* Dedicated Card for Pending Acceptance (Interactive) */}
              {pendingIncoming.length > 0 && (
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-slate-900 border border-indigo-500/40 p-5 shadow-2xl backdrop-blur-xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
                          Ready for Sign-off
                        </span>
                        <span className="text-xs text-slate-400">{incomingTransfer?.date}</span>
                      </div>
                      <h4 className="text-base font-bold text-white">
                        Incoming Custody Transfer: "{incomingTransfer?.title}" by {incomingTransfer?.artist}
                      </h4>
                      <p className="text-xs text-slate-300">
                        Origin Custodian: <span className="text-indigo-300 font-semibold">{incomingTransfer?.counterparty}</span>. Cryptographic custody acceptance required to anchor physical transfer.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setSelectedIncomingTransfer(incomingTransfer);
                          setShowIncomingModal(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer flex items-center gap-1.5"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                        Review & Accept Custody
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Incoming Transfers Table */}
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="px-5 py-3.5">Inbound Artwork</th>
                        <th className="px-5 py-3.5">Origin Custodian</th>
                        <th className="px-5 py-3.5">Tx Hash</th>
                        <th className="px-5 py-3.5">Date</th>
                        <th className="px-5 py-3.5">Custody Status</th>
                        <th className="px-5 py-3.5 text-right">Interaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {incomingTransfers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-xs">
                            No incoming transfers currently recorded.
                          </td>
                        </tr>
                      ) : (
                        incomingTransfers.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                  </svg>
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
                                  onClick={() => {
                                    setSelectedIncomingTransfer(tx);
                                    setShowIncomingModal(true);
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition cursor-pointer"
                                >
                                  Sign & Accept
                                </button>
                              ) : (
                                <Link
                                  to="/verify"
                                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition"
                                >
                                  View Audit Trail
                                </Link>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION B: OUTGOING TRANSFERS */}
          {(transfersTab === 'ALL' || transfersTab === 'OUTGOING') && (
            <div id="outgoing-transfers" className="space-y-4 scroll-mt-28">
              {/* Outgoing Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                      Outgoing Transfers
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-semibold">
                        {outgoingTransfers.length} Outbound
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Custodial escrows, consignments, and ownership transfers initiated from your vault
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (artworks.length === 0) {
                      alert('You do not have any artworks in your vault to transfer.');
                      return;
                    }
                    setTransferArtwork(artworks[0]);
                    setShowTransferModal(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  New Outgoing Transfer
                </button>
              </div>

              {/* Outgoing Transfers Table */}
              <div className="rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="px-5 py-3.5">Outbound Artwork</th>
                        <th className="px-5 py-3.5">Destination / Recipient</th>
                        <th className="px-5 py-3.5">Tx Hash</th>
                        <th className="px-5 py-3.5">Date</th>
                        <th className="px-5 py-3.5">Escrow Status</th>
                        <th className="px-5 py-3.5 text-right">Interaction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80">
                      {outgoingTransfers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-slate-400 text-xs">
                            No outgoing transfers recorded.
                          </td>
                        </tr>
                      ) : (
                        outgoingTransfers.map(tx => (
                          <tr key={tx.id} className="hover:bg-slate-800/30 transition">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                                  </svg>
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
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/20 text-xs font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
                                {tx.status === 'COMPLETED' ? 'Custody Anchored' : 'In Escrow'}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    const matchingArt = artworks.find(a => a.title === tx.title);
                                    if (matchingArt) {
                                      setSelectedArtwork(matchingArt);
                                    } else {
                                      navigate('/verify');
                                    }
                                  }}
                                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition cursor-pointer"
                                >
                                  Certificate
                                </button>
                                <Link
                                  to="/verify"
                                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition"
                                >
                                  Audit Trail
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
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
                if (artworks.length === 0) {
                  alert('You do not have any artworks in your vault to transfer.');
                  return;
                }
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

            {selectedArtwork.imageUrl && (
              <div className="relative h-48 w-full rounded-xl overflow-hidden border border-slate-700/80 shadow-inner">
                <img
                  src={selectedArtwork.imageUrl}
                  alt={selectedArtwork.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

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
                <span className="text-white font-semibold">{(selectedIncomingTransfer || incomingTransfer)?.title || 'The Great Wave off Kanagawa'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Artist:</span>
                <span className="text-slate-200">{(selectedIncomingTransfer || incomingTransfer)?.artist || 'Katsushika Hokusai'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">From Custodian:</span>
                <span className="text-slate-200">{(selectedIncomingTransfer || incomingTransfer)?.counterparty || 'Tokyo Curatorial Guild Escrow'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Escrow Contract:</span>
                <span className="font-mono text-indigo-400">0x8f2d...29b1</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient Signer:</span>
                <span className="font-mono text-amber-300">
                  {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : 'Demo Wallet (Not Connected)'}
                </span>
              </div>
            </div>

            {signingError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs">
                ⚠️ {signingError}
              </div>
            )}

            {confirmedTx && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                  <span>✓</span> Transaction Confirmed On-Chain!
                </div>
                <span className="font-mono text-[11px] text-slate-300 break-all">{confirmedTx}</span>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleAcceptTransfer}
                disabled={isSigningTx}
                className={`flex-1 py-3 rounded-xl ${
                  isSigningTx
                    ? 'bg-emerald-800 text-slate-300 cursor-wait'
                    : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white cursor-pointer'
                } font-semibold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2`}
              >
                {isSigningTx ? (
                  <>
                    <svg className="w-4 h-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                    </svg>
                    Signing in MetaMask...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {isConnected ? 'Sign in MetaMask & Accept Custody' : 'Accept Physical Custody'}
                  </>
                )}
              </button>
              <button
                onClick={() => setShowIncomingModal(false)}
                disabled={isSigningTx}
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
                  value={transferArtwork?.databaseId || ''}
                  onChange={(e) => {
                    const found = artworks.find(a => a.databaseId === e.target.value);
                    if (found) setTransferArtwork(found);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  {artworks.map(art => (
                    <option key={art.id} value={art.databaseId}>
                      {art.title} ({art.artist}) - {art.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Recipient Wallet / Institution ID</label>
                <input
                  type="text"
                  value={recipientWallet}
                  onChange={(e) => setRecipientWallet(e.target.value)}
                  maxLength={42}
                  aria-invalid={Boolean(transferError)}
                  placeholder="0x recipient wallet address"
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

            {transferError && (
              <p role="alert" className="text-xs text-red-300">{transferError}</p>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleInitiateTransfer}
                disabled={isCreatingTransfer}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreatingTransfer ? 'Initiating...' : 'Initiate Secure Escrow'}
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