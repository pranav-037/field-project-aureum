import { BlockchainService } from './blockchain.service';
import { db } from '../db/supabase';

export interface ReconciliationReport {
  onChainArtworksCount: number;
  databaseArtworksCount: number;
  databaseTransfersCount: number;
  lastBlockIndexed: number;
  latestBlockNumber: number;
  inSync: boolean;
  details: string[];
}

export class IndexerService {
  private static isListening: boolean = false;
  private static pollTimer: NodeJS.Timeout | null = null;

  /**
   * Initializes listeners for all ArtchainRegistry contract events
   */
  public static async startListening(): Promise<boolean> {
    if (this.isListening) return true;

    const available = await BlockchainService.isAvailable();
    if (!available) {
      console.warn('⚠️ Blockchain node or contract not available. Indexer listening postponed.');
      return false;
    }

    const contract = BlockchainService.getContract();
    if (!contract) {
      console.warn('⚠️ Artchain contract instance not available for indexing.');
      return false;
    }

    try {
      // 1. GenesisRecordCreated
      contract.on(
        'GenesisRecordCreated',
        async (
          artworkId: bigint,
          _authenticator: string,
          initialOwner: string,
          metadataCid: string,
          _docCids: string[],
          _imgCids: string[],
          bindingReference: string,
          _timestamp: bigint,
          _txHash: string,
          event: any
        ) => {
          try {
            console.log(`[Indexer] GenesisRecordCreated event for artwork #${artworkId.toString()}`);
            const blockNumber = event?.log?.blockNumber || 0;
            const txHash = event?.log?.transactionHash || '';
            const strId = artworkId.toString();

            // Check if existing draft/record exists
            const existing = await db.artworks.findByBlockchainIdOrBinding(strId, bindingReference);

            if (existing) {
              await db.artworks.update(existing.id, {
                blockchainArtworkId: strId,
                txHash: txHash || existing.txHash,
                blockNumber: blockNumber || existing.blockNumber,
                status: 'VERIFIED',
                ownerId: initialOwner,
              });
            } else {
              await db.artworks.create({
                blockchainArtworkId: strId,
                title: `On-Chain Masterpiece #${strId}`,
                artist: 'Certified Artist',
                medium: 'Physical Medium',
                dimensions: 'Variable',
                metadataCid: metadataCid,
                imageCids: '[]',
                documentCids: '[]',
                bindingReference: bindingReference || `AUR-${strId}`,
                status: 'VERIFIED',
                ownerId: initialOwner,
                txHash: txHash,
                blockNumber: blockNumber,
              });
            }
            await this.updateLastBlock(blockNumber);
          } catch (err) {
            console.error('[Indexer] Error processing GenesisRecordCreated:', err);
          }
        }
      );

      // 2. TransferInitiated
      contract.on(
        'TransferInitiated',
        async (
          transferId: bigint,
          artworkId: bigint,
          seller: string,
          buyer: string,
          _intermediary: string,
          transferDate: bigint,
          _priceCommitment: string,
          _supportingDocCids: string[],
          event: any
        ) => {
          try {
            console.log(`[Indexer] TransferInitiated event for transfer #${transferId.toString()}`);
            const blockNumber = event?.log?.blockNumber || 0;
            const txHash = event?.log?.transactionHash || '';
            const strTid = transferId.toString();

            const existing = await db.transfers.findByBlockchainId(strTid);

            if (existing) {
              await db.transfers.update(existing.id, {
                status: 'PENDING',
                txHash: txHash || existing.txHash,
                blockNumber: blockNumber || existing.blockNumber,
              });
            } else {
              await db.transfers.create({
                blockchainTransferId: strTid,
                artworkId: artworkId.toString(),
                sellerId: seller,
                buyerId: buyer,
                transferDate: new Date(Number(transferDate) * 1000).toISOString(),
                priceVisibility: 'PUBLIC',
                txHash: txHash,
                blockNumber: blockNumber,
                status: 'PENDING',
              });
            }
            await this.updateLastBlock(blockNumber);
          } catch (err) {
            console.error('[Indexer] Error processing TransferInitiated:', err);
          }
        }
      );

      // 3. TransferFinalized
      contract.on(
        'TransferFinalized',
        async (
          transferId: bigint,
          artworkId: bigint,
          buyer: string,
          _transferDate: bigint,
          _txHash: string,
          event: any
        ) => {
          try {
            console.log(`[Indexer] TransferFinalized event for transfer #${transferId.toString()}`);
            const blockNumber = event?.log?.blockNumber || 0;
            const txHash = event?.log?.transactionHash || '';
            const strTid = transferId.toString();
            const strAid = artworkId.toString();

            await db.transfers.updateByBlockchainId(strTid, {
              status: 'FINALIZED',
              txHash: txHash,
              blockNumber: blockNumber,
            });

            // Update ownership of artwork
            await db.artworks.updateByBlockchainId(strAid, {
              ownerId: buyer,
            });

            await this.updateLastBlock(blockNumber);
          } catch (err) {
            console.error('[Indexer] Error processing TransferFinalized:', err);
          }
        }
      );

      // 4. TransferCancelled
      contract.on(
        'TransferCancelled',
        async (transferId: bigint, _artworkId: bigint, _seller: string, _reason: string, event: any) => {
          try {
            console.log(`[Indexer] TransferCancelled event for transfer #${transferId.toString()}`);
            const blockNumber = event?.log?.blockNumber || 0;
            await db.transfers.updateByBlockchainId(transferId.toString(), { status: 'CANCELLED' });
            await this.updateLastBlock(blockNumber);
          } catch (err) {
            console.error('[Indexer] Error processing TransferCancelled:', err);
          }
        }
      );

      // 5. TransferExpired
      contract.on(
        'TransferExpired',
        async (transferId: bigint, _artworkId: bigint, _seller: string, event: any) => {
          try {
            console.log(`[Indexer] TransferExpired event for transfer #${transferId.toString()}`);
            const blockNumber = event?.log?.blockNumber || 0;
            await db.transfers.updateByBlockchainId(transferId.toString(), { status: 'EXPIRED' });
            await this.updateLastBlock(blockNumber);
          } catch (err) {
            console.error('[Indexer] Error processing TransferExpired:', err);
          }
        }
      );

      // 6. AmendmentAppended
      contract.on(
        'AmendmentAppended',
        async (
          amendmentId: bigint,
          artworkId: bigint,
          issuer: string,
          reason: string,
          createdAt: bigint,
          event: any
        ) => {
          try {
            console.log(`[Indexer] AmendmentAppended event #${amendmentId.toString()}`);
            const blockNumber = event?.log?.blockNumber || 0;
            const txHash = event?.log?.transactionHash || '';
            const strAmid = amendmentId.toString();

            const existing = await db.amendments.findByBlockchainId(strAmid);

            if (!existing) {
              await db.amendments.create({
                blockchainAmendmentId: strAmid,
                blockchainArtworkId: artworkId.toString(),
                issuerAddress: issuer,
                reason: reason,
                txHash: txHash,
                blockNumber: blockNumber,
                createdAt: new Date(Number(createdAt) * 1000).toISOString(),
              });
            }
            await this.updateLastBlock(blockNumber);
          } catch (err) {
            console.error('[Indexer] Error processing AmendmentAppended:', err);
          }
        }
      );

      // 7. FlagCreated
      contract.on(
        'FlagCreated',
        async (
          flagId: bigint,
          artworkId: bigint,
          flagger: string,
          flagType: any,
          reason: string,
          evidenceRef: string,
          createdAt: bigint,
          event: any
        ) => {
          try {
            console.log(`[Indexer] FlagCreated event #${flagId.toString()}`);
            const blockNumber = event?.log?.blockNumber || 0;
            const txHash = event?.log?.transactionHash || '';
            const strFid = flagId.toString();
            const strAid = artworkId.toString();

            const existing = await db.disputeFlags.findByBlockchainId(strFid);

            if (!existing) {
              await db.disputeFlags.create({
                blockchainFlagId: strFid,
                blockchainArtworkId: strAid,
                flaggerAddress: flagger,
                flagType: Number(flagType),
                reason: reason,
                evidenceRef: evidenceRef || '',
                active: true,
                txHash: txHash,
                blockNumber: blockNumber,
                createdAt: new Date(Number(createdAt) * 1000).toISOString(),
              });
            }

            // Flag artwork status as DISPUTED
            await db.artworks.updateByBlockchainId(strAid, { status: 'DISPUTED' });

            await this.updateLastBlock(blockNumber);
          } catch (err) {
            console.error('[Indexer] Error processing FlagCreated:', err);
          }
        }
      );

      // 8. FlagResolved
      contract.on(
        'FlagResolved',
        async (
          flagId: bigint,
          artworkId: bigint,
          resolver: string,
          _reason: string,
          resolvedAt: bigint,
          event: any
        ) => {
          try {
            console.log(`[Indexer] FlagResolved event #${flagId.toString()}`);
            const blockNumber = event?.log?.blockNumber || 0;
            const strFid = flagId.toString();
            const strAid = artworkId.toString();

            await db.disputeFlags.resolveFlag(
              strFid,
              resolver,
              new Date(Number(resolvedAt) * 1000)
            );

            // Check if any active flags remain for this artwork
            const activeFlags = await db.disputeFlags.countActiveForArtwork(strAid);

            if (activeFlags === 0) {
              await db.artworks.updateByBlockchainId(strAid, { status: 'VERIFIED' });
            }

            await this.updateLastBlock(blockNumber);
          } catch (err) {
            console.error('[Indexer] Error processing FlagResolved:', err);
          }
        }
      );

      // 9. InstitutionApproved
      contract.on('InstitutionApproved', async (institution: string, event: any) => {
        try {
          console.log(`[Indexer] InstitutionApproved event for ${institution}`);
          const blockNumber = event?.log?.blockNumber || 0;
          await db.institutions.upsert({
            name: `Institution ${institution.slice(0, 6)}...${institution.slice(-4)}`,
            walletAddress: institution,
            status: 'APPROVED',
            approvedAt: new Date(),
          });
          await this.updateLastBlock(blockNumber);
        } catch (err) {
          console.error('[Indexer] Error processing InstitutionApproved:', err);
        }
      });

      // 10. InstitutionRevoked
      contract.on('InstitutionRevoked', async (institution: string, event: any) => {
        try {
          console.log(`[Indexer] InstitutionRevoked event for ${institution}`);
          const blockNumber = event?.log?.blockNumber || 0;
          await db.institutions.updateStatus(institution, 'REVOKED');
          await this.updateLastBlock(blockNumber);
        } catch (err) {
          console.error('[Indexer] Error processing InstitutionRevoked:', err);
        }
      });

      this.isListening = true;
      console.log('✅ IndexerService successfully listening for smart contract events.');
      return true;
    } catch (err) {
      console.error('⚠️ IndexerService failed to register event listeners:', err);
      return false;
    }
  }

