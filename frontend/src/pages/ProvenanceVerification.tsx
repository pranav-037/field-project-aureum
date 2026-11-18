import React, { useState, useEffect, useRef, useCallback } from 'react';
import { artworkApi } from '../services/api';
import Navbar from '../components/Navbar';
import { useArtchainContract } from '../hooks/useArtchainContract';
import { QRCodeSVG } from 'qrcode.react';

interface DetectedQrCode {
  rawValue: string;
}

interface QrBarcodeDetector {
  detect(source: HTMLVideoElement | ImageBitmap): Promise<DetectedQrCode[]>;
}

type QrBarcodeDetectorConstructor = new (options: { formats: string[] }) => QrBarcodeDetector;

interface DemoArtwork {
  id: string;
  blockchainArtworkId?: string | null;
  title: string;
  artist: string;
}

interface TransferRecord {
  id: string;
  date: string;
  from: string;
  to: string;
  status: string;
  priceVisibility: string;
  txHash?: string;
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
  currentOwnerName?: string | null;
  currentOwnerWalletAddress?: string | null;
  metadataCid?: string;
  bindingReference?: string;
  onChainVerified?: boolean;
  transfers: TransferRecord[];
}

function getDisplayArtworkId(artwork: Pick<DemoArtwork, 'id' | 'blockchainArtworkId'>): string {
  return `AUR-${artwork.blockchainArtworkId || artwork.id.slice(0, 8)}`;
}

function getArtworkIdFromQr(rawValue: string): string {
  try {
    const url = new URL(rawValue);
    const artworkId = url.searchParams.get('artworkId') || url.searchParams.get('id');
    if (artworkId) return artworkId;
    const pathId = url.pathname.match(/\/(?:artworks?|verify)\/([^/]+)\/?$/i)?.[1];
    if (pathId) return decodeURIComponent(pathId);
  } catch {
    // QR payloads may contain a plain artwork identifier instead of a URL.
  }
  return rawValue.trim();
}

