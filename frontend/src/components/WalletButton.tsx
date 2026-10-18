import React, { useState } from 'react';
import { useWallet, SUPPORTED_NETWORKS } from '../contexts/WalletContext';

export const WalletButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const {
    account,
    chainId,
    networkName,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    switchNetwork,
    formatAddress,
    error,
  } = useWallet();

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const isSupported = chainId ? Boolean(SUPPORTED_NETWORKS[chainId]) : false;

  const handleCopy = () => {
    if (account) {
      navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <div className="relative inline-block">
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold tracking-wide bg-gradient-to-r from-amber-500/20 via-amber-400/10 to-transparent border border-amber-500/40 text-amber-300 hover:border-amber-400 hover:text-amber-200 transition-all shadow-lg shadow-amber-950/30 ${className}`}
        >
          <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" />
          </svg>
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
        </button>
        {error && (
          <div className="absolute top-full mt-2 right-0 w-64 p-2 text-xs bg-red-950/90 border border-red-500/40 text-red-200 rounded-lg shadow-xl z-50">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-mono bg-slate-900/90 border ${
          isSupported ? 'border-amber-500/30 text-amber-200' : 'border-red-500/50 text-red-300'
        } hover:bg-slate-800 transition-all shadow-md ${className}`}
      >
        <span className={`w-2 h-2 rounded-full ${isSupported ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
        <span className="font-semibold">{formatAddress(account)}</span>
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-slate-900/95 border border-slate-700/80 p-3 shadow-2xl backdrop-blur-xl z-50 text-xs space-y-3 font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Network:</span>
            <span className={`font-medium ${isSupported ? 'text-emerald-400' : 'text-red-400'}`}>
              {networkName || 'Unknown Network'}
            </span>
          </div>

          {!isSupported && (
            <div className="bg-red-950/40 border border-red-500/30 rounded-lg p-2 text-[11px] text-red-300 space-y-1">
              <p>Unsupported Network</p>
              <button
                onClick={() => switchNetwork(80002)}
                className="w-full mt-1 bg-red-900/40 hover:bg-red-900/60 border border-red-500/40 text-red-200 py-1 rounded text-center transition"
              >
                Switch to Polygon Amoy
              </button>
            </div>
          )}

          <div className="space-y-1">
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition"
            >
              <span>{copied ? '✓ Copied!' : 'Copy Address'}</span>
              <span className="font-mono text-[10px] text-slate-400">{formatAddress(account)}</span>
            </button>

            <button
              onClick={() => {
                disconnectWallet();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-red-400 hover:bg-red-950/30 hover:text-red-300 transition"
            >
              <span>Disconnect</span>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default WalletButton;
