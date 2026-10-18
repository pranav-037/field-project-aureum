import { ethers } from 'ethers';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Default local Hardhat dev constants
const DEFAULT_RPC_URL = 'http://127.0.0.1:8545';
// Standard Hardhat Account #0 (Dev only)
const DEFAULT_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

export interface GenesisInput {
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
}

export interface GenesisResult {
  onChainArtworkId: string;
  txHash: string;
  blockNumber: number;
}

export interface InitiateTransferInput {
  artworkId: number | string;
  buyerAddress: string;
  intermediaryAddress?: string;
  transferDate?: number;
  priceCommitment?: string;
  supportingDocCids?: string[];
}

export interface InitiateTransferResult {
  onChainTransferId: string;
  txHash: string;
  blockNumber: number;
}

export class BlockchainService {
  private static provider: ethers.JsonRpcProvider | null = null;
  private static signer: ethers.Wallet | null = null;
  private static contract: ethers.Contract | null = null;
  private static contractAddress: string = '';
  private static abi: any[] = [];
  private static initialized: boolean = false;

  public static initialize(): void {
    if (this.initialized) return;

    const rpcUrl = process.env.RPC_URL || DEFAULT_RPC_URL;
    const privateKey = process.env.DEPLOYER_PRIVATE_KEY || DEFAULT_PRIVATE_KEY;
    this.contractAddress = process.env.CONTRACT_ADDRESS || '';

    // Load compiled ABI from blockchain artifacts
    const artifactPath = path.resolve(
      __dirname,
      '../../../blockchain/artifacts/contracts/ArtchainRegistry.sol/ArtchainRegistry.json'
    );

    if (fs.existsSync(artifactPath)) {
      try {
        const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
        this.abi = artifact.abi;
      } catch (err) {
        console.warn('⚠️ Could not parse ArtchainRegistry artifact ABI:', err);
      }
    } else {
      console.warn('⚠️ ArtchainRegistry.json artifact not found at:', artifactPath);
    }

    try {
      const network = ethers.Network.from({
        name: 'aureum-chain',
        chainId: 31337,
      });
      this.provider = new ethers.JsonRpcProvider(rpcUrl, network, { staticNetwork: true });
      this.signer = new ethers.Wallet(privateKey, this.provider);

      if (this.contractAddress && this.abi.length > 0) {
        this.contract = new ethers.Contract(this.contractAddress, this.abi, this.signer);
      }
      this.initialized = true;
    } catch (err) {
      console.warn('⚠️ BlockchainService failed to connect to RPC provider:', (err as Error).message);
    }
  }

  public static async isAvailable(): Promise<boolean> {
    this.initialize();
    if (!this.provider || !this.contractAddress || !this.contract) {
      return false;
    }
    try {
      const code = await this.provider.getCode(this.contractAddress);
      return code !== '0x' && code !== '0x0';
    } catch {
      return false;
    }
  }

  public static getContractAddress(): string {
    this.initialize();
    return this.contractAddress;
  }

  public static getSignerAddress(): string {
    this.initialize();
    return this.signer?.address || '';
  }

  public static getContract(): ethers.Contract | null {
    this.initialize();
    return this.contract;
  }

  public static getProvider(): ethers.JsonRpcProvider | null {
    this.initialize();
    return this.provider;
  }

  public static getAbi(): any[] {
    this.initialize();
    return this.abi;
  }

  public static formatBytes32(value: string): string {
    if (!value) return ethers.ZeroHash;
    if (value.startsWith('0x') && value.length === 66) return value;
    return ethers.keccak256(ethers.toUtf8Bytes(value));
  }

  /**
   * Approves an institution and grants AUTHENTICATOR role on-chain
   */
  public static async approveInstitution(institutionAddress: string): Promise<{ txHash: string; blockNumber: number }> {
    this.initialize();
    if (!this.contract) throw new Error('Smart contract not initialized');

    const tx = await this.contract.approveInstitution(institutionAddress);
    const receipt = await tx.wait();
    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Checks whether a wallet address is an approved institution on-chain
   */
  public static async isAuthenticatedInstitution(institutionAddress: string): Promise<boolean> {
    this.initialize();
    if (!this.contract) return false;
    try {
      return await this.contract.isAuthenticatedInstitution(institutionAddress);
    } catch {
      return false;
    }
  }

  /**
   * Creates a Genesis record on-chain
   */
  public static async createGenesisRecord(params: GenesisInput): Promise<GenesisResult> {
    this.initialize();
    if (!this.contract) throw new Error('Smart contract not initialized or RPC unavailable');

    const metaBytes = this.formatBytes32(params.metadataCid);
    const docBytes = (params.documentCids || []).map((c) => this.formatBytes32(c));
    const imgBytes = (params.imageCids || []).map((c) => this.formatBytes32(c));

    // Must have at least 1 doc and 1 image CID for contract validation
    if (docBytes.length === 0) docBytes.push(metaBytes);
    if (imgBytes.length === 0) imgBytes.push(metaBytes);

    const bindingRef = params.bindingReference || 'AUREUM-PHYSICAL-BINDING-DEFAULT';
    const initialOwner = (params.initialOwner && ethers.isAddress(params.initialOwner))
      ? params.initialOwner
      : this.signer?.address || ethers.ZeroAddress;

    const tx = await this.contract.createGenesisRecordWithOwner(
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
      bindingRef,
      initialOwner
    );

    const receipt = await tx.wait();

    // Parse GenesisRecordCreated event from logs
    let onChainArtworkId = '1';
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog(log);
        if (parsed && parsed.name === 'GenesisRecordCreated') {
          onChainArtworkId = parsed.args.artworkId.toString();
          break;
        }
      } catch {
        // Skip logs not matching contract interface
      }
    }

