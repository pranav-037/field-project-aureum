import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import fs from 'fs';

import { AuthService } from './services/auth.service';
import { BlockchainService } from './services/blockchain.service';
import { IPFSService } from './services/ipfs.service';
import { IndexerService } from './services/indexer.service';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 3000;
export const prisma = new PrismaClient();

// Configure Multer for file uploads (max 50MB per file)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Initialize blockchain service and start indexer
BlockchainService.initialize();
IndexerService.startListening();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Basic API route
app.get('/api', (req: Request, res: Response) => {
  res.json({ message: 'Aureum API is running!' });
});

// Authentication routes
app.post(['/api/login', '/api/auth/login'], async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message || 'Invalid credentials' });
  }
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check database connection
    await prisma.user.count();
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString(), database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: 'Database connection failed', error: (error as Error).message });
  }
});

// Get all users (for testing)
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a user (for testing)
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { email, name, role, password } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }
    const user = await prisma.user.create({
      data: {
        email,
        name,
        role: role || 'VIEWER',
        password: password || '',
      },
    });
    // Remove sensitive fields before sending response
    const { id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt } = user;
    res.status(201).json({ id, email: userEmail, name: userName, role: userRole, createdAt, updatedAt });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Blockchain status check
app.get('/api/blockchain/status', async (req: Request, res: Response) => {
  try {
    const isAvailable = await BlockchainService.isAvailable();
    res.json({
      available: isAvailable,
      contractAddress: BlockchainService.getContractAddress(),
      signerAddress: BlockchainService.getSignerAddress(),
      network: process.env.RPC_URL || 'http://127.0.0.1:8545',
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Approve institution on-chain
app.post('/api/institutions/approve', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress) {
      return res.status(400).json({ error: 'walletAddress is required' });
    }

    const isChainAvailable = await BlockchainService.isAvailable();
    if (isChainAvailable) {
      const result = await BlockchainService.approveInstitution(walletAddress);
      return res.json({ success: true, ...result });
    }

    res.json({ success: true, message: 'Institution approved (blockchain offline)' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to approve institution' });
  }
});

// IPFS Status check
app.get('/api/ipfs/status', (req: Request, res: Response) => {
  res.json({
    pinataConfigured: IPFSService.isPinataConfigured(),
    gatewayUrl: IPFSService.getGatewayUrl(''),
  });
});

// Single file IPFS upload (image or certificate PDF)
app.post('/api/ipfs/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided in form-data field "file"' });
    }

    const result = await IPFSService.pinFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.status(201).json({
      success: true,
      originalFilename: req.file.originalname,
      mimetype: req.file.mimetype,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to pin file to IPFS' });
  }
});

// Multiple files IPFS upload
app.post('/api/ipfs/upload-multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files provided in form-data field "files"' });
    }

    const pinnedResults = await Promise.all(
      files.map(async (file) => {
        const pin = await IPFSService.pinFile(file.buffer, file.originalname, file.mimetype);
        return {
          originalFilename: file.originalname,
          mimetype: file.mimetype,
          ...pin,
        };
      })
    );

    res.status(201).json({
      success: true,
      count: pinnedResults.length,
      files: pinnedResults,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to pin files to IPFS' });
  }
});

// Pin JSON Metadata to IPFS
app.post('/api/ipfs/pin-json', async (req: Request, res: Response) => {
  try {
    const { metadata, name } = req.body;
    if (!metadata) {
      return res.status(400).json({ error: 'JSON metadata object is required' });
    }

    const result = await IPFSService.pinJSON(metadata, name);
    res.status(201).json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to pin JSON to IPFS' });
  }
});

// Retrieve IPFS content by CID
app.get('/api/ipfs/:cid', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;
    const content = await IPFSService.retrieve(cid);

    if (!content) {
      return res.status(404).json({ error: `CID ${cid} could not be resolved from local cache or IPFS gateway` });
    }

    res.setHeader('Content-Type', content.contentType);
    res.send(content.data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to retrieve IPFS content' });
  }
});

