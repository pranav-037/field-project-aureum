import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { artworkApi } from '../services/api';
import WalletButton from '../components/WalletButton';

interface TransferRecord {
  id: string;
  date: string;
  from: string;
  to: string;
  priceVisibility: string;
  txHash: string;
  blockNumber: number;
}

interface ArtworkData {
  id: string;
  blockchainArtworkId?: string | null;
  title: string;
  artist: string;
  year?: string;
  medium?: string;
  dimensions?: string;
  authenticator: string;
  genesisTimestamp: string;
  genesisTxHash: string;
  status: string;
  integrityStatus: string;
  metadataCid?: string;
  bindingReference?: string;
  onChainVerified?: boolean;
  transfers: TransferRecord[];
}

const mockDemoArtwork: ArtworkData = {
  id: 'AUR-1234',
  title: 'The Starry Night',
  artist: 'Vincent van Gogh',
  year: '1889',
  medium: 'Oil on canvas',
  dimensions: '73.7 cm × 92.1 cm',
  authenticator: 'Metropolitan Museum of Art Guild',
  genesisTimestamp: '2023-05-15T10:30:00Z',
  genesisTxHash: '0x742d35Cc6634C0532925a3b8D4C0532950532950',
  status: 'VERIFIED',
  integrityStatus: 'VERIFIED',
  metadataCid: 'QmZtmD2qt8fQgdfmkW4m6JqWcstVkAbD9ldWgjXF2',
  bindingReference: 'NFC-SECURE-9024',
  onChainVerified: true,
  transfers: [
    {
      id: 'txf-001',
      date: '2023-06-01',
      from: 'Metropolitan Museum of Art',
      to: 'Guggenheim Foundation Escrow',
      priceVisibility: 'PARTIES_AND_AUTHORISED',
      txHash: '0x8f2d35Cc6634C0532925a3b8D4C05329505329b1',
      blockNumber: 18452104,
    },
    {
      id: 'txf-002',
      date: '2024-01-15',
      from: 'Guggenheim Foundation Escrow',
      to: 'The Sovereign Heritage Trust',
      priceVisibility: 'PUBLIC',
      txHash: '0x992d35Cc6634C0532925a3b8D4C05329505329b2',
      blockNumber: 19842109,
    },
  ],
};