    return {
      onChainArtworkId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Initiates a two-party ownership transfer on-chain
   */
  public static async initiateTransfer(params: InitiateTransferInput): Promise<InitiateTransferResult> {
    this.initialize();
    if (!this.contract) throw new Error('Smart contract not initialized');

    const artworkIdBig = BigInt(params.artworkId);
    const buyerAddr = ethers.isAddress(params.buyerAddress) ? params.buyerAddress : this.signer?.address!;
    const intermediary = (params.intermediaryAddress && ethers.isAddress(params.intermediaryAddress))
      ? params.intermediaryAddress
      : ethers.ZeroAddress;

    const transferDate = params.transferDate || Math.floor(Date.now() / 1000);
    const priceCommitment = params.priceCommitment ? this.formatBytes32(params.priceCommitment) : ethers.ZeroHash;
    const docBytes = (params.supportingDocCids || []).map((c) => this.formatBytes32(c));

    const tx = await this.contract.initiateTransfer(
      artworkIdBig,
      buyerAddr,
      intermediary,
      transferDate,
      priceCommitment,
      docBytes
    );

    const receipt = await tx.wait();

    let onChainTransferId = '1';
    for (const log of receipt.logs) {
      try {
        const parsed = this.contract.interface.parseLog(log);
        if (parsed && parsed.name === 'TransferInitiated') {
          onChainTransferId = parsed.args.transferId.toString();
          break;
        }
      } catch {
        // Skip
      }
    }

    return {
      onChainTransferId,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Accepts a pending transfer on-chain
   */
  public static async acceptTransfer(
    transferId: number | string,
    buyerSigner?: ethers.Signer
  ): Promise<{ txHash: string; blockNumber: number }> {
    this.initialize();
    const contractToUse = buyerSigner
      ? new ethers.Contract(this.contractAddress, this.abi, buyerSigner)
      : this.contract;

    if (!contractToUse) throw new Error('Contract not initialized');

    const tx = await contractToUse.acceptTransfer(BigInt(transferId));
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Cancels a pending transfer on-chain
   */
  public static async cancelTransfer(
    transferId: number | string,
    reason: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');

    const tx = await this.contract.cancelTransfer(BigInt(transferId), reason || 'Transfer cancelled');
    const receipt = await tx.wait();

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Reads artwork details directly from the blockchain
   */
  public static async getArtwork(artworkId: number | string | bigint): Promise<any> {
    this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');

    const data = await this.contract.getArtwork(BigInt(artworkId));
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
  }

  /**
   * Reads current owner from the blockchain
   */
  public static async getCurrentOwner(artworkId: number | string | bigint): Promise<string> {
    this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');

    return await this.contract.getCurrentOwner(BigInt(artworkId));
  }

  /**
   * Reads full provenance trail and transfer history from blockchain
   */
  public static async getProvenanceTrail(artworkId: number | string | bigint): Promise<any> {
    this.initialize();
    if (!this.contract) throw new Error('Contract not initialized');

    const id = BigInt(artworkId);
    const artwork = await this.getArtwork(id);
    const currentOwner = await this.getCurrentOwner(id);
    const transferIds: bigint[] = await this.contract.getArtworkTransfers(id);

    const transfers = [];
    for (const tId of transferIds) {
      const t = await this.contract.getTransfer(tId);
      transfers.push({
        id: t.id.toString(),
        artworkId: t.artworkId.toString(),
        seller: t.seller,
        buyer: t.buyer,
        intermediary: t.intermediary,
        transferDate: new Date(Number(t.transferDate) * 1000).toISOString(),
        priceCommitment: t.priceCommitment,
        supportingDocCids: t.supportingDocCids,
        txHash: t.txHash.toString(),
        status: Number(t.status), // 0: PENDING, 1: FINALIZED, 2: EXPIRED, 3: CANCELLED
      });
    }

    return {
      artwork,
      currentOwner,
      transfers,
      isVerifiable: artwork.status === 0, // 0 = VERIFIED
    };
  }
}