// Get all artworks
app.get('/api/artworks', async (req: Request, res: Response) => {
  try {
    const artworks = await prisma.artwork.findMany({
      select: {
        id: true,
        blockchainArtworkId: true,
        txHash: true,
        title: true,
        artist: true,
        status: true,
        createdAt: true,
      },
    });
    res.json(artworks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch artworks' });
  }
});

// Create an artwork (with IPFS metadata pinning and on-chain Genesis minting)
app.post('/api/artworks', async (req: Request, res: Response) => {
  try {
    const {
      title,
      artist,
      year,
      medium,
      dimensions,
      edition,
      authenticationMethod,
      metadataCid,
      imageCids,
      documentCids,
      bindingReference,
      ownerId,
      ownerAddress,
    } = req.body;

    if (!title || !artist || !ownerId) {
      return res.status(400).json({ error: 'Title, artist, and ownerId are required' });
    }

    const parsedImageCids: string[] = Array.isArray(imageCids)
      ? imageCids
      : (imageCids ? [imageCids] : []);

    const parsedDocCids: string[] = Array.isArray(documentCids)
      ? documentCids
      : (documentCids ? [documentCids] : []);

    // Pin full artwork metadata JSON to IPFS if not already provided
    let finalMetadataCid = metadataCid;
    if (!finalMetadataCid || finalMetadataCid === 'QmExampleCid') {
      try {
        const metadataPayload = {
          name: title,
          description: `${title} by ${artist} (${year || 'N/A'})`,
          artist,
          year: year || new Date().getFullYear().toString(),
          medium: medium || 'Fine Art',
          dimensions: dimensions || 'N/A',
          edition: edition || 'Original',
          authenticationMethod: authenticationMethod || 'Cryptographic Provenance Anchor',
          bindingReference: bindingReference || `AUREUM-CHIP-TAG-${Date.now()}`,
          images: parsedImageCids,
          documents: parsedDocCids,
          timestamp: new Date().toISOString(),
        };

        const pinResult = await IPFSService.pinJSON(
          metadataPayload,
          `Aureum-${title.replace(/[^a-zA-Z0-9]/g, '-')}`
        );
        finalMetadataCid = pinResult.cid;
      } catch (ipfsErr) {
        console.warn('⚠️ Could not pin metadata to IPFS, falling back:', (ipfsErr as Error).message);
        finalMetadataCid = 'QmFallback' + Date.now();
      }
    }

    let onChainArtworkId: string | null = null;
    let txHash: string | null = null;
    let blockNumber: number | null = null;

    const isChainAvailable = await BlockchainService.isAvailable();

    if (isChainAvailable) {
      try {
        const chainRes = await BlockchainService.createGenesisRecord({
          title,
          artist,
          year,
          medium: medium || 'Fine Art',
          dimensions: dimensions || 'N/A',
          edition: edition || 'Original',
          authenticationMethod: authenticationMethod || 'Cryptographic Provenance Anchor',
          metadataCid: finalMetadataCid,
          documentCids: parsedDocCids.length > 0 ? parsedDocCids : [finalMetadataCid],
          imageCids: parsedImageCids.length > 0 ? parsedImageCids : [finalMetadataCid],
          bindingReference: bindingReference || 'AUREUM-PHYSICAL-TAG-' + Date.now(),
          initialOwner: ownerAddress,
        });

        onChainArtworkId = chainRes.onChainArtworkId;
        txHash = chainRes.txHash;
        blockNumber = chainRes.blockNumber;
      } catch (chainErr) {
        console.warn('⚠️ Blockchain write failed, falling back to database caching:', (chainErr as Error).message);
      }
    }

    const artwork = await prisma.artwork.create({
      data: {
        title,
        artist,
        year: year || undefined,
        medium: medium || '',
        dimensions: dimensions || '',
        metadataCid: finalMetadataCid,
        imageCids: JSON.stringify(parsedImageCids),
        documentCids: JSON.stringify(parsedDocCids),
        bindingReference: bindingReference || '',
        status: 'VERIFIED',
        ownerId,
        blockchainArtworkId: onChainArtworkId,
        txHash: txHash || '0x' + '0'.repeat(64),
        blockNumber: blockNumber || 0,
      },
    });

    res.status(201).json({
      ...artwork,
      metadataGatewayUrl: IPFSService.getGatewayUrl(finalMetadataCid),
      onChainSynced: Boolean(onChainArtworkId),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to create artwork' });
  }
});

// Get all transfers
app.get('/api/transfers', async (req: Request, res: Response) => {
  try {
    const transfers = await prisma.transfer.findMany({
      select: {
        id: true,
        blockchainTransferId: true,
        artworkId: true,
        sellerId: true,
        buyerId: true,
        transferDate: true,
        priceVisibility: true,
        status: true,
        txHash: true,
        createdAt: true,
      },
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// Create a transfer (initiates on-chain if available)
app.post('/api/transfers', async (req: Request, res: Response) => {
  try {
    const { artworkId, sellerId, buyerId, buyerAddress, transferDate, priceVisibility, priceCommitment, supportingDocCids } = req.body;
    if (!artworkId || !sellerId) {
      return res.status(400).json({ error: 'Artwork ID and seller ID are required' });
    }

    const artwork = await prisma.artwork.findUnique({ where: { id: artworkId } });
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    let onChainTransferId: string | null = null;
    let txHash: string = '0x' + '0'.repeat(64);
    let blockNumber: number = 0;

    const isChainAvailable = await BlockchainService.isAvailable();
    if (isChainAvailable && artwork.blockchainArtworkId && buyerAddress) {
      try {
        const chainRes = await BlockchainService.initiateTransfer({
          artworkId: artwork.blockchainArtworkId,
          buyerAddress,
          transferDate: transferDate ? Math.floor(new Date(transferDate).getTime() / 1000) : undefined,
          priceCommitment,
          supportingDocCids: Array.isArray(supportingDocCids) ? supportingDocCids : [],
        });
        onChainTransferId = chainRes.onChainTransferId;
        txHash = chainRes.txHash;
        blockNumber = chainRes.blockNumber;
      } catch (chainErr) {
        console.warn('⚠️ Blockchain initiateTransfer error:', (chainErr as Error).message);
      }
    }

    const transfer = await prisma.transfer.create({
      data: {
        artworkId,
        sellerId,
        buyerId: buyerId || null,
        transferDate: transferDate ? new Date(transferDate) : new Date(),
        priceVisibility: priceVisibility || 'PARTIES_AND_AUTHORISED',
        txHash,
        blockNumber,
        status: 'PENDING',
        blockchainTransferId: onChainTransferId,
      },
    });

    res.status(201).json({
      ...transfer,
      onChainSynced: Boolean(onChainTransferId),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to create transfer' });
  }
});

// Accept a pending transfer
app.post('/api/transfers/:id/accept', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transfer = await prisma.transfer.findUnique({ where: { id } });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    let finalTxHash = transfer.txHash;
    let finalBlockNumber = transfer.blockNumber;

    const isChainAvailable = await BlockchainService.isAvailable();
    if (isChainAvailable && transfer.blockchainTransferId) {
      try {
        const chainRes = await BlockchainService.acceptTransfer(transfer.blockchainTransferId);
        finalTxHash = chainRes.txHash;
        finalBlockNumber = chainRes.blockNumber;
      } catch (chainErr) {
        console.warn('⚠️ Blockchain acceptTransfer error:', (chainErr as Error).message);
      }
    }

    const updated = await prisma.transfer.update({
      where: { id },
      data: {
        status: 'FINALIZED',
        txHash: finalTxHash,
        blockNumber: finalBlockNumber,
      },
    });

    if (transfer.buyerId) {
      await prisma.artwork.update({
        where: { id: transfer.artworkId },
        data: { ownerId: transfer.buyerId },
      });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to accept transfer' });
  }
});

// Cancel a pending transfer
app.post('/api/transfers/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const transfer = await prisma.transfer.findUnique({ where: { id } });
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    const isChainAvailable = await BlockchainService.isAvailable();
    if (isChainAvailable && transfer.blockchainTransferId) {
      try {
        await BlockchainService.cancelTransfer(transfer.blockchainTransferId, reason || 'Cancelled by user');
      } catch (chainErr) {
        console.warn('⚠️ Blockchain cancelTransfer error:', (chainErr as Error).message);
      }
    }

    const updated = await prisma.transfer.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to cancel transfer' });
  }
});

// Get a specific artwork by ID
app.get('/api/artworks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const artwork = await prisma.artwork.findUnique({
      where: { id },
      select: {
        id: true,
        blockchainArtworkId: true,
        txHash: true,
        blockNumber: true,
        title: true,
        artist: true,
        year: true,
        medium: true,
        dimensions: true,
        metadataCid: true,
        imageCids: true,
        documentCids: true,
        bindingReference: true,
        status: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    res.json(artwork);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch artwork' });
  }
});

// Get transfers for a specific artwork
app.get('/api/artworks/:artworkId/transfers', async (req: Request, res: Response) => {
  try {
    const { artworkId } = req.params;
    const transfers = await prisma.transfer.findMany({
      where: { artworkId },
      select: {
        id: true,
        blockchainTransferId: true,
        artworkId: true,
        sellerId: true,
        buyerId: true,
        transferDate: true,
        priceVisibility: true,
        txHash: true,
        blockNumber: true,
        status: true,
        createdAt: true,
      },
      orderBy: { transferDate: 'desc' },
    });
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfers for artwork' });
  }
});

// Full Provenance verification (DB + On-Chain Cryptographic verification)
app.get('/api/artworks/:id/provenance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const artwork = await prisma.artwork.findUnique({ where: { id } });
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    const isChainAvailable = await BlockchainService.isAvailable();
    if (isChainAvailable && artwork.blockchainArtworkId) {
      try {
        const onChainTrail = await BlockchainService.getProvenanceTrail(artwork.blockchainArtworkId);
        return res.json({
          source: 'BLOCKCHAIN_VERIFIED',
          artwork,
          onChain: onChainTrail,
        });
      } catch (chainErr) {
        console.warn('⚠️ Could not fetch on-chain provenance:', (chainErr as Error).message);
      }
    }

    const transfers = await prisma.transfer.findMany({
      where: { artworkId: id },
      orderBy: { transferDate: 'desc' },
    });

    res.json({
      source: 'DATABASE_CACHE',
      artwork,
      transfers,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch provenance' });
  }
});

// Verify IPFS CID against on-chain anchored hash
app.get('/api/artworks/:id/verify-cid', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const artwork = await prisma.artwork.findUnique({ where: { id } });
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    const isChainAvailable = await BlockchainService.isAvailable();
    if (!isChainAvailable || !artwork.blockchainArtworkId) {
      return res.json({
        artworkId: id,
        metadataCid: artwork.metadataCid,
        onChainVerified: false,
        reason: 'Blockchain is offline or artwork is not anchored on-chain yet',
      });
    }

    const onChainArtwork = await BlockchainService.getArtwork(artwork.blockchainArtworkId);
    const metadataMatch = IPFSService.verifyCidMatch(artwork.metadataCid, onChainArtwork.metadataCid);

    res.json({
      artworkId: id,
      blockchainArtworkId: artwork.blockchainArtworkId,
      metadataCid: artwork.metadataCid,
      onChainMetadataHash: onChainArtwork.metadataCid,
      metadataMatch,
      status: metadataMatch ? 'CRYPTOGRAPHICALLY_VERIFIED' : 'MISMATCH_DETECTED',
      gatewayUrl: IPFSService.getGatewayUrl(artwork.metadataCid),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to verify CID' });
  }
});

// Serve frontend static assets in production or when dist exists
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDistPath)) {
  app.use(express.static(frontendDistPath));

  app.get('*', (req: Request, res: Response) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.sendFile(path.join(frontendDistPath, 'index.html'));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;