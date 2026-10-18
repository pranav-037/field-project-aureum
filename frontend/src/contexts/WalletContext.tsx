import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  currencySymbol: string;
  blockExplorerUrl?: string;
}

export const SUPPORTED_NETWORKS: Record<number, NetworkConfig> = {
  31337: {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://127.0.0.1:8545',
    currencySymbol: 'ETH',
  },
  80002: {
    chainId: 80002,
    name: 'Polygon Amoy Testnet',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    currencySymbol: 'POL',
    blockExplorerUrl: 'https://amoy.polygonscan.com',
  },
  137: {
    chainId: 137,
    name: 'Polygon Mainnet',
    rpcUrl: 'https://polygon-rpc.com',
    currencySymbol: 'POL',
    blockExplorerUrl: 'https://polygonscan.com',
  },
};

interface WalletContextType {
  account: string | null;
  chainId: number | null;
  networkName: string;
  isConnected: boolean;
  isConnecting: boolean;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchNetwork: (targetChainId: number) => Promise<boolean>;
  formatAddress: (addr?: string | null) => string;
  error: string | null;
}

const WalletContext = createContext<WalletContextType>({
  account: null,
  chainId: null,
  networkName: '',
  isConnected: false,
  isConnecting: false,
  provider: null,
  signer: null,
  connectWallet: async () => {},
  disconnectWallet: () => {},
  switchNetwork: async () => false,
  formatAddress: () => '',
  error: null,
});

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [networkName, setNetworkName] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [error, setError] = useState<string | null>(null);

  const formatAddress = useCallback((addr?: string | null): string => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  }, []);

  const updateNetworkState = useCallback(async (prov: ethers.BrowserProvider) => {
    try {
      const net = await prov.getNetwork();
      const currentChainId = Number(net.chainId);
      setChainId(currentChainId);
      const matched = SUPPORTED_NETWORKS[currentChainId];
      setNetworkName(matched ? matched.name : `Chain ${currentChainId}`);
    } catch (err) {
      console.warn('Could not determine network:', err);
    }
  }, []);

  const connectWallet = useCallback(async () => {
    setError(null);
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setError('MetaMask or Web3 wallet is not detected. Please install MetaMask to interact with the blockchain.');
      return;
    }

    try {
      setIsConnecting(true);
      const browserProvider = new ethers.BrowserProvider((window as any).ethereum);
      
      // Request accounts
      const accounts: string[] = await (window as any).ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts && accounts.length > 0) {
        const checksummed = ethers.getAddress(accounts[0]);
        const browserSigner = await browserProvider.getSigner();
        
        setAccount(checksummed);
        setProvider(browserProvider);
        setSigner(browserSigner);
        await updateNetworkState(browserProvider);
        localStorage.setItem('aureum_wallet_connected', 'true');
      }
    } catch (err: any) {
      if (err.code === 4001) {
        setError('Connection request was rejected in your wallet.');
      } else {
        setError(err.message || 'Failed to connect wallet');
      }
    } finally {
      setIsConnecting(false);
    }
  }, [updateNetworkState]);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setSigner(null);
    setProvider(null);
    setChainId(null);
    setNetworkName('');
    localStorage.removeItem('aureum_wallet_connected');
  }, []);

  const switchNetwork = useCallback(async (targetChainId: number): Promise<boolean> => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return false;
    const targetHex = `0x${targetChainId.toString(16)}`;

    try {
      await (window as any).ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: targetHex }],
      });
      return true;
    } catch (switchError: any) {
      // Error code 4902 indicates chain has not been added to wallet
      if (switchError.code === 4902) {
        const netConfig = SUPPORTED_NETWORKS[targetChainId];
        if (netConfig) {
          try {
            await (window as any).ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: targetHex,
                  chainName: netConfig.name,
                  rpcUrls: [netConfig.rpcUrl],
                  nativeCurrency: {
                    name: netConfig.currencySymbol,
                    symbol: netConfig.currencySymbol,
                    decimals: 18,
                  },
                  blockExplorerUrls: netConfig.blockExplorerUrl ? [netConfig.blockExplorerUrl] : undefined,
                },
              ],
            });
            return true;
          } catch (addError) {
            console.error('Failed to add chain to wallet:', addError);
            return false;
          }
        }
      }
      return false;
    }
  }, []);

  // Listen for account and chain changes
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;
    const eth = (window as any).ethereum;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts && accounts.length > 0) {
        const checksummed = ethers.getAddress(accounts[0]);
        setAccount(checksummed);
        if (provider) {
          const newSigner = await provider.getSigner();
          setSigner(newSigner);
        }
      } else {
        disconnectWallet();
      }
    };

    const handleChainChanged = () => {
      // Recommended by MetaMask: reload or re-init provider
      window.location.reload();
    };

    eth.on('accountsChanged', handleAccountsChanged);
    eth.on('chainChanged', handleChainChanged);

    // Auto-reconnect if previously connected
    if (localStorage.getItem('aureum_wallet_connected') === 'true') {
      eth.request({ method: 'eth_accounts' }).then(async (accounts: string[]) => {
        if (accounts && accounts.length > 0) {
          const browserProvider = new ethers.BrowserProvider(eth);
          const checksummed = ethers.getAddress(accounts[0]);
          const browserSigner = await browserProvider.getSigner();
          setAccount(checksummed);
          setProvider(browserProvider);
          setSigner(browserSigner);
          updateNetworkState(browserProvider);
        }
      }).catch((e: any) => console.warn('Could not auto-reconnect wallet:', e));
    }

    return () => {
      if (eth.removeListener) {
        eth.removeListener('accountsChanged', handleAccountsChanged);
        eth.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [disconnectWallet, provider, updateNetworkState]);

  return (
    <WalletContext.Provider
      value={{
        account,
        chainId,
        networkName,
        isConnected: Boolean(account),
        isConnecting,
        provider,
        signer,
        connectWallet,
        disconnectWallet,
        switchNetwork,
        formatAddress,
        error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => useContext(WalletContext);