const ProvenanceVerification: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('artworkId') || params.get('id') || '';
  });
  const [searchBy, setSearchBy] = useState<'artworkId' | 'wallet' | 'qr'>('artworkId');
  const [artworkData, setArtworkData] = useState<ArtworkData | null>(null);
  const [searchResults, setSearchResults] = useState<ArtworkData[]>([]);
  const [demoArtworks, setDemoArtworks] = useState<DemoArtwork[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [previousOwners, setPreviousOwners] = useState<string[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const scanTimerRef = useRef<number | null>(null);

  const { getPreviousOwners } = useArtchainContract();

  const performLookup = useCallback(async (query: string, type: 'artworkId' | 'wallet') => {
    setError(null);
    setPreviousOwners([]);
    setLoading(true);

    try {
      const lookupResponse = await artworkApi.lookup(type, query.trim());
      const rawArtworks: Record<string, any>[] = Array.isArray(lookupResponse.data?.artworks)
        ? lookupResponse.data.artworks
        : [];
      if (rawArtworks.length === 0) {
        setSearchResults([]);
        setArtworkData(null);
        setError(type === 'wallet'
          ? `No artwork records are linked to wallet "${query.trim()}". Wallet verification checks current owners and recorded transfer parties.`
          : `No artwork records were found for "${query.trim()}".`);
        return;
      }

      const records = await Promise.all(rawArtworks.map(async (raw): Promise<ArtworkData> => {
        let onChainVerified = false;
        try {
          const provenanceResponse = await artworkApi.getProvenance(raw.id);
          onChainVerified = provenanceResponse.data?.source === 'BLOCKCHAIN_VERIFIED';
        } catch (provenanceError) {
          console.warn(`Could not load provenance status for artwork ${raw.id}:`, provenanceError);
        }

        let transfers: TransferRecord[] = [];
        try {
          const transferResponse = await artworkApi.getTransfers(raw.id);
          if (Array.isArray(transferResponse.data)) {
            transfers = transferResponse.data.map((transfer: Record<string, any>) => ({
              id: transfer.id,
              date: transfer.transferDate || transfer.createdAt,
              from: transfer.sellerName || transfer.sellerWalletAddress || transfer.sellerId || 'Initial Registry',
              to: transfer.buyerName || transfer.buyerWalletAddress || transfer.buyerAddress || transfer.buyerId || 'Custodian',
              status: transfer.status || 'RECORDED',
              priceVisibility: transfer.priceVisibility || 'PARTIES_AND_AUTHORISED',
              txHash: transfer.txHash || undefined,
              blockNumber: transfer.blockNumber || 0,
            }));
          }
        } catch (transferError) {
          console.warn(`Could not load transfer history for artwork ${raw.id}:`, transferError);
        }

        return {
          id: raw.id,
          blockchainArtworkId: raw.blockchainArtworkId,
          title: raw.title,
          artist: raw.artist,
          year: raw.year,
          medium: raw.medium,
          dimensions: raw.dimensions,
          authenticator: raw.authenticatorName || 'Aureum Certified Authenticator',
          genesisTimestamp: raw.createdAt,
          genesisTxHash: raw.txHash || '',
          status: raw.status || 'REGISTERED',
          integrityStatus: onChainVerified
            ? 'CRYPTOGRAPHICALLY VERIFIED'
            : raw.blockchainArtworkId
                ? 'BLOCKCHAIN ID REGISTERED'
              : 'DATABASE RECORD',
          currentOwnerName: raw.currentOwnerName,
          currentOwnerWalletAddress: raw.currentOwnerWalletAddress,
          metadataCid: raw.metadataCid,
          bindingReference: raw.bindingReference,
          onChainVerified,
          transfers,
        };
      }));

      setSearchResults(records);
      setArtworkData(records[0]);
    } catch (lookupError: unknown) {
      const responseError = typeof lookupError === 'object' && lookupError !== null
        && 'response' in lookupError
        ? (lookupError as { response?: { data?: { error?: string } } }).response?.data?.error
        : undefined;
      setSearchResults([]);
      setArtworkData(null);
      setError(responseError || (lookupError instanceof Error
        ? lookupError.message
        : 'Unable to verify artwork at this time. Please try again.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    if (!searchQuery.trim()) {
      setError(searchBy === 'wallet'
        ? 'Enter a complete wallet address.'
        : 'Please provide an artwork identifier.');
      return;
    }
    void performLookup(searchQuery, searchBy === 'wallet' ? 'wallet' : 'artworkId');
  };

  const stopQrScan = useCallback(() => {
    if (scanTimerRef.current !== null) {
      window.clearTimeout(scanTimerRef.current);
      scanTimerRef.current = null;
    }
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  const startQrScan = async () => {
    const Detector = (window as Window & { BarcodeDetector?: QrBarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) {
      setError('QR scanning is not supported by this browser. Use a current Chrome or Edge browser, or enter the artwork ID from the QR code.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera access is unavailable. Enter the artwork ID from the QR code instead.');
      return;
    }

    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      cameraStreamRef.current = stream;
      setCameraActive(true);
      if (!videoRef.current) {
        stopQrScan();
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new Detector({ formats: ['qr_code'] });

      const scan = async () => {
        if (!cameraStreamRef.current?.active || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          const rawValue = codes[0]?.rawValue;
          if (rawValue) {
            const artworkId = getArtworkIdFromQr(rawValue);
            stopQrScan();
            setSearchBy('artworkId');
            setSearchQuery(artworkId);
            void performLookup(artworkId, 'artworkId');
            return;
          }
          scanTimerRef.current = window.setTimeout(() => { void scan(); }, 180);
        } catch (scanError) {
          stopQrScan();
          setError(scanError instanceof Error ? scanError.message : 'Could not read the QR code.');
        }
      };
      void scan();
    } catch (cameraError) {
      stopQrScan();
      setError(cameraError instanceof Error
        ? `Could not start the camera: ${cameraError.message}`
        : 'Could not start the camera. Check browser camera permissions.');
    }
  };

  const handleQrImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const Detector = (window as Window & { BarcodeDetector?: QrBarcodeDetectorConstructor }).BarcodeDetector;
    if (!Detector) {
      setError('QR image decoding is not supported by this browser. Use a current Chrome or Edge browser.');
      return;
    }
    try {
      const image = await createImageBitmap(file);
      const codes = await new Detector({ formats: ['qr_code'] }).detect(image);
      image.close();
      const rawValue = codes[0]?.rawValue;
      if (!rawValue) {
        setError('No QR code was found in that image.');
        return;
      }
      const artworkId = getArtworkIdFromQr(rawValue);
      setSearchBy('artworkId');
      setSearchQuery(artworkId);
      void performLookup(artworkId, 'artworkId');
    } catch (imageError) {
      setError(imageError instanceof Error ? imageError.message : 'Could not read the QR image.');
    }
  };

  useEffect(() => {
    void artworkApi.getAll()
      .then(({ data }) => {
        if (Array.isArray(data)) {
          setDemoArtworks(data.map((artwork: Record<string, any>) => ({
            id: artwork.id,
            blockchainArtworkId: artwork.blockchainArtworkId,
            title: artwork.title,
            artist: artwork.artist,
          })));
        }
      })
      .catch((loadError: unknown) => {
        console.error('Could not load live demo artwork identifiers:', loadError);
      });

    const params = new URLSearchParams(window.location.search);
    const artworkId = params.get('artworkId') || params.get('id');
    const lookupTimer = artworkId
      ? window.setTimeout(() => { void performLookup(artworkId, 'artworkId'); }, 0)
      : null;
    return () => {
      if (lookupTimer !== null) window.clearTimeout(lookupTimer);
    };
  }, [performLookup]);

  useEffect(() => () => {
    if (scanTimerRef.current !== null) window.clearTimeout(scanTimerRef.current);
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

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
    const blockchainArtworkId = artworkData?.blockchainArtworkId;
    if (!blockchainArtworkId) return;
    (async () => {
      try {
        const owners = await getPreviousOwners(blockchainArtworkId);
        setPreviousOwners(owners);
      } catch (e) {
        console.warn('Failed to load previous owners:', e);
      }
    })();
  }, [artworkData?.blockchainArtworkId, getPreviousOwners]);

  return (
    <div className="aureum-theme min-h-screen bg-[#FAF9F6] text-[#18181B] flex flex-col selection:bg-orange-100 selection:text-[#1E3A2F]">
      {/* 1. Consistent Navigation Bar */}
      <Navbar />

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
            Inspect artwork records, custody history, and available blockchain verification evidence.
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
                    Scan a certificate QR with your camera, or upload an image of the QR code.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { void (cameraActive ? stopQrScan() : startQrScan()); }}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition cursor-pointer"
                >
                  {cameraActive ? 'Stop camera scan' : 'Scan with camera'}
                </button>
                <label className="block text-xs text-indigo-300 cursor-pointer">
                  Or choose a QR image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => { void handleQrImage(event); }}
                    className="sr-only"
                  />
                </label>
                {cameraActive && (
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    className="mx-auto max-h-64 w-full max-w-md rounded-xl border border-slate-700 bg-black"
                  />
                )}
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
                        ? 'Enter a registered AUR ID, UUID, or binding reference'
                        : 'Enter a complete wallet address (0x...)'
                    }
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50 focus:border-gold-500/50 transition font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-gold-500 via-amber-500 to-gold-600 hover:from-gold-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg shadow-gold-500/20 hover:shadow-gold-500/40 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-slate-950" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Verifying Ledger...</span>
                    </>
                  ) : (
                    <span>Verify Provenance</span>
                  )}
                </button>
              </div>
            )}
          </form>

          <div className="space-y-2 pt-1 text-center">
            <p className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
              Live demo artwork IDs ({demoArtworks.length})
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {demoArtworks.map((artwork) => {
                const identifier = getDisplayArtworkId(artwork);
                return (
                  <button
                    key={artwork.id}
                    type="button"
                    onClick={() => {
                      setSearchBy('artworkId');
                      setSearchQuery(identifier);
                      void performLookup(identifier, 'artworkId');
                    }}
                    title={`${artwork.title} — ${artwork.artist}`}
                    className="px-2.5 py-1 rounded-full bg-slate-900 border border-slate-700 hover:border-gold-500/50 text-slate-300 font-mono text-[11px] transition"
                  >
                    {identifier}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              IDs include every registered artwork, including those involved in incoming and outgoing transfers.
            </p>
          </div>

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

        {searchResults.length > 1 && (
          <section className="space-y-3" aria-live="polite">
            <h2 className="text-sm font-semibold text-slate-300">
              {searchResults.length} artwork records match this wallet
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {searchResults.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => {
                    setPreviousOwners([]);
                    setArtworkData(record);
                  }}
                  className={`rounded-xl border p-4 text-left transition ${
                    artworkData?.id === record.id
                      ? 'border-amber-500/60 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-indigo-500/50'
                  }`}
                >
                  <span className="font-mono text-xs text-amber-300">
                    {getDisplayArtworkId(record)}
                  </span>
                  <span className="mt-1 block font-semibold text-white">{record.title}</span>
                  <span className="mt-1 block text-xs text-slate-400">
                    {record.artist} · {record.integrityStatus}
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* 3. Search Results or Empty State */}
        {artworkData ? (
          <div className="space-y-8 animate-fadeIn text-left">
            {/* Archival Certificate of Authenticity */}
            <div className="relative rounded-3xl p-1 bg-gradient-to-b from-gold-500/40 via-slate-800/60 to-slate-900/90 shadow-2xl shadow-black/80">
              <div className="rounded-[22px] guilloche-bg p-6 sm:p-10 space-y-8 border border-gold-500/20">
                {/* Certificate Header Banner */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gold-500/20">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        artworkData.onChainVerified ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400'
                      }`}></span>
                      <span className="text-[10px] uppercase tracking-[0.25em] font-display font-bold text-gold-300">
                        ARTWORK VERIFICATION RECORD
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400">
                      {artworkData.onChainVerified
                        ? 'ON-CHAIN PROVENANCE VERIFIED'
                        : 'DATABASE RECORD — ON-CHAIN VERIFICATION NOT CONFIRMED'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => window.print()}
                      className="px-4 py-2 rounded-xl border border-gold-500/40 hover:border-gold-400 bg-gold-500/10 hover:bg-gold-500/20 text-xs font-semibold text-gold-300 transition flex items-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                      </svg>
                      Print Official Record
                    </button>
                    {artworkData.genesisTxHash && (
                      <button
                        onClick={() => copyToClipboard(artworkData.genesisTxHash)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 transition cursor-pointer"
                      >
                        {copiedHash === artworkData.genesisTxHash ? 'Copied Hash!' : 'Copy Hash'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Masterpiece Title & Credentials */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-black/60 text-gold-300 border border-gold-500/30">
                        {artworkData.id}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                        artworkData.onChainVerified
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          artworkData.onChainVerified ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                        }`}></span>
                        {artworkData.integrityStatus}
                      </span>
                    </div>
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-light text-white tracking-tight mt-3">
                      {artworkData.title}
                    </h2>
                    <p className="text-slate-300 text-base sm:text-lg font-serif italic mt-1">
                      Attributed to <span className="text-gold-200 font-normal">{artworkData.artist}</span>
                    </p>
                  </div>

                  {/* Archival Seal Stamp */}
                  <div className="self-start md:self-auto px-4 py-3 rounded-2xl bg-black/60 border border-gold-500/30 flex items-center gap-3.5 backdrop-blur-md">
                    <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/30 flex items-center justify-center text-gold-400">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                        <polyline points="2 12 12 17 22 12" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] font-display uppercase tracking-widest text-gold-400 font-bold">AUREUM REGISTRY</p>
                      <p className="text-[11px] font-mono text-slate-400">ARTWORK RECORD</p>
                    </div>
                  </div>
                </div>

                {/* Artwork Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-2">
                  <div className="p-4 rounded-xl bg-black/40 border border-slate-800">
                    <p className="text-slate-500 uppercase tracking-widest text-[10px] font-medium">Creation Year</p>
                    <p className="font-semibold text-slate-100 mt-1 font-serif text-sm">{artworkData.year || 'Circa Modern'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-slate-800">
                    <p className="text-slate-500 uppercase tracking-widest text-[10px] font-medium">Medium & Support</p>
                    <p className="font-semibold text-slate-100 mt-1 line-clamp-1">{artworkData.medium || 'Oil on Canvas'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-slate-800">
                    <p className="text-slate-500 uppercase tracking-widest text-[10px] font-medium">Dimensions</p>
                    <p className="font-semibold text-slate-100 mt-1">{artworkData.dimensions || 'Archival Custom'}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-slate-800">
                    <p className="text-slate-500 uppercase tracking-widest text-[10px] font-medium">Physical Cryptoseal</p>
                    <p className="font-mono font-semibold text-gold-300 mt-1">{artworkData.bindingReference || 'NFC-VERIFIED'}</p>
                  </div>
                </div>

                <div className="grid gap-4 rounded-2xl border border-slate-800 bg-black/30 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="space-y-2 text-xs">
                    <p className="text-slate-400">
                      Public Artwork ID:{' '}
                      <span className="font-mono text-gold-300">{getDisplayArtworkId(artworkData)}</span>
                    </p>
                    <p className="text-slate-400">
                      Blockchain ID:{' '}
                      <span className="font-mono text-slate-200">{artworkData.blockchainArtworkId || 'Not anchored'}</span>
                    </p>
                    <p className="text-slate-400">
                      Current custodian:{' '}
                      <span className="text-slate-200">{artworkData.currentOwnerName || 'Not identified'}</span>
                    </p>
                    {artworkData.currentOwnerWalletAddress && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(artworkData.currentOwnerWalletAddress!)}
                        className="break-all text-left font-mono text-indigo-300 hover:text-indigo-200"
                      >
                        Wallet: {artworkData.currentOwnerWalletAddress}
                        {copiedHash === artworkData.currentOwnerWalletAddress ? ' (copied)' : ''}
                      </button>
                    )}
                  </div>
                  <div className="justify-self-center rounded-lg bg-white p-2 text-center">
                    <QRCodeSVG
                      value={`${window.location.origin}/verify?artworkId=${encodeURIComponent(getDisplayArtworkId(artworkData))}`}
                      size={112}
                      level="M"
                      title={`Verify ${artworkData.title}`}
                    />
                    <p className="mt-1 text-[9px] text-slate-700">Scan to verify</p>
                  </div>
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
                <span className="text-xs text-slate-400">
                  {artworkData.onChainVerified ? 'Blockchain verified' : 'Database history'}
                </span>
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
                        Artwork Registration Record
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {formatDate(artworkData.genesisTimestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Artwork registered in Aureum by{' '}
                      <strong className="text-white font-medium">{artworkData.authenticator}</strong>.
                    </p>
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500 pt-1">
                      {artworkData.genesisTxHash
                        ? <span>Tx: {artworkData.genesisTxHash.slice(0, 16)}...</span>
                        : <span>No genesis transaction hash recorded</span>}
                      {artworkData.onChainVerified && (
                        <>
                          <span>•</span>
                          <span className="text-emerald-400">Blockchain verified</span>
                        </>
                      )}
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
                          {transfer.txHash
                            ? `Tx: ${transfer.txHash.slice(0, 16)}... (Block #${transfer.blockNumber})`
                            : `Status: ${transfer.status}`}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-300 font-mono">
                            {transfer.status}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400 font-mono">
                            Price: {transfer.priceVisibility}
                          </span>
                        </div>
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
                    <span className="text-violet-300 font-semibold uppercase tracking-wider text-[10px]">Current Custodian</span>
                    <p className="text-white font-medium">
                      {artworkData.currentOwnerName ||
                        artworkData.currentOwnerWalletAddress ||
                        artworkData.transfers[artworkData.transfers.length - 1]?.to ||
                        artworkData.authenticator}
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
                <p className="text-slate-300 font-medium">
                  {artworkData.onChainVerified ? 'Blockchain-Verified Record' : 'Registered Artwork Record'}
                </p>
                <p>
                  {artworkData.onChainVerified
                    ? 'This artwork has a provenance record confirmed by the Aureum blockchain.'
                    : 'This artwork is present in the Aureum registry. Its blockchain provenance has not been confirmed, so this page does not claim cryptographic verification.'}
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
                    Search the live registry by artwork ID or wallet address, or scan a certificate QR code.
              </p>
            </div>
          </div>
        )}

        {/* 4. Informational Section: What You Can Verify */}
        <section className="pt-8 border-t border-slate-800/80 space-y-6">
          <div className="text-center space-y-1">
            <h3 className="text-xl font-bold text-white tracking-tight">What You Can Verify on Aureum</h3>
            <p className="text-xs text-slate-400">Artwork identity, recorded custody, and available chain evidence</p>
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
                Review the artwork's registered medium, dimensions, and physical seal reference.
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
                Inspect the ownership and transfer events recorded for this artwork.
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