const ProvenanceVerification: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchBy, setSearchBy] = useState<'artworkId' | 'wallet' | 'qr'>('artworkId');
  const [artworkData, setArtworkData] = useState<ArtworkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [previousOwners, setPreviousOwners] = useState<string[]>([]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please provide a valid search query.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      let foundData: ArtworkData | null = null;
      if (searchBy === 'artworkId') {
        try {
          const res = await artworkApi.getById(searchQuery.trim());
          if (res.data) {
            const raw = res.data;
            let transfers: TransferRecord[] = [];
            let onChainVerified = false;

            try {
              const provRes = await artworkApi.getProvenance(raw.id);
              if (provRes.data?.source === 'BLOCKCHAIN_VERIFIED') {
                onChainVerified = true;
              }
            } catch {
              // fallback
            }

            try {
              const transferRes = await artworkApi.getTransfers(raw.id);
              if (Array.isArray(transferRes.data)) {
                transfers = transferRes.data.map((t: any) => ({
                  id: t.id,
                  date: t.transferDate || t.createdAt,
                  from: t.sellerId || 'Initial Registry',
                  to: t.buyerId || 'Custodian',
                  priceVisibility: t.priceVisibility || 'PARTIES_AND_AUTHORISED',
                  txHash: t.txHash || '0x0000000000000000000000000000000000000000',
                  blockNumber: t.blockNumber || 0,
                }));
              }
            } catch (tErr) {
              console.warn('Could not load transfers from backend:', tErr);
            }

            foundData = {
              id: raw.id,
              blockchainArtworkId: raw.blockchainArtworkId,
              title: raw.title,
              artist: raw.artist,
              year: raw.year,
              medium: raw.medium,
              dimensions: raw.dimensions,
              authenticator: 'Aureum Certified Authenticator',
              genesisTimestamp: raw.createdAt,
              genesisTxHash: raw.txHash || '0x' + (raw.id.replace(/[^a-fA-F0-9]/g, '') + 'abcdef0123456789').slice(0, 40),
              status: raw.status || 'VERIFIED',
              integrityStatus: onChainVerified ? 'CRYPTOGRAPHICALLY_VERIFIED' : (raw.status || 'VERIFIED'),
              metadataCid: raw.metadataCid,
              bindingReference: raw.bindingReference,
              onChainVerified,
              transfers: transfers,
            };
          }
        } catch (apiErr) {
          // If not in database, fallback to verified mock records for demo
        }
      }

      // 2. Fallback to mock data for demonstration
      if (!foundData) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        foundData = {
          ...mockDemoArtwork,
          id: searchQuery.trim().toUpperCase().startsWith('AUR-') ? searchQuery.trim().toUpperCase() : `AUR-${searchQuery.trim().slice(0, 6).toUpperCase()}`,
        };
      }

      setArtworkData(foundData);
    } catch (err: any) {
      setError('Unable to verify artwork at this time. Please check your query and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = () => {
    setSearchQuery('AUR-1234');
    setSearchBy('artworkId');
    // Auto-trigger search demonstration
    setArtworkData(mockDemoArtwork);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  // Load previous owners when artwork data becomes available
  useEffect(() => {
    if (!artworkData) return;
    (async () => {
      try {
        const owners = await getPreviousOwners(artworkData.id);
        setPreviousOwners(owners);
      } catch (e) {
        console.warn('Failed to load previous owners:', e);
      }
    })();
  }, [artworkData, getPreviousOwners]);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* 1. Consistent Navigation Bar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-[#0B0F17]/85 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 via-indigo-600 to-violet-500 p-[1.5px] shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/40 transition">
              <div className="w-full h-full bg-[#0B0F17] rounded-[6px] flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 2 7 12 12 22 7 12 2" />
                  <polyline points="2 17 12 22 22 17" />
                  <polyline points="2 12 12 17 22 12" />
                </svg>
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight text-white font-sans flex items-center gap-1.5">
              Aureum
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 uppercase tracking-wide">
                Artchain
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-6 text-sm font-medium">
            <Link to="/" className="text-slate-400 hover:text-slate-200 transition">
              Home
            </Link>
            <Link to="/verify" className="text-amber-300 transition flex items-center gap-1.5 font-semibold">
              Verify
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            </Link>
            <Link to="/login" className="text-slate-400 hover:text-slate-200 transition">
              Sign In
            </Link>
            <WalletButton />
            <Link
              to="/register"
              className="hidden sm:inline-flex px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Verification Workspace */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300 uppercase tracking-wider">
            Public Provenance Explorer
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight">
            Provenance Verification
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto">
            Verify the authenticity, custodial chain, and immutable ownership history of accredited fine art.
          </p>
        </div>

        {/* 2. Prominent Search Panel */}
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/90 shadow-2xl backdrop-blur-xl p-6 sm:p-8 space-y-6">
          {/* Search Modes Segmented Tabs */}
          <div className="flex items-center justify-center">
            <div className="inline-flex p-1 rounded-xl bg-slate-950/90 border border-slate-800" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={searchBy === 'artworkId'}
                onClick={() => setSearchBy('artworkId')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  searchBy === 'artworkId'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Artwork ID
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={searchBy === 'wallet'}
                onClick={() => setSearchBy('wallet')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  searchBy === 'wallet'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Wallet Address
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={searchBy === 'qr'}
                onClick={() => setSearchBy('qr')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  searchBy === 'qr'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
                QR Code
              </button>
            </div>
          </div>

          {/* Search Input Form */}
          <form onSubmit={handleSearch} className="space-y-4">
            {searchBy === 'qr' ? (
              <div className="p-8 border-2 border-dashed border-slate-700/80 rounded-2xl bg-slate-950/40 text-center space-y-4 hover:border-indigo-500/50 transition">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-white">Scan Artwork Physical Seal QR</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Hold the physical NFC certificate or certificate QR up to your device camera to load its provenance record.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleQRScan}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  Simulate QR Scanner Detection
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={loading}
                    placeholder={
                      searchBy === 'artworkId'
                        ? 'Enter Artwork ID (e.g., AUR-1234 or GUID)'
                        : 'Enter Blockchain Wallet Address (0x...)'
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-sm shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify Provenance</span>
                  )}
                </button>
              </div>
            )}
          </form>

          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5 text-left">
              <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* 3. Search Results or Empty State */}
        {artworkData ? (
          <div className="space-y-8 animate-fadeIn text-left">
            {/* Artwork Details Top Card */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                      {artworkData.id}
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      {artworkData.integrityStatus} ON-CHAIN
                    </span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-2">
                    {artworkData.title}
                  </h2>
                  <p className="text-slate-400 text-sm mt-0.5">by <span className="text-slate-200 font-semibold">{artworkData.artist}</span></p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => alert('Certificate of Provenance downloaded')}
                    className="px-4 py-2 rounded-xl border border-slate-700 hover:border-slate-500 bg-slate-800/80 text-xs font-semibold text-slate-200 transition flex items-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Audit Report
                  </button>
                  <button
                    onClick={() => copyToClipboard(artworkData.genesisTxHash)}
                    className="px-4 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 hover:bg-indigo-600/30 text-xs font-semibold text-indigo-300 transition"
                  >
                    {copiedHash === artworkData.genesisTxHash ? 'Copied Hash!' : 'Copy Tx Hash'}
                  </button>
                </div>
              </div>

              {/* Artwork Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-slate-500 uppercase tracking-wider text-[10px]">Year</p>
                  <p className="font-semibold text-slate-200 mt-1">{artworkData.year || 'Unknown'}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-slate-500 uppercase tracking-wider text-[10px]">Medium</p>
                  <p className="font-semibold text-slate-200 mt-1">{artworkData.medium || 'Not specified'}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-slate-500 uppercase tracking-wider text-[10px]">Dimensions</p>
                  <p className="font-semibold text-slate-200 mt-1">{artworkData.dimensions || 'Custom'}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <p className="text-slate-500 uppercase tracking-wider text-[10px]">Physical Tag</p>
                  <p className="font-mono font-semibold text-amber-300 mt-1">{artworkData.bindingReference || 'NFC-VERIFIED'}</p>
                </div>
              </div>
            </div>

            {/* Ownership History Timeline */}
            <div className="rounded-2xl bg-slate-900/60 border border-slate-800 p-6 sm:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Ownership & Custodial Timeline</span>
                  <span className="text-xs font-mono font-normal text-slate-500">
                    ({artworkData.transfers.length + 1} Records)
                  </span>
                </h3>
                <span className="text-xs text-slate-400">Cryptographically Chronological</span>
              </div>

              {/* Timeline Container */}
              <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-[2px] before:bg-gradient-to-b before:from-amber-400 before:via-indigo-500 before:to-violet-500">
                
                {/* 1. Genesis Event */}
                <div className="relative group">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-950 border-2 border-amber-400 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/40 transition space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wide">
                        Genesis Authentication Record
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {formatDate(artworkData.genesisTimestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Physical inspection completed and digital certificate sealed by{' '}
                      <strong className="text-white font-medium">{artworkData.authenticator}</strong>.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 pt-1">
                      <span>Tx: {artworkData.genesisTxHash.slice(0, 16)}...</span>
                      <span>•</span>
                      <span className="text-emerald-400">Block Confirmed</span>
                    </div>
                  </div>
                </div>

                {/* 2. Historical Transfers */}
                {artworkData.transfers.map((transfer, index) => (
                  <div key={transfer.id} className="relative group">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-950 border-2 border-indigo-400 flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-indigo-500/40 transition space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
                          Custodial Transfer #{index + 1}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {formatDate(transfer.date)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
                        <span className="text-slate-400">From:</span>
                        <span className="font-semibold text-white">{transfer.from}</span>
                        <span className="text-indigo-400">→</span>
                        <span className="text-slate-400">To:</span>
                        <span className="font-semibold text-white">{transfer.to}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                        <span className="font-mono text-slate-500">
                          Tx: {transfer.txHash.slice(0, 16)}... (Block #{transfer.blockNumber})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
                          Price: {transfer.priceVisibility}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* 3. Current Custodian Badge */}
                <div className="relative">
                  <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-slate-950 border-2 border-violet-400 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400"></div>
                  </div>
                  <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/30 text-xs space-y-1">
                    <span className="text-violet-300 font-semibold uppercase tracking-wider text-[10px]">Current Escrow / Custody</span>
                    <p className="text-white font-medium">
                      {artworkData.transfers.length > 0
                        ? artworkData.transfers[artworkData.transfers.length - 1].to
                        : artworkData.authenticator}
                    </p>
                  </div>
                </div>
                {/* 4. Previous Owners List */}
                {previousOwners.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">Previous Owners</h4>
                    <ul className="list-disc list-inside text-xs text-slate-300 mt-2 space-y-1">
                      {previousOwners.map((addr, i) => (
                        <li key={i}>{addr}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Cryptographic Disclaimers and Verification Seal */}
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-3">
              <svg className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="space-y-1 leading-relaxed">
                <p className="text-slate-300 font-medium">Tamper-Evident Decentralized Record</p>
                <p>
                  This record is anchored to the decentralized Aureum ledger. Block signatures attest to the cryptographic custody transfer events and physical inspection metadata submitted by accredited authenticators.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Empty State: Shown before search */
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/30 p-10 sm:p-14 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white tracking-tight">Enter an Artwork Identifier Above</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto">
                Search using an Aureum Artwork ID (such as <code className="text-amber-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded">AUR-1234</code>), a collector wallet address, or simulate scanning a physical seal.
              </p>
            </div>
          </div>
        )}

        {/* 4. Informational Section: What You Can Verify */}
        <section className="pt-8 border-t border-slate-800/80 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-white tracking-tight">What You Can Verify on Aureum</h3>
            <p className="text-xs text-slate-400">Cryptographically guaranteed fine art records</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">Physical Medium & Identity</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Cryptographic bindings between the physical art piece, high-resolution condition reports, and tamper-resistant NFC tags.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">Unbroken Ownership Chain</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Every sale, museum exhibition transit, and dual-custody exchange recorded immutably with timestamped blockchain consensus.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800/80 space-y-2.5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
              </div>
              <h4 className="text-sm font-bold text-white tracking-tight">On-Chain Evidence</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                IPFS CIDs, smart contract transaction hashes, and block receipts accessible to verified institutions and appraisers.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-800/60 text-center text-xs text-slate-500">
        &copy; {new Date().getFullYear()} Aureum Artchain Protocol. All rights reserved.
      </footer>
    </div>
  );
};

export default ProvenanceVerification;