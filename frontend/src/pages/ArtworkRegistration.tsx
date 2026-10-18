import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { artworkApi, ipfsApi } from '../services/api';
import { useWallet } from '../contexts/WalletContext';
import WalletButton from '../components/WalletButton';

const ArtworkRegistration: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    artist: '',
    year: '',
    medium: '',
    dimensions: '',
    edition: '',
    authenticationMethod: '',
    bindingReference: '',
    images: [] as File[],
    documents: [] as File[],
  });
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target;
    const { name, value, type } = target;

    if (name === 'images' || name === 'documents') {
      const inputElement = target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: Array.from(inputElement.files || []),
      }));
    } else if (type === 'checkbox') {
      const inputElement = target as HTMLInputElement;
      setFormData(prev => ({
        ...prev,
        [name]: inputElement.checked,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const { account } = useWallet();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let uploadedImageCids: string[] = [];
      let uploadedDocCids: string[] = [];

      // Upload images to IPFS if provided
      if (formData.images.length > 0) {
        try {
          const res = await ipfsApi.uploadMultiple(formData.images);
          if (res.data?.files) {
            uploadedImageCids = res.data.files.map((f: any) => f.cid);
          }
        } catch (ipfsErr) {
          console.warn('Could not pin images to IPFS:', ipfsErr);
        }
      }

      // Upload documents to IPFS if provided
      if (formData.documents.length > 0) {
        try {
          const res = await ipfsApi.uploadMultiple(formData.documents);
          if (res.data?.files) {
            uploadedDocCids = res.data.files.map((f: any) => f.cid);
          }
        } catch (ipfsErr) {
          console.warn('Could not pin documents to IPFS:', ipfsErr);
        }
      }

      const artworkData = {
        title: formData.title,
        artist: formData.artist,
        year: formData.year || undefined,
        medium: formData.medium,
        dimensions: formData.dimensions,
        edition: formData.edition || '1 of 1',
        authenticationMethod: formData.authenticationMethod || 'NFC Cryptographic Provenance Anchor',
        bindingReference: formData.bindingReference || `NFC-UUID-${Date.now()}`,
        imageCids: uploadedImageCids,
        documentCids: uploadedDocCids,
        ownerId: 'current-institution-id',
        ownerAddress: account || undefined,
      };

      const res = await artworkApi.create(artworkData);
      const onChainId = res.data?.blockchainArtworkId;
      const txHash = res.data?.txHash;

      const successMsg = onChainId
        ? `Genesis Record #${onChainId} created on-chain (Tx: ${txHash?.slice(0, 10)}...) with physical NFC binding.`
        : `Genesis Record created for "${formData.title}" with physical NFC binding.`;

      setSuccess(successMsg);
      setTimeout(() => {
        navigate('/institution/dashboard');
      }, 2500);
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err?.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToStep = (stepNumber: number) => {
    setStep(stepNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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
              <p className="text-[11px] text-slate-400 -mt-0.5 hidden sm:block">Genesis Registry</p>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <WalletButton />
            <Link to="/institution/dashboard" className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300">
              Institution Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-300 uppercase tracking-wider mb-2">
            Provenance Genesis
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Register New Artwork
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Create an immutable on-chain record linked to physical NFC cryptographic binding.
          </p>
        </div>

        {/* Step Indicators */}
        <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 grid grid-cols-4 gap-2 text-center text-xs font-semibold">
          {[
            { num: 1, label: 'Artwork' },
            { num: 2, label: 'Authentication' },
            { num: 3, label: 'Documents' },
            { num: 4, label: 'Review' },
          ].map(s => (
            <button
              key={s.num}
              type="button"
              onClick={() => goToStep(s.num)}
              className={`py-2 px-1 rounded-xl transition ${
                step === s.num
                  ? 'bg-indigo-600 text-white shadow-md'
                  : step > s.num
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span className="block sm:inline">{s.num}. </span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            {success}
          </div>
        )}

        {/* Form Container */}
        <div className="p-6 sm:p-8 rounded-2xl bg-slate-900/70 border border-slate-800 shadow-xl backdrop-blur-xl">
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">1. Artwork Details</h2>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    placeholder="e.g., The Starry Night"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Artist *</label>
                  <input
                    type="text"
                    name="artist"
                    value={formData.artist}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Vincent van Gogh"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Year / Date</label>
                    <input
                      type="text"
                      name="year"
                      value={formData.year}
                      onChange={handleChange}
                      placeholder="e.g., 1889"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Edition (optional)</label>
                    <input
                      type="text"
                      name="edition"
                      value={formData.edition}
                      onChange={handleChange}
                      placeholder="e.g., 1 of 1, Unique"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Medium *</label>
                    <input
                      type="text"
                      name="medium"
                      value={formData.medium}
                      onChange={handleChange}
                      required
                      placeholder="e.g., Oil on canvas"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Dimensions *</label>
                    <input
                      type="text"
                      name="dimensions"
                      value={formData.dimensions}
                      onChange={handleChange}
                      required
                      placeholder="e.g., 73.7 cm × 92.1 cm"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition cursor-pointer"
                >
                  Next: Authentication &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">2. Authentication Protocol</h2>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Authentication Method *</label>
                  <select
                    name="authenticationMethod"
                    value={formData.authenticationMethod}
                    onChange={handleChange}
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">Select verification method</option>
                    <option value="connoisseurship">Guild Connoisseurship Review</option>
                    <option value="scientific">Scientific Radiocarbon & Pigment Analysis</option>
                    <option value="catalogue_raisonne">Catalogue Raisonné Match</option>
                    <option value="historical_documentation">Historical Chain of Documentation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Physical Binding Reference (NFC / QR / Spectral)</label>
                  <textarea
                    name="bindingReference"
                    value={formData.bindingReference}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Enter security tag ID, micro-engraving reference, or optical fingerprint hash"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => goToStep(1)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition cursor-pointer"
                >
                  Next: Documentation &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">3. Supporting Documentation</h2>
              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Artwork Visual Records (JPEG, PNG, TIFF)</label>
                  <input
                    type="file"
                    name="images"
                    multiple
                    accept=".jpg,.jpeg,.png,.tiff"
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Multi-angle photographs, verso stamps, and high-res signature details.</p>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Authenticity & Provenance Documents (PDF)</label>
                  <input
                    type="file"
                    name="documents"
                    multiple
                    accept=".pdf"
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 text-slate-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Laboratory reports, historical auction invoices, and guild certificates.</p>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => goToStep(2)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={() => goToStep(4)}
                  className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md transition cursor-pointer"
                >
                  Next: Review &rarr;
                </button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-bold text-white border-b border-slate-800 pb-3">4. Review & Create Genesis Record</h2>
              <div className="space-y-3 text-xs bg-slate-950/80 p-4 rounded-xl border border-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400">Artwork:</span>
                  <span className="text-white font-semibold">{formData.title || 'Untitled'} ({formData.year || 'N/A'})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Artist:</span>
                  <span className="text-white font-semibold">{formData.artist || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Medium & Dimensions:</span>
                  <span className="text-slate-300">{formData.medium} • {formData.dimensions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verification Method:</span>
                  <span className="text-emerald-400 font-semibold">{formData.authenticationMethod || 'Guild Review'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">NFC Reference:</span>
                  <span className="font-mono text-indigo-400">{formData.bindingReference || 'NFC-SECURE-PENDING'}</span>
                </div>
              </div>

              <div className="pt-4 flex justify-between">
                <button
                  type="button"
                  onClick={() => goToStep(3)}
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition cursor-pointer"
                >
                  &larr; Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/30 transition cursor-pointer flex items-center gap-2"
                >
                  {loading ? 'Anchoring to Ledger...' : 'Anchoring Genesis Record'}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 border-t border-slate-800/60 text-center text-xs text-slate-500 mt-auto">
        &copy; 2026 Aureum Artchain Protocol. All rights reserved.
      </footer>
    </div>
  );
};

export default ArtworkRegistration;