  /**
   * Stop all active listeners
   */
  public static stopListening(): void {
    const contract = BlockchainService.getContract();
    if (contract) {
      contract.removeAllListeners();
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.isListening = false;
    console.log('🛑 IndexerService listeners stopped.');
  }

  /**
   * Historical Backfill: queries logs from `fromBlock` to `toBlock`
   */
  public static async backfill(fromBlock?: number, toBlock?: number): Promise<{ processed: number; toBlock: number }> {
    const contract = BlockchainService.getContract();
    const provider = BlockchainService.getProvider();
    if (!contract || !provider) {
      throw new Error('Contract or provider not available for backfill');
    }

    const currentBlock = await provider.getBlockNumber();
    const targetToBlock = toBlock !== undefined ? toBlock : currentBlock;

    let targetFromBlock = fromBlock;
    if (targetFromBlock === undefined) {
      const syncState = await db.syncState.get();
      targetFromBlock = syncState ? syncState.lastBlockIndexed : 0;
    }

    if (targetFromBlock > targetToBlock) {
      return { processed: 0, toBlock: targetToBlock };
    }

    console.log(`[Indexer] Running backfill from block ${targetFromBlock} to ${targetToBlock}...`);

    let processedCount = 0;

    try {
      // Query Genesis events
      const genesisFilter = contract.filters.GenesisRecordCreated();
      const genesisLogs = await contract.queryFilter(genesisFilter, targetFromBlock, targetToBlock);
      for (const log of genesisLogs) {
        if ('args' in log) {
          const args = (log as any).args;
          const artworkId = args[0].toString();
          const initialOwner = args[2];
          const metadataCid = args[3];
          const bindingRef = args[6];

          const existing = await db.artworks.findByBlockchainId(artworkId);
          if (existing) {
            await db.artworks.update(existing.id, {
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
              ownerId: initialOwner,
              status: 'VERIFIED',
            });
          } else {
            await db.artworks.create({
              blockchainArtworkId: artworkId,
              title: `On-Chain Artwork #${artworkId}`,
              artist: 'Certified Authenticator',
              medium: 'Verified Asset',
              dimensions: 'N/A',
              metadataCid: metadataCid,
              imageCids: '[]',
              documentCids: '[]',
              bindingReference: bindingRef || `AUR-${artworkId}`,
              status: 'VERIFIED',
              ownerId: initialOwner,
              txHash: log.transactionHash,
              blockNumber: log.blockNumber,
            });
          }
          processedCount++;
        }
      }

      // Query TransferFinalized events
      const finalizedFilter = contract.filters.TransferFinalized();
      const finalizedLogs = await contract.queryFilter(finalizedFilter, targetFromBlock, targetToBlock);
      for (const log of finalizedLogs) {
        if ('args' in log) {
          const args = (log as any).args;
          const transferId = args[0].toString();
          const artworkId = args[1].toString();
          const buyer = args[2];

          await db.transfers.updateByBlockchainId(transferId, {
            status: 'FINALIZED',
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });

          await db.artworks.updateByBlockchainId(artworkId, { ownerId: buyer });
          processedCount++;
        }
      }

      await this.updateLastBlock(targetToBlock);
    } catch (err) {
      console.warn('⚠️ Backfill error:', (err as Error).message);
    }

    console.log(`[Indexer] Backfill completed. Processed ${processedCount} events up to block ${targetToBlock}.`);
    return { processed: processedCount, toBlock: targetToBlock };
  }

  /**
   * Reconcile on-chain records with database cache
   */
  public static async reconcile(): Promise<ReconciliationReport> {
    const contract = BlockchainService.getContract();
    const provider = BlockchainService.getProvider();

    const dbArtworks = await db.artworks.count();
    const dbTransfers = await db.transfers.count();
    const syncState = await db.syncState.get();
    const lastIndexed = syncState?.lastBlockIndexed || 0;

    let latestBlockNumber = 0;
    let onChainArtworks = 0;
    const details: string[] = [];

    if (contract && provider) {
      try {
        latestBlockNumber = await provider.getBlockNumber();
        let id = 1;
        while (id <= 100) {
          try {
            const exists = await contract.isArtworkValid(id);
            if (exists) {
              onChainArtworks++;
              id++;
            } else {
              break;
            }
          } catch {
            break;
          }
        }
      } catch (err) {
        details.push(`On-chain query warning: ${(err as Error).message}`);
      }
    } else {
      details.push('Smart contract is not reachable.');
    }

    const inSync = onChainArtworks <= dbArtworks && latestBlockNumber - lastIndexed <= 10;
    details.push(`DB Artworks: ${dbArtworks}, On-Chain Detected: ${onChainArtworks}`);
    details.push(`Last Indexed Block: ${lastIndexed}, Chain Head Block: ${latestBlockNumber}`);

    return {
      onChainArtworksCount: onChainArtworks,
      databaseArtworksCount: dbArtworks,
      databaseTransfersCount: dbTransfers,
      lastBlockIndexed: lastIndexed,
      latestBlockNumber,
      inSync,
      details,
    };
  }

  private static async updateLastBlock(blockNumber: number): Promise<void> {
    if (blockNumber <= 0) return;
    try {
      await db.syncState.upsert(blockNumber);
    } catch {
      // Non-critical background update failure
    }
  }
}
