import { useMemo, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../contexts/WalletContext';
import ArtchainRegistryABI from '../contracts/ArtchainRegistryABI.json';

export const DEFAULT_CONTRACT_ADDRESS =
  import.meta.env.VITE_CONTRACT_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const DEFAULT_RPC_URL = import.meta.env.VITE_RPC_URL || 'http://127.0.0.1:8545';

export interface OnChainArtwork {
  id: string;
  authenticator: string;
  initialOwner: string;
  metadataCid: string;
  documentCids: string[];
  imageCids: string[];
  bindingReference: string;
  genesisTimestamp: number;
  genesisTxHash: string;
  status: number; // 0: VERIFIED, 1: BROKEN, 2: UNVERIFIABLE, 3: DISPUTED
}

export interface OnChainTransfer {
  id: string;
  artworkId: string;
  seller: string;
  buyer: string;
  intermediary: string;
  transferDate: number;
  priceCommitment: string;
  supportingDocCids: string[];
  txHash: string;
  status: number; // 0: PENDING, 1: FINALIZED, 2: EXPIRED, 3: CANCELLED
}

export function useArtchainContract() {
  const { provider, signer, account } = useWallet();
  const contractAddress = DEFAULT_CONTRACT_ADDRESS;

  // Fallback public read-only provider if wallet not connected
  const publicProvider = useMemo(() => {
    try {
      return new ethers.JsonRpcProvider(DEFAULT_RPC_URL);
    } catch {
      return null;
    }
  }, []);

  const readContract = useMemo(() => {
    const prov = provider || publicProvider;
    if (!prov || !contractAddress) return null;
    return new ethers.Contract(contractAddress, ArtchainRegistryABI, prov);
  }, [provider, publicProvider, contractAddress]);

  const writeContract = useMemo(() => {
    if (!signer || !contractAddress) return null;
    return new ethers.Contract(contractAddress, ArtchainRegistryABI, signer);
  }, [signer, contractAddress]);

  const formatBytes32 = useCallback((val: string): string => {
    if (!val) return ethers.ZeroHash;
    if (val.startsWith('0x') && val.length === 66) return val;
    return ethers.keccak256(ethers.toUtf8Bytes(val));
  }, []);

  /**
   * Fetches on-chain artwork details
   */
  const getArtwork = useCallback(async (artworkId: number | string): Promise<OnChainArtwork | null> => {
    if (!readContract) return null;
    try {
      const data = await readContract.getArtwork(BigInt(artworkId));
      return {
        id: data[0].toString(),
        authenticator: data[1],
        initialOwner: data[2],
        metadataCid: data[3],
        documentCids: data[4],
        imageCids: data[5],
        bindingReference: data[6],
        genesisTimestamp: Number(data[7]),
        genesisTxHash: data[8],
        status: Number(data[9]),
      };
    } catch (err) {
      console.warn('Failed to read on-chain artwork:', err);
      return null;
    }
  }, [readContract]);

  /**
   * Fetches current on-chain owner
   */
  const getCurrentOwner = useCallback(async (artworkId: number | string): Promise<string | null> => {
    if (!readContract) return null;
    try {
      return await readContract.getCurrentOwner(BigInt(artworkId));
    } catch (err) {
      console.warn('Failed to read current owner:', err);
      return null;
    }
  }, [readContract]);

  /**
   * Fetches the list of previous owners for an artwork by reading Transfer events.
   * Returns an array of addresses ordered from oldest to newest (excluding the zero address which represents minting).
   */
  const getPreviousOwners = useCallback(async (artworkId: number | string): Promise<string[]> => {
    if (!readContract) return [];
    try {
      // Build a filter for the Transfer event of the given tokenId
      const filter = readContract.filters.Transfer(null, null, BigInt(artworkId));
      const events = await readContract.queryFilter(filter, 0, 'latest');
      const owners = events
        .map((e: any) => e.args?.from as string)
        .filter((addr) => addr && addr !== ethers.ZeroAddress);
      // Remove duplicates while preserving order
      return Array.from(new Set(owners));
    } catch (err) {
      console.warn('Failed to fetch previous owners:', err);
      return [];
    }
  }, [readContract]);

  /**
   * Fetches on-chain transfer details
   */
  const getTransfer = useCallback(async (transferId: number | string): Promise<OnChainTransfer | null> => {
    if (!readContract) return null;
    try {
      const t = await readContract.getTransfer(BigInt(transferId));
      return {
        id: t.id.toString(),
        artworkId: t.artworkId.toString(),
        seller: t.seller,
        buyer: t.buyer,
        intermediary: t.intermediary,
        transferDate: Number(t.transferDate),
        priceCommitment: t.priceCommitment,
        supportingDocCids: t.supportingDocCids,
        txHash: t.txHash.toString(),
        status: Number(t.status),
      };
    } catch (err) {
      console.warn('Failed to read on-chain transfer:', err);
      return null;
    }
  }, [readContract]);

  /**
   * Signs and executes transfer acceptance in MetaMask
   */
  const acceptTransfer = useCallback(async (transferId: number | string): Promise<{ txHash: string; blockNumber: number }> => {
    if (!writeContract) throw new Error('Wallet not connected. Please connect MetaMask to sign this transfer.');
    const tx = await writeContract.acceptTransfer(BigInt(transferId));
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }, [writeContract]);

  /**
   * Signs and executes transfer cancellation in MetaMask
   */
  const cancelTransfer = useCallback(async (transferId: number | string, reason: string): Promise<{ txHash: string }> => {
    if (!writeContract) throw new Error('Wallet not connected.');
    const tx = await writeContract.cancelTransfer(BigInt(transferId), reason || 'Cancelled by user');
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
    };
  }, [writeContract]);

  /**
   * Signs and executes Genesis creation directly from the user's wallet
   */
  const createGenesis = useCallback(async (params: {
    title: string;
    artist: string;
    year?: string;
    medium: string;
    dimensions: string;
    edition?: string;
    authenticationMethod?: string;
    metadataCid: string;
    documentCids: string[];
    imageCids: string[];
    bindingReference: string;
    initialOwner?: string;
  }): Promise<{ artworkId: string; txHash: string }> => {
    if (!writeContract) throw new Error('Wallet not connected.');

    const metaBytes = formatBytes32(params.metadataCid);
    const docBytes = (params.documentCids.length > 0 ? params.documentCids : [params.metadataCid]).map(formatBytes32);
    const imgBytes = (params.imageCids.length > 0 ? params.imageCids : [params.metadataCid]).map(formatBytes32);
    const owner = (params.initialOwner && ethers.isAddress(params.initialOwner)) ? params.initialOwner : (account || ethers.ZeroAddress);

    const tx = await writeContract.createGenesisRecordWithOwner(
      params.title,
      params.artist,
      params.year || new Date().getFullYear().toString(),
      params.medium || 'Fine Art',
      params.dimensions || 'N/A',
      params.edition || '1 of 1',
      params.authenticationMethod || 'Physical Verification',
      metaBytes,
      docBytes,
      imgBytes,
      params.bindingReference,
      owner
    );

    const receipt = await tx.wait();

    let artworkId = '1';
    for (const log of receipt.logs) {
      try {
        const parsed = writeContract.interface.parseLog(log);
        if (parsed && parsed.name === 'GenesisRecordCreated') {
          artworkId = parsed.args.artworkId.toString();
          break;
        }
      } catch {
        // ignore
      }
    }

    return {
      artworkId,
      txHash: receipt.hash,
    };
  }, [writeContract, formatBytes32, account]);

  return {
    contractAddress,
    readContract,
    writeContract,
    getArtwork,
    getCurrentOwner,
    getPreviousOwners,
    getTransfer,
    acceptTransfer,
    cancelTransfer,
    createGenesis,
    formatBytes32,
  };
}
