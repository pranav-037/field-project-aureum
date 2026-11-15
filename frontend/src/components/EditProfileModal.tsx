import React, { useState, useEffect } from 'react';
import type { User, Institution } from '../context/AuthContext';
import { REGIONS_AND_INSTITUTIONS } from '../constants/institutionsByRegion';
import type { InstitutionType } from '../constants/institutionsByRegion';
import { useWallet } from '../contexts/WalletContext';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onSave: (updatedData: Partial<User>) => Promise<void> | void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onSave,
}) => {
  const { account } = useWallet();
  const availableCountries = Object.keys(REGIONS_AND_INSTITUTIONS);

  // Determine initial country
  const initialCountry =
    user.institution?.jurisdiction && availableCountries.includes(user.institution.jurisdiction)
      ? user.institution.jurisdiction
      : 'India';

  const [name, setName] = useState(user.name || '');
  const [email] = useState(user.email || '');
  const role = user.role || 'COLLECTOR';
  const [selectedCountry, setSelectedCountry] = useState(initialCountry);
  const [selectedInstitutionName, setSelectedInstitutionName] = useState(
    user.institution?.name || ''
  );
  const [isCustomInstitution, setIsCustomInstitution] = useState(false);
  const [customInstitutionName, setCustomInstitutionName] = useState('');
  const [institutionType, setInstitutionType] = useState<InstitutionType | string>(
    user.institution?.type || 'Auction House'
  );
  const [registrationNumber, setRegistrationNumber] = useState(
    user.institution?.registrationNumber || ''
  );
  const [institutionWallet, setInstitutionWallet] = useState(
    user.institution?.walletAddress || user.walletAddress || ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever modal opens or user prop changes
  useEffect(() => {
    if (isOpen) {
      setName(user.name || '');
      const country =
        user.institution?.jurisdiction && availableCountries.includes(user.institution.jurisdiction)
          ? user.institution.jurisdiction
          : 'India';
      setSelectedCountry(country);

      const instList = REGIONS_AND_INSTITUTIONS[country] || [];
      const match = instList.find((i) => i.name === user.institution?.name);
      if (match) {
        setSelectedInstitutionName(match.name);
        setInstitutionType(match.type);
        setIsCustomInstitution(false);
        setCustomInstitutionName('');
      } else if (user.institution?.name) {
        setSelectedInstitutionName('__CUSTOM__');
        setIsCustomInstitution(true);
        setCustomInstitutionName(user.institution.name);
        setInstitutionType(user.institution.type || 'Auction House');
      } else {
        setSelectedInstitutionName('');
        setIsCustomInstitution(false);
        setCustomInstitutionName('');
      }

      setRegistrationNumber(user.institution?.registrationNumber || '');
      setInstitutionWallet(user.institution?.walletAddress || user.walletAddress || '');
      setError(null);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Handle country change: update institution list cascade
  const handleCountryChange = (country: string) => {
    setSelectedCountry(country);
    const countryOptions = REGIONS_AND_INSTITUTIONS[country] || [];
    if (countryOptions.length > 0) {
      setSelectedInstitutionName(countryOptions[0].name);
      setInstitutionType(countryOptions[0].type);
      setIsCustomInstitution(false);
      setCustomInstitutionName('');
    } else {
      setSelectedInstitutionName('__CUSTOM__');
      setIsCustomInstitution(true);
      setCustomInstitutionName('');
    }
  };

  // Handle institution dropdown change
  const handleInstitutionSelect = (instName: string) => {
    setSelectedInstitutionName(instName);
    if (instName === '__CUSTOM__') {
      setIsCustomInstitution(true);
      setCustomInstitutionName('');
    } else {
      setIsCustomInstitution(false);
      setCustomInstitutionName('');
      const countryOptions = REGIONS_AND_INSTITUTIONS[selectedCountry] || [];
      const selected = countryOptions.find((i) => i.name === instName);
      if (selected) {
        setInstitutionType(selected.type);
      }
    }
  };

  const handleSyncConnectedWallet = () => {
    if (account) {
      setInstitutionWallet(account);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a full legal name or entity name.');
      return;
    }
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError('Name must be between 2 and 100 characters.');
      return;
    }

    const trimmedWallet = institutionWallet.trim();
    if (trimmedWallet && !/^0x[a-fA-F0-9]{40}$/.test(trimmedWallet)) {
      setError('Enter a valid 42-character wallet address, or leave it blank.');
      return;
    }

    const finalInstitutionName = isCustomInstitution
      ? customInstitutionName.trim()
      : selectedInstitutionName.trim();
    if (isCustomInstitution && (finalInstitutionName.length < 2 || finalInstitutionName.length > 120)) {
      setError('Custom institution name must be between 2 and 120 characters.');
      return;
    }

    const updatedInstitution: Institution = {
      ...(user.institution || {}),
      name: finalInstitutionName || 'Not Assigned',
      jurisdiction: selectedCountry,
      registrationNumber: registrationNumber.trim() || undefined,
      walletAddress: trimmedWallet || undefined,
      type: institutionType,
      status: user.institution?.status || 'APPROVED',
    };

    setSaving(true);
    try {
      await onSave({
        name: trimmedName,
        role,
        walletAddress: trimmedWallet || user.walletAddress,
        institution: updatedInstitution,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const currentInstitutionOptions = REGIONS_AND_INSTITUTIONS[selectedCountry] || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#0F172A] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-[#0B0F17]/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500/20 via-indigo-600/30 to-violet-600/20 border border-amber-500/30 flex items-center justify-center text-amber-300">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Edit Profile & Institutional Credentials
              </h2>
              <p className="text-xs text-slate-400">
                Update legal identity, jurisdiction, and verified art registry affiliations.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Legal Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Full Legal Name / Entity
              </label>
              <input
                type="text"
                required
                minLength={2}
                maxLength={100}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-slate-500 font-normal">(Primary Auth)</span>
              </label>
              <input
                type="email"
                disabled
                value={email}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-slate-400 text-sm cursor-not-allowed"
              />
            </div>
          </div>

          {/* Row 2: Role Display (Locked) & Jurisdiction Country */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Role & Access Level
                </label>
                <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 font-semibold">
                  <svg className="w-3 h-3 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Locked
                </span>
              </div>
              <input
                type="text"
                disabled
                value={
                  role === 'AUTHENTICATOR'
                    ? 'AUTHENTICATOR (Institutional Lab / Expert)'
                    : role === 'ADMIN'
                    ? 'ADMIN (Registry Governance & Auditor)'
                    : role === 'VIEWER'
                    ? 'VIEWER (Public Read-Only Auditor)'
                    : 'COLLECTOR (Private Art Custodian)'
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900/70 border border-slate-800 text-slate-300 text-sm cursor-not-allowed select-none font-medium"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Roles are bound to your verified cryptographic identity and cannot be altered directly.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Jurisdiction Country
              </label>
              <select
                value={selectedCountry}
                onChange={(e) => handleCountryChange(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                {availableCountries.map((c) => (
                  <option key={c} value={c}>
                    {c} {c === 'India' ? '🇮🇳' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 3: Cascading Institution Selection */}
          <div className="space-y-3 p-4 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Affiliated Institution ({selectedCountry})
              </label>
              <span className="text-[11px] text-slate-400 font-mono">
                {currentInstitutionOptions.length} verified art hubs
              </span>
            </div>

            <div>
              <select
                value={selectedInstitutionName}
                onChange={(e) => handleInstitutionSelect(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
              >
                <option value="">-- Select Institution in {selectedCountry} --</option>
                {currentInstitutionOptions.map((opt) => (
                  <option key={opt.name} value={opt.name}>
                    {opt.name} — [{opt.type}]
                  </option>
                ))}
                <option value="__CUSTOM__">+ Other / Independent Organization</option>
              </select>
            </div>

            {/* Custom Institution Input if chosen */}
            {isCustomInstitution && (
              <div className="animate-in fade-in duration-150 pt-2">
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Specify Custom Institution Name
                </label>
                <input
                  type="text"
                  maxLength={120}
                  value={customInstitutionName}
                  onChange={(e) => setCustomInstitutionName(e.target.value)}
                  placeholder="e.g. Metropolitan Art Conservation Bureau"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            )}

            {/* Institution Type Badge / Selector */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Class:</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
                {institutionType}
              </span>
            </div>
          </div>

          {/* Row 4: Registration Number & Wallet Address */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Registration / Regulatory ID
              </label>
              <input
                type="text"
                maxLength={100}
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. REG-IND-2026-8812"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-mono"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Bound Wallet Address
                </label>
                {account && (
                  <button
                    type="button"
                    onClick={handleSyncConnectedWallet}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono"
                  >
                    Sync Web3 Wallet
                  </button>
                )}
              </div>
              <input
                type="text"
                maxLength={42}
                value={institutionWallet}
                onChange={(e) => setInstitutionWallet(e.target.value)}
                placeholder="0x..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/70 border border-slate-700/80 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 transition font-mono"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-indigo-600 to-violet-600 hover:from-amber-400 hover:to-violet-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/30 transition flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Save Credentials
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProfileModal;
