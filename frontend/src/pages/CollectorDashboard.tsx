import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWallet } from '../contexts/WalletContext';
import { useArtchainContract } from '../hooks/useArtchainContract';
import Navbar from '../components/Navbar';
import { artworkApi, transferApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  status: string;
  ownershipStatus: 'OWNED' | 'OTHER' | 'UNASSIGNED';
  thumbnailGradient: string;
  nfcTag: string;
  authenticator: string;
  imageUrl?: string;
}

interface ArtworkRecord {
  id: string;
  blockchainArtworkId?: string | null;
  txHash?: string | null;
  blockNumber?: number | null;
  title: string;
  artist: string;
  year?: string | null;
  medium?: string | null;
  dimensions?: string | null;
  metadataCid?: string | null;
  imageCids?: string | string[] | null;
  documentCids?: string | string[] | null;
  bindingReference?: string | null;
  status?: string | null;
  ownerId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  authenticationMethod?: string | null;
  edition?: string | null;
}

interface ArtworkTransferRecord {
  id: string;
  blockchainTransferId?: string | null;
  artworkId: string;
  sellerId: string;
  buyerId?: string | null;
  buyerAddress?: string | null;
  transferDate?: string | null;
  priceVisibility?: string | null;
  status?: string | null;
  txHash?: string | null;
  blockNumber?: number | null;
}

interface TransferItem {
  id: string;
  artworkId: string;
  blockchainTransferId?: string;
  type: 'INCOMING' | 'OUTGOING' | 'VERIFICATION';
  title: string;
  artist: string;
  counterparty: string;
  date: string;
  status: 'PENDING_ACCEPTANCE' | 'COMPLETED' | 'IN_PROGRESS' | 'CANCELLED' | 'EXPIRED';
  txHash: string;
  sellerId?: string;
  buyerId?: string;
  buyerAddress?: string;
}

interface ArtworkProvenance {
  source?: string;
  onChain?: unknown;
}

const parseArtworkList = (value: string | string[] | null | undefined): string[] => {
  if (Array.isArray(value)) return value.filter((item) => typeof item === 'string' && item.length > 0);
  if (typeof value !== 'string' || !value) return [];

  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === 'string' && item.length > 0);
    }
  } catch {
    return [value];
  }

  return [value];
};

const IPFS_GATEWAY = import.meta.env.VITE_IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/';

const toGatewayUrl = (cidOrUrl: string): string => {
  if (!cidOrUrl || typeof cidOrUrl !== 'string') return '';
  const trimmed = cidOrUrl.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `${IPFS_GATEWAY.replace(/\/+$/, '')}/${trimmed}`;
};

const CollectorDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser, loading: authLoading } = useAuth();
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
  const [artworkDetails, setArtworkDetails] = useState<ArtworkRecord | null>(null);
  const [artworkTransfers, setArtworkTransfers] = useState<ArtworkTransferRecord[]>([]);
  const [artworkProvenance, setArtworkProvenance] = useState<ArtworkProvenance | null>(null);
  const [isLoadingArtworkDetails, setIsLoadingArtworkDetails] = useState(false);
  const [artworkDetailsError, setArtworkDetailsError] = useState<string | null>(null);
  const { isConnected, account } = useWallet();

  useEffect(() => {
    if (!selectedArtwork && !showIncomingModal && !showTransferModal) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedArtwork(null);
        setShowIncomingModal(false);
        setShowTransferModal(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedArtwork, showIncomingModal, showTransferModal]);

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


  // Default Curated Masterpieces for the Collector's Sovereign Vault
  const defaultMasterpieces: Artwork[] = [
    {
      id: 'AUR-fe18b0aa',
      databaseId: 'art-001',
      title: 'Girl with a Pearl Earring',
      artist: 'Johannes Vermeer',
      year: '1665',
      medium: 'Oil on canvas',
      dimensions: '44.5 cm × 39.0 cm',
      status: 'VERIFIED',
      ownershipStatus: 'UNASSIGNED',
      thumbnailGradient: 'from-amber-700/60 via-amber-900/40 to-slate-900',
      nfcTag: 'NFC-BOUND-VERMEER-1665',
      authenticator: 'Aureum Authentication Guild',
      imageUrl: '/artworks/girl-pearl-earring.jpg',
    },
    {
      id: 'AUR-8e7fe0c7',
      databaseId: 'art-002',
      title: 'The Kiss',
      artist: 'Gustav Klimt',
      year: '1908',
      medium: 'Oil and gold leaf on canvas',
      dimensions: '180 cm × 180 cm',
      status: 'VERIFIED',
      ownershipStatus: 'UNASSIGNED',
      thumbnailGradient: 'from-amber-600/60 via-yellow-700/40 to-slate-900',
      nfcTag: 'NFC-BOUND-KLIMT-1908',
      authenticator: 'Aureum Authentication Guild',
      imageUrl: '/artworks/the-kiss.jpg',
    },
    {
      id: 'AUR-e5e2bcbe',
      databaseId: 'art-003',
      title: 'The Starry Night',
      artist: 'Vincent van Gogh',
      year: '1889',
      medium: 'Oil on canvas',
      dimensions: '73.7 cm × 92.1 cm',
      status: 'IN_ESCROW',
      ownershipStatus: 'UNASSIGNED',
      thumbnailGradient: 'from-blue-900/60 via-cyan-900/40 to-slate-900',
      nfcTag: 'NFC-BOUND-VANGOGH-1889',
      authenticator: 'Aureum Authentication Guild',
      imageUrl: '/artworks/starry-night.jpg',
    },
  ];

  // Default Fallback Transactions: 2 Incoming and 1 Outgoing
  const defaultTransactions: TransferItem[] = [
    {
      id: 'tx-101',
      artworkId: 'art-001',
      type: 'INCOMING',
      title: 'The Great Wave off Kanagawa',
      artist: 'Katsushika Hokusai',
      counterparty: 'Sanjay Rathore',
      date: 'Nov 13, 2026',
      status: 'PENDING_ACCEPTANCE',
      txHash: '0x8f2d4a1b9c3e7f6a5b4c3d2e1f0a9b8c7d6e5f4a',
    },
    {
      id: 'tx-102',
      artworkId: 'art-002',
      type: 'INCOMING',
      title: 'The Birth of Venus',
      artist: 'Sandro Botticelli',
      counterparty: 'Sanjay Rathore',
      date: 'Nov 10, 2026',
      status: 'PENDING_ACCEPTANCE',
      txHash: '0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c',
    },
    {
      id: 'tx-103',
      artworkId: 'art-003',
      type: 'OUTGOING',
      title: 'The Starry Night',
      artist: 'Vincent van Gogh',
      counterparty: 'Sanjay Rathore',
      date: 'Nov 12, 2026',
      status: 'PENDING_ACCEPTANCE',
      txHash: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
    },
  ];

  const [artworks, setArtworks] = useState<Artwork[]>(defaultMasterpieces);
  const [transactions, setTransactions] = useState<TransferItem[]>(defaultTransactions);

  const loadData = async (uid: string) => {
    try {
      const res = await artworkApi.getAll();
      if (Array.isArray(res.data)) {
        const gradients = [
          'from-amber-700/60 via-amber-900/40 to-slate-900',
          'from-indigo-900/60 via-violet-900/40 to-slate-900',
          'from-blue-900/60 via-cyan-900/40 to-slate-900',
          'from-blue-800/60 via-amber-700/40 to-slate-900',
          'from-amber-600/60 via-yellow-700/40 to-slate-900'
        ];
        const ownerIds = [uid, currentUser?.walletAddress, currentUser?.institution?.walletAddress, account]
          .filter((ownerId): ownerId is string => typeof ownerId === 'string' && ownerId.length > 0)
          .map((ownerId) => ownerId.toLowerCase());
        const mapped: Artwork[] = res.data.map((a: any, idx: number) => {
          let imgUrl = '';
          if (a.imageUrl && typeof a.imageUrl === 'string') {
            imgUrl = toGatewayUrl(a.imageUrl);
          } else if (a.imageCids) {
            try {
              const parsed = JSON.parse(a.imageCids);
              if (Array.isArray(parsed) && parsed.length > 0) {
                imgUrl = toGatewayUrl(parsed[0]);
              } else if (typeof a.imageCids === 'string') {
                imgUrl = toGatewayUrl(a.imageCids);
              }
            } catch {
              if (typeof a.imageCids === 'string') imgUrl = toGatewayUrl(a.imageCids);
            }
          }

          const ownerId = typeof a.ownerId === 'string' ? a.ownerId : undefined;
          const ownershipStatus = !ownerId?.trim()
            ? 'UNASSIGNED'
            : ownerIds.includes(ownerId.toLowerCase())
              ? 'OWNED'
              : 'OTHER';
          const rawStatus = typeof a.status === 'string' ? a.status.toUpperCase() : 'PENDING';

          return {
            id: a.blockchainArtworkId ? `AUR-${a.blockchainArtworkId}` : (a.id ? `AUR-${a.id.slice(0, 8)}` : `AUR-${idx}`),
            databaseId: a.id,
            ownerId,
            blockchainArtworkId: a.blockchainArtworkId,
            title: a.title,
            artist: a.artist,
            year: a.year || 'Modern',
            medium: a.medium || 'Fine Art',
            dimensions: a.dimensions || 'Variable',
            status: rawStatus || 'PENDING',
            ownershipStatus,
            thumbnailGradient: gradients[idx % gradients.length],
            nfcTag: a.bindingReference || `NFC-BOUND-${idx}`,
            authenticator: a.authenticationMethod || 'Not recorded',
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
      if (Array.isArray(transRes.data)) {
        const mappedTrans: TransferItem[] = transRes.data.map((t: any) => {
          const type: 'INCOMING' | 'OUTGOING' = t.type === 'OUTGOING' ? 'OUTGOING' : 'INCOMING';
          const isOutgoing = type === 'OUTGOING';
          const counterparty = isOutgoing
            ? (t.buyerName || 'MoMA Custodial Vault Escrow')
            : (t.sellerName || 'Mauritshuis Curatorial Guild');

          return {
            id: t.id,
            artworkId: String(t.artworkId || ''),
            blockchainTransferId: t.blockchainTransferId || undefined,
            type,
            title: t.artworkTitle || `Artwork #${t.artworkId?.slice(0, 8)}`,
            artist: t.artworkArtist || 'Fine Art Masterpiece',
            counterparty,
            date: new Date(t.transferDate || t.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: t.status === 'FINALIZED'
              ? 'COMPLETED'
              : t.status === 'PENDING'
                ? 'PENDING_ACCEPTANCE'
                : t.status === 'CANCELLED' || t.status === 'EXPIRED'
                  ? t.status
                  : 'IN_PROGRESS',
            txHash: t.txHash || '0x' + '0'.repeat(64),
            sellerId: t.sellerId,
            buyerId: t.buyerId,
            buyerAddress: t.buyerAddress,
          };
        });
        setTransactions(mappedTrans);
      }
    } catch (transErr) {
      console.warn('Could not fetch transfers:', transErr);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      navigate('/login', { replace: true });
      return;
    }
    loadData(currentUser.id);
  }, [account, authLoading, currentUser, navigate]);

  const ownedArtworks = artworks.filter((artwork) => artwork.ownershipStatus === 'OWNED');
  const transferableArtworks = ownedArtworks.filter((artwork) => Boolean(artwork.ownerId));
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
  const verifiedCount = ownedArtworks.filter(item => item.status === 'VERIFIED').length;
  const registryVerifiedCount = artworks.filter(item => item.status === 'VERIFIED').length;
  const registryEscrowCount = artworks.filter(item => item.status === 'IN_ESCROW').length;

  const openArtworkDetails = async (artwork: Artwork) => {
    setSelectedArtwork(artwork);
    setArtworkDetails(null);
    setArtworkTransfers([]);
    setArtworkProvenance(null);
    setArtworkDetailsError(null);
    setIsLoadingArtworkDetails(true);

    const errors: string[] = [];
    const [artworkResult, transfersResult, provenanceResult] = await Promise.allSettled([
      artworkApi.getById(artwork.databaseId),
      artworkApi.getTransfers(artwork.databaseId),
      artworkApi.getProvenance(artwork.databaseId),
    ]);

    if (artworkResult.status === 'fulfilled') {
      setArtworkDetails(artworkResult.value.data as ArtworkRecord);
    } else {
      errors.push(artworkResult.reason instanceof Error ? artworkResult.reason.message : 'Artwork record could not be loaded.');
    }

    if (transfersResult.status === 'fulfilled' && Array.isArray(transfersResult.value.data)) {
      setArtworkTransfers(transfersResult.value.data as ArtworkTransferRecord[]);
    } else if (transfersResult.status === 'rejected') {
      errors.push(transfersResult.reason instanceof Error ? transfersResult.reason.message : 'Artwork transfer history could not be loaded.');
    }

    if (provenanceResult.status === 'fulfilled') {
      setArtworkProvenance(provenanceResult.value.data as ArtworkProvenance);
    } else {
      errors.push(provenanceResult.reason instanceof Error ? provenanceResult.reason.message : 'Artwork provenance could not be loaded.');
    }

    if (errors.length > 0) setArtworkDetailsError(errors.join(' '));
    setIsLoadingArtworkDetails(false);
  };

  const openTransferArtworkDetails = (transfer: TransferItem) => {
    const artwork = artworks.find((item) => item.databaseId === transfer.artworkId);
    if (artwork) {
      void openArtworkDetails(artwork);
      return;
    }

    void openArtworkDetails({
      id: `AUR-${transfer.artworkId.slice(0, 8)}`,
      databaseId: transfer.artworkId,
      title: transfer.title,
      artist: transfer.artist,
      year: 'Not recorded',
      medium: 'Not recorded',
      dimensions: 'Not recorded',
      status: 'PENDING',
      ownershipStatus: 'OTHER',
      thumbnailGradient: 'from-slate-800 to-slate-950',
      nfcTag: 'Not recorded',
      authenticator: 'Not recorded',
    });
  };

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
        artworkId: transferArtwork.databaseId,
        blockchainTransferId: transfer.blockchainTransferId,
        type: 'OUTGOING',
        title: transferArtwork.title,
        artist: transferArtwork.artist,
        counterparty: recipientWallet.trim(),
        date: new Date(transfer.transferDate || transfer.createdAt).toLocaleDateString(),
        status: 'PENDING_ACCEPTANCE',
        txHash: transfer.txHash,
        sellerId: transferArtwork.ownerId,
        buyerAddress: recipientWallet.trim(),
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
    const currentUserId = currentUser?.id;

    if (!targetTransfer?.id) {
      setSigningError('Select a pending transfer to accept.');
      return;
    }

    try {
      setIsSigningTx(true);
      if (targetTransfer.blockchainTransferId) {
        if (!isConnected) {
          throw new Error('Connect the recipient wallet to accept this on-chain transfer.');
        }
        const transferIndex = Number(targetTransfer.blockchainTransferId);
        if (!Number.isSafeInteger(transferIndex) || transferIndex < 1) {
          throw new Error('This transfer has an invalid blockchain transfer ID.');
        }
        const receipt = await acceptTransferOnChain(transferIndex);
        setConfirmedTx(receipt.txHash);
      } else {
        const response = await transferApi.accept(targetTransfer.id);
        setConfirmedTx(response.data.txHash || targetTransfer.txHash);
      }

      setIncomingAccepted(true);
      if (currentUserId) {
        await loadData(currentUserId);
      }
      setShowIncomingModal(false);
    } catch (err: any) {
      console.warn('Transfer acceptance failed:', err);
      setSigningError(err?.response?.data?.error || err?.message || 'Could not accept this transfer.');
    } finally {
      setIsSigningTx(false);
    }
  };

  return (
    <div className="aureum-theme min-h-screen bg-[#FAF9F6] text-[#18181B] flex flex-col selection:bg-orange-100 selection:text-[#1E3A2F]">
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
              {currentUser?.role === 'AUTHENTICATOR' ? 'Institution Custody Dashboard' : 'Collector Dashboard'}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Welcome back, <span className="text-white font-medium">{currentUser?.name || 'Custodian'}</span>. Manage your authenticated artworks, track physical custody, and sign transfers.
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
                if (transferableArtworks.length === 0) {
                  alert('You do not have any artworks in your vault to transfer.');
                  return;
                }
                setTransferArtwork(transferableArtworks[0]);
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
              <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">{ownedArtworks.length}</span>
              {ownedArtworks.length > 0 && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center">
                  Active
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              {ownedArtworks.length > 0 ? 'Owned records in your vault' : 'No owned artworks registered yet'}
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
                {ownedArtworks.length > 0 ? `${Math.round((verifiedCount / ownedArtworks.length) * 100)}% Rate` : '0%'}
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
                <button
                  type="button"
                  onClick={() => openTransferArtworkDetails(incomingTransfer)}
                  className="mt-1 text-left text-base font-bold text-white hover:text-indigo-300 transition"
                >
                  Incoming Transfer Pending: "{incomingTransfer.title}" by {incomingTransfer.artist}
                </button>
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
                My Collection & Artwork Registry
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {filteredArtworks.length} Artworks
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Your owned works and every other registered artwork linked to custody activity
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
                Verified Provenance ({registryVerifiedCount})
              </button>
              <button
                onClick={() => setFilter('ESCROW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filter === 'ESCROW'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                In Escrow ({registryEscrowCount})
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
                No artwork records are available. Registered works and related custody handoffs will appear here.
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
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => void openArtworkDetails(artwork)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      void openArtworkDetails(artwork);
                    }
                  }}
                  aria-label={`View details for ${artwork.title}`}
                  className="relative h-52 w-full bg-slate-950 p-4 flex flex-col justify-between border-b border-slate-800/80 overflow-hidden cursor-pointer"
                >
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
                        const img = e.currentTarget as HTMLElement;
                        img.style.display = 'none';
                        console.warn(`Failed to load artwork image: ${artwork.imageUrl}`);
                      }}
                    />
                  )}

                  {/* Dark gradient overlay for optimal readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-slate-950/0 to-black/10 pointer-events-none"></div>

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
                    ) : artwork.status === 'VERIFIED' ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-700/80 text-slate-200 border border-slate-500/30 backdrop-blur-md">
                        {artwork.status.replace(/_/g, ' ')}
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
                    <button
                      type="button"
                      onClick={() => void openArtworkDetails(artwork)}
                      className="text-left text-lg font-bold text-white group-hover:text-amber-300 transition tracking-tight"
                    >
                      {artwork.title}
                    </button>
                    <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                      <span className="font-medium text-slate-300">{artwork.artist}</span>
                      <span>{artwork.year}</span>
                    </div>

                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-1">
                      {artwork.ownershipStatus === 'OWNED'
                        ? 'Owned by this account'
                        : artwork.ownershipStatus === 'UNASSIGNED'
                          ? 'Owner not recorded'
                          : 'Registered to another custodian'}
                    </p>
                  </div>

                  {/* Card Action Controls */}
                  <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => void openArtworkDetails(artwork)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-200 hover:text-white transition cursor-pointer flex-1 text-center"
                    >
                      Full Details
                    </button>
                    <Link
                      to="/verify"
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/30 transition flex items-center justify-center gap-1"
                    >
                      Audit Trail
                    </Link>
                    {artwork.ownershipStatus === 'OWNED' && artwork.ownerId && (
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
                    )}
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
                  if (transferableArtworks.length === 0) {
                    alert('You do not have any artworks in your vault to transfer.');
                    return;
                  }
                  setTransferArtwork(transferableArtworks[0]);
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
                      <button
                        type="button"
                        onClick={() => openTransferArtworkDetails(incomingTransfer)}
                        className="text-left text-base font-bold text-white hover:text-indigo-300 transition"
                      >
                        Incoming Custody Transfer: "{incomingTransfer?.title}" by {incomingTransfer?.artist}
                      </button>
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
                  <table className="w-full min-w-[48rem] text-left text-xs sm:text-sm">
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
                                    <button
                                      type="button"
                                      onClick={() => openTransferArtworkDetails(tx)}
                                      className="font-semibold text-white block text-left hover:text-indigo-300 transition"
                                    >
                                      {tx.title}
                                    </button>
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
                              ) : tx.status === 'COMPLETED' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-semibold">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                  Verified Anchor
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-700/60 text-slate-300 border border-slate-600/30 text-xs font-semibold">
                                  {tx.status.replace(/_/g, ' ')}
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
                    if (transferableArtworks.length === 0) {
                      alert('You do not have any artworks in your vault to transfer.');
                      return;
                    }
                    setTransferArtwork(transferableArtworks[0]);
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
                  <table className="w-full min-w-[48rem] text-left text-xs sm:text-sm">
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
                                  <button
                                    type="button"
                                    onClick={() => openTransferArtworkDetails(tx)}
                                    className="font-semibold text-white block text-left hover:text-violet-300 transition"
                                  >
                                    {tx.title}
                                  </button>
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
                                {tx.status === 'COMPLETED'
                                  ? 'Custody Anchored'
                                  : tx.status === 'PENDING_ACCEPTANCE'
                                    ? 'In Escrow'
                                    : tx.status.replace(/_/g, ' ')}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    openTransferArtworkDetails(tx);
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
                if (transferableArtworks.length === 0) {
                  alert('You do not have any artworks in your vault to transfer.');
                  return;
                }
                setTransferArtwork(transferableArtworks[0]);
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

      {/* 8. Artwork Details Modal */}
      {selectedArtwork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-2 backdrop-blur-md sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="artwork-details-title" className="relative max-h-[90vh] w-[95vw] max-w-3xl space-y-5 overflow-y-auto overscroll-contain rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setSelectedArtwork(null)}
              aria-label="Close artwork details"
              className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>

            <div className="space-y-2 px-7 text-center">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Artwork Record
              </span>
              <h2 id="artwork-details-title" className="text-2xl font-bold text-white">
                {artworkDetails?.title || selectedArtwork.title}
              </h2>
              <p className="text-xs text-slate-400">
                By {artworkDetails?.artist || selectedArtwork.artist} • {artworkDetails?.year || selectedArtwork.year}
              </p>
            </div>

            {isLoadingArtworkDetails && (
              <p className="rounded-xl border border-slate-700 bg-slate-950/70 p-4 text-center text-sm text-slate-300" role="status">
                Loading artwork record, custody history, and provenance…
              </p>
            )}

            {artworkDetailsError && (
              <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200" role="alert">
                Some artwork information could not be loaded: {artworkDetailsError}
              </p>
            )}

            {selectedArtwork.imageUrl && (
              <div className="relative h-48 w-full rounded-xl overflow-hidden border border-slate-700/80 shadow-inner">
                <img
                  src={selectedArtwork.imageUrl}
                  alt={artworkDetails?.title || selectedArtwork.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Artwork information</h3>
              <dl className="grid gap-3 text-xs sm:grid-cols-2">
                <div><dt className="text-slate-400">Record ID</dt><dd className="mt-1 break-all font-mono text-white">{artworkDetails?.id || selectedArtwork.databaseId}</dd></div>
                <div><dt className="text-slate-400">Ledger ID</dt><dd className="mt-1 break-all font-mono text-white">{artworkDetails?.blockchainArtworkId || selectedArtwork.blockchainArtworkId || selectedArtwork.id}</dd></div>
                <div><dt className="text-slate-400">Artist</dt><dd className="mt-1 text-slate-200">{artworkDetails?.artist || selectedArtwork.artist}</dd></div>
                <div><dt className="text-slate-400">Year</dt><dd className="mt-1 text-slate-200">{artworkDetails?.year || selectedArtwork.year}</dd></div>
                <div><dt className="text-slate-400">Medium</dt><dd className="mt-1 text-slate-200">{artworkDetails?.medium || selectedArtwork.medium}</dd></div>
                <div><dt className="text-slate-400">Dimensions</dt><dd className="mt-1 text-slate-200">{artworkDetails?.dimensions || selectedArtwork.dimensions}</dd></div>
                <div><dt className="text-slate-400">Edition</dt><dd className="mt-1 text-slate-200">{artworkDetails?.edition || 'Not recorded'}</dd></div>
                <div><dt className="text-slate-400">Authentication method</dt><dd className="mt-1 text-slate-200">{artworkDetails?.authenticationMethod || 'Not recorded'}</dd></div>
                <div><dt className="text-slate-400">Record status</dt><dd className="mt-1 text-slate-200">{artworkDetails?.status || selectedArtwork.status}</dd></div>
                <div>
                  <dt className="text-slate-400">Ownership</dt>
                  <dd className="mt-1 text-slate-200">
                    {selectedArtwork.ownershipStatus === 'OWNED'
                      ? 'Owned by this account'
                      : selectedArtwork.ownershipStatus === 'UNASSIGNED'
                        ? 'Owner not recorded'
                        : 'Registered to another custodian'}
                  </dd>
                </div>
                <div className="sm:col-span-2"><dt className="text-slate-400">Owner ID</dt><dd className="mt-1 break-all font-mono text-slate-200">{artworkDetails?.ownerId || selectedArtwork.ownerId || 'Not recorded'}</dd></div>
                <div><dt className="text-slate-400">Physical binding / NFC</dt><dd className="mt-1 break-all font-mono text-emerald-300">{artworkDetails?.bindingReference || selectedArtwork.nfcTag}</dd></div>
                <div><dt className="text-slate-400">Created</dt><dd className="mt-1 text-slate-200">{artworkDetails?.createdAt || 'Not recorded'}</dd></div>
                <div><dt className="text-slate-400">Last updated</dt><dd className="mt-1 text-slate-200">{artworkDetails?.updatedAt || 'Not recorded'}</dd></div>
                <div><dt className="text-slate-400">Block number</dt><dd className="mt-1 font-mono text-slate-200">{artworkDetails?.blockNumber ?? 'Not recorded'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-slate-400">Artwork transaction hash</dt><dd className="mt-1 break-all font-mono text-slate-200">{artworkDetails?.txHash || 'Not recorded'}</dd></div>
                <div className="sm:col-span-2"><dt className="text-slate-400">Metadata CID</dt><dd className="mt-1 break-all font-mono text-slate-200">{artworkDetails?.metadataCid || 'Not recorded'}</dd></div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-400">Image references</dt>
                  <dd className="mt-1 space-y-1 break-all font-mono text-slate-200">
                    {parseArtworkList(artworkDetails?.imageCids).length > 0
                      ? parseArtworkList(artworkDetails?.imageCids).map((reference) => <div key={reference}>{reference}</div>)
                      : 'Not recorded'}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-slate-400">Supporting documents</dt>
                  <dd className="mt-1 space-y-1 break-all font-mono text-slate-200">
                    {parseArtworkList(artworkDetails?.documentCids).length > 0
                      ? parseArtworkList(artworkDetails?.documentCids).map((reference) => <div key={reference}>{reference}</div>)
                      : 'Not recorded'}
                  </dd>
                </div>
              </dl>
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Custody and transfer history</h3>
              {artworkTransfers.length === 0 ? (
                <p className="text-xs text-slate-400">No transfer records are linked to this artwork.</p>
              ) : (
                <div className="space-y-3">
                  {artworkTransfers.map((transfer) => (
                    <article key={transfer.id} className="rounded-lg border border-slate-800 bg-slate-900/70 p-3 text-xs">
                      <dl className="grid gap-2 sm:grid-cols-2">
                        <div><dt className="text-slate-400">Transfer status</dt><dd className="mt-1 text-slate-200">{transfer.status || 'Not recorded'}</dd></div>
                        <div><dt className="text-slate-400">Transfer date</dt><dd className="mt-1 text-slate-200">{transfer.transferDate || 'Not recorded'}</dd></div>
                        <div><dt className="text-slate-400">From custodian</dt><dd className="mt-1 break-all font-mono text-slate-200">{transfer.sellerId || 'Not recorded'}</dd></div>
                        <div><dt className="text-slate-400">To custodian / wallet</dt><dd className="mt-1 break-all font-mono text-slate-200">{transfer.buyerId || transfer.buyerAddress || 'Not recorded'}</dd></div>
                        <div><dt className="text-slate-400">Transfer record ID</dt><dd className="mt-1 break-all font-mono text-slate-200">{transfer.id}</dd></div>
                        <div><dt className="text-slate-400">Blockchain transfer ID</dt><dd className="mt-1 break-all font-mono text-slate-200">{transfer.blockchainTransferId || 'Not recorded'}</dd></div>
                        <div className="sm:col-span-2"><dt className="text-slate-400">Transaction hash</dt><dd className="mt-1 break-all font-mono text-slate-200">{transfer.txHash || 'Not recorded'}</dd></div>
                        <div><dt className="text-slate-400">Block number</dt><dd className="mt-1 font-mono text-slate-200">{transfer.blockNumber ?? 'Not recorded'}</dd></div>
                        <div><dt className="text-slate-400">Price visibility</dt><dd className="mt-1 text-slate-200">{transfer.priceVisibility || 'Not recorded'}</dd></div>
                      </dl>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <h3 className="mb-3 text-sm font-semibold text-white">Provenance verification</h3>
              <p className="text-xs text-slate-300">
                Verification source: {artworkProvenance?.source || 'Not available'}
              </p>
              {artworkProvenance?.onChain !== undefined && (
                <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-900 p-3 text-[11px] text-slate-300">
                  {JSON.stringify(artworkProvenance.onChain, null, 2) || String(artworkProvenance.onChain)}
                </pre>
              )}
            </section>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/verify"
                className="flex min-h-11 flex-1 items-center justify-center rounded-xl bg-indigo-600 py-2.5 text-center text-xs font-semibold text-white shadow-md transition hover:bg-indigo-500"
              >
                Open Artwork Verification
              </Link>
              <button
                type="button"
                onClick={() => setSelectedArtwork(null)}
                className="min-h-11 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 9. Incoming Transfer Review Modal */}
      {showIncomingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-2 backdrop-blur-md sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="incoming-transfer-title" className="relative max-h-[90vh] w-[95vw] max-w-lg space-y-6 overflow-y-auto overscroll-contain rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setShowIncomingModal(false)}
              aria-label="Close incoming transfer dialog"
              className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>

            <div className="space-y-1 px-7 text-center">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
                Custody Handoff Protocol
              </span>
              <h2 id="incoming-transfer-title" className="mt-2 text-xl font-bold text-white">Incoming Custody Transfer</h2>
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleAcceptTransfer}
                disabled={isSigningTx}
                className={`min-h-11 flex-1 rounded-xl py-3 ${
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
                type="button"
                onClick={() => setShowIncomingModal(false)}
                disabled={isSigningTx}
                className="min-h-11 rounded-xl bg-slate-800 px-4 py-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
              >
                Decline
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 10. Initiate Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-2 backdrop-blur-md sm:p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="initiate-transfer-title" className="relative max-h-[90vh] w-[95vw] max-w-lg space-y-6 overflow-y-auto overscroll-contain rounded-2xl border border-slate-700 bg-slate-900 p-4 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setShowTransferModal(false)}
              aria-label="Close initiate transfer dialog"
              className="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              ✕
            </button>

            <div className="space-y-1 px-7 text-center">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold uppercase tracking-wider">
                Peer-To-Peer Custody Transfer
              </span>
              <h2 id="initiate-transfer-title" className="mt-2 text-xl font-bold text-white">Initiate Custody Transfer</h2>
              <p className="text-xs text-slate-400">Hand over physical artwork provenance to a verified recipient</p>
            </div>

            <div className="space-y-4 text-xs text-left">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Select Artwork</label>
                <select
                  value={transferArtwork?.databaseId || ''}
                  onChange={(e) => {
                    const found = transferableArtworks.find(a => a.databaseId === e.target.value);
                    if (found) setTransferArtwork(found);
                  }}
                  className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {transferableArtworks.map(art => (
                    <option key={art.id} value={art.databaseId}>
                      {art.title} ({art.artist}) - {art.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Recipient wallet address</label>
                <input
                  type="text"
                  value={recipientWallet}
                  onChange={(e) => setRecipientWallet(e.target.value)}
                  maxLength={42}
                  aria-invalid={Boolean(transferError)}
                  placeholder="0x… (linked to the recipient’s Aureum account)"
                  className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  The recipient must link this wallet in their Aureum profile to receive and accept the transfer.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Transfer Price Visibility</label>
                <select className="min-h-11 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option>Transacting Parties Only (Encrypted)</option>
                  <option>Public Chain of Custody</option>
                </select>
              </div>
            </div>

            {transferError && (
              <p role="alert" className="text-xs text-red-300">{transferError}</p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleInitiateTransfer}
                disabled={isCreatingTransfer}
                className="min-h-11 flex-1 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3 text-xs font-semibold text-white shadow-lg transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreatingTransfer ? 'Initiating...' : 'Initiate Secure Escrow'}
              </button>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="min-h-11 rounded-xl bg-slate-800 px-4 py-3 text-xs font-semibold text-slate-300 transition hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </section>
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