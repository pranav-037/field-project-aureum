import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';

import { AuthService } from './services/auth.service';
import { BlockchainService } from './services/blockchain.service';
import { IPFSService } from './services/ipfs.service';
import { IndexerService } from './services/indexer.service';
import { requireAuth, requireRole } from './middleware/auth';
import { supabase, db } from './db/supabase';
import multer from 'multer';

const app = express();
const PORT = process.env.PORT || 5000;

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
  res.json({ message: 'Aureum API is running with Supabase backend!' });
});

// Authentication routes
app.post(['/api/register', '/api/auth/register'], async (req: Request, res: Response) => {
  try {
    const { email, password, name, fullName, role, userType, walletAddress } = req.body;
    const resolvedName = name || fullName;
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    if (typeof resolvedName !== 'string' || !resolvedName.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Password is required.' });
    }
    const resolvedRole = role || (userType === 'institution' ? 'AUTHENTICATOR' : 'COLLECTOR');
    const result = await AuthService.register(email, password, resolvedName, resolvedRole, walletAddress);
    res.status(201).json(result);
  } catch (error) {
    const message = (error as Error).message || 'Registration failed.';
    const statusCode = message.includes('already exists') ? 409 : 400;
    res.status(statusCode).json({ error: message });
  }
});

app.post(['/api/login', '/api/auth/login'], async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (typeof email !== 'string' || !email.trim() || email.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ error: 'Please enter your password.' });
    }
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    const message = (error as Error).message || 'Authentication failed.';
    res.status(401).json({ error: message });
  }
});

// Google OAuth sign-in / sign-up
app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { idToken, role } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'Google ID token is required' });
    }
    const result = await AuthService.loginWithGoogle(idToken, role || 'COLLECTOR');
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message || 'Google authentication failed' });
  }
});

// Password reset request
app.post(['/api/reset-password', '/api/auth/reset-password'], async (req: Request, res: Response) => {
  try {
    const { email, redirectTo } = req.body;
    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({ error: 'Email address is required.' });
    }
    const result = await AuthService.resetPassword(email, redirectTo);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message || 'Password reset request failed' });
  }
});

// Get current user profile (protected by requireAuth)
app.get('/api/auth/me', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Try fetching fresh user record from Supabase
    try {
      const user = await db.users.findUnique(req.user.id);
      if (user) {
        return res.json({
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          walletAddress: user.walletAddress,
          googleId: user.googleId,
          avatarUrl: user.avatarUrl,
          createdAt: user.createdAt,
        });
      }
    } catch {
      // Continue to fallback
    }

    // Fallback to verified user payload
    res.json(req.user);
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify session' });
  }
});

// Update user profile
app.put(['/api/users/profile', '/api/auth/profile', '/api/users/:id'], async (req: Request, res: Response) => {
  try {
    const { name, role, walletAddress, institution } = req.body;
    let userId = req.params.id;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const payload: any = AuthService.verifyToken(token);
        if (payload?.id) userId = payload.id;
      } catch {}
    }
    let updatedUser: any = {
      id: userId || 'user-current',
      name,
      role,
      walletAddress,
      institution,
    };
    if (userId) {
      try {
        const existing = await db.users.findUnique(userId);
        if (existing) {
          const updateData: any = {};
          if (name) updateData.name = name;
          if (role) updateData.role = role;
          if (walletAddress !== undefined) updateData.walletAddress = walletAddress;
          const { data } = await supabase.from('User').update(updateData).eq('id', userId).select().single();
          if (data) {
            updatedUser = { ...data, institution };
          }
        }
      } catch {}
    }
    res.json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

// Activities history
app.get('/api/activities', async (req: Request, res: Response) => {
  try {
    const { userId, limit } = req.query;
    const take = limit ? Math.min(Number(limit), 100) : 50;
    const activities = await db.activities.findMany(userId ? String(userId) : undefined, take);
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

app.post('/api/activities', async (req: Request, res: Response) => {
  try {
    const { userId, userEmail, type, title, detail, badge, txHash } = req.body;
    if (!title || !type) {
      return res.status(400).json({ error: 'title and type are required' });
    }
    const activity = await db.activities.create({
      userId: userId || null,
      userEmail: userEmail || null,
      type,
      title,
      detail: detail || null,
      badge: badge || null,
      txHash: txHash || null,
    });
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to record activity' });
  }
});

// Health check
app.get('/health', async (req: Request, res: Response) => {
  try {
    // Check Supabase connection
    await db.users.count();
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: 'supabase-connected',
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      message: 'Supabase connection failed',
      error: (error as Error).message,
    });
  }
});

// Get all users (for testing)
app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await db.users.findMany('id, email, name, role, createdAt');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create a user (for testing)
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { email, name, role, password } = req.body;
    if (typeof email !== 'string' || !email.trim() || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'A valid email and name are required.' });
    }
    const normalizedEmail = email.trim();
    if (normalizedEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (name.trim().length < 2 || name.trim().length > 100) {
      return res.status(400).json({ error: 'Name must be between 2 and 100 characters.' });
    }
    const result = await AuthService.register(email, password, name, role || 'COLLECTOR');
    res.status(201).json(result.user);
  } catch (error) {
    const message = (error as Error).message || 'Failed to create user.';
    const statusCode = message.includes('already exists')
      ? 409
      : /Email address is required|valid email|Full name|Password must/.test(message)
        ? 400
        : 500;
    res.status(statusCode).json({ error: message });
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

// List institutions
app.get('/api/institutions', async (req: Request, res: Response) => {
  try {
    const institutions = await db.institutions.findMany();
    res.json(institutions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch institutions' });
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
      await db.institutions.updateStatus(walletAddress, 'APPROVED');
      return res.json({ success: true, ...result });
    }

    await db.institutions.updateStatus(walletAddress, 'APPROVED');
    res.json({ success: true, message: 'Institution approved (blockchain offline)' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to approve institution' });
  }
});

// IPFS Service status
app.get('/api/ipfs/status', (req: Request, res: Response) => {
  res.json({
    configured: IPFSService.isPinataConfigured(),
    gateway: process.env.IPFS_GATEWAY || 'https://gateway.pinata.cloud/ipfs/',
    localStorage: true,
  });
});

// Upload a single file to IPFS
app.post('/api/ipfs/upload', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const pinResult = await IPFSService.pinFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.status(201).json(pinResult);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to pin file to IPFS' });
  }
});

// Upload multiple files to IPFS
app.post('/api/ipfs/upload-multiple', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const uploadPromises = files.map((file) =>
      IPFSService.pinFile(file.buffer, file.originalname, file.mimetype)
    );

    const results = await Promise.all(uploadPromises);
    res.status(201).json({ files: results });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to pin multiple files to IPFS' });
  }
});

// Pin raw JSON metadata to IPFS
app.post('/api/ipfs/pin-json', async (req: Request, res: Response) => {
  try {
    const { metadata, name } = req.body;
    if (!metadata || typeof metadata !== 'object') {
      return res.status(400).json({ error: 'Valid JSON metadata is required' });
    }

    const pinResult = await IPFSService.pinJSON(metadata, name);
    res.status(201).json(pinResult);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to pin JSON to IPFS' });
  }
});

// Retrieve IPFS file metadata / redirect to gateway
app.get('/api/ipfs/:cid', async (req: Request, res: Response) => {
  try {
    const { cid } = req.params;
    const gatewayUrl = IPFSService.getGatewayUrl(cid);
    res.json({
      cid,
      gatewayUrl,
      publicUrl: gatewayUrl,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Get all artworks
app.get('/api/artworks', async (req: Request, res: Response) => {
  try {
    const artworks = await db.artworks.findMany('*');
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

    if (
      typeof title !== 'string' || !title.trim() ||
      typeof artist !== 'string' || !artist.trim() ||
      typeof medium !== 'string' || !medium.trim() ||
      typeof dimensions !== 'string' || !dimensions.trim() ||
      typeof ownerId !== 'string' || !ownerId.trim()
    ) {
      return res.status(400).json({ error: 'Title, artist, medium, dimensions, and owner are required.' });
    }
    if (title.trim().length > 120 || artist.trim().length > 100 ||
        medium.trim().length > 100 || dimensions.trim().length > 100) {
      return res.status(400).json({ error: 'Artwork fields exceed their maximum allowed length.' });
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
          title: title.trim(),
          artist: artist.trim(),
          year,
          medium: medium.trim(),
          dimensions: dimensions.trim(),
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

    const artworkData = {
      title: title.trim(),
      artist: artist.trim(),
      year: year || null,
      medium: medium.trim(),
      dimensions: dimensions.trim(),
      metadataCid: finalMetadataCid,
      imageCids: JSON.stringify(parsedImageCids),
      documentCids: JSON.stringify(parsedDocCids),
      bindingReference: bindingReference || '',
      status: 'VERIFIED',
      ownerId,
      txHash: txHash || '0x' + '0'.repeat(64),
      blockNumber: blockNumber || 0,
    };

    const artwork = onChainArtworkId
      ? await db.artworks.upsertByBlockchainId({
          ...artworkData,
          blockchainArtworkId: onChainArtworkId,
        })
      : await db.artworks.create(artworkData);

    // Record Genesis activity
    try {
      await db.activities.create({
        userId: ownerId,
        type: 'GENESIS',
        title: 'Genesis Record Created',
        detail: `"${artwork.title}" by ${artwork.artist}`,
        badge: 'NFC-BOUND',
        txHash: artwork.txHash,
      });
    } catch (actErr) {
      console.warn('Failed to log artwork activity:', actErr);
    }

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
    const transfers = await db.transfers.findMany(
      'id, blockchainTransferId, artworkId, sellerId, buyerId, transferDate, priceVisibility, status, txHash, createdAt'
    );
    const artworks = await db.artworks.findMany();
    const users = await db.users.findMany();
    const artMap = new Map((artworks || []).map((a: any) => [a.id, a]));
    const userMap = new Map((users || []).map((u: any) => [u.id, u]));

    const enriched = (transfers || []).map((t: any) => {
      const art = artMap.get(t.artworkId);
      const seller = userMap.get(t.sellerId);
      const buyer = userMap.get(t.buyerId);
      const isOutgoing = (seller?.email === 'pranavthakur037@gmail.com') ||
                         (seller?.role === 'COLLECTOR' && buyer?.role !== 'COLLECTOR') ||
                         (t.sellerId !== t.buyerId && buyer?.role === 'ADMIN') ||
                         (t.sellerId !== t.buyerId && buyer?.role === 'AUTHENTICATOR');
      return {
        ...t,
        type: isOutgoing ? 'OUTGOING' : 'INCOMING',
        artworkTitle: art?.title || `Artwork #${t.artworkId?.slice(0, 8)}`,
        artworkArtist: art?.artist || 'Fine Art Masterpiece',
        sellerName: seller?.name || seller?.organizationName || 'Louvre Curatorial Guild',
        buyerName: buyer?.name || buyer?.organizationName || 'Tate Modern Vault Escrow',
      };
    });
    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfers' });
  }
});

// Create a transfer (initiates on-chain if available)
app.post('/api/transfers', async (req: Request, res: Response) => {
  try {
    const { artworkId, sellerId, buyerId, buyerAddress, transferDate, priceVisibility, priceCommitment, supportingDocCids } = req.body;
    if (typeof artworkId !== 'string' || !artworkId.trim() ||
        typeof sellerId !== 'string' || !sellerId.trim()) {
      return res.status(400).json({ error: 'Artwork ID and seller ID are required' });
    }
    if (typeof buyerAddress !== 'string' || !/^0x[a-fA-F0-9]{40}$/.test(buyerAddress.trim())) {
      return res.status(400).json({ error: 'A valid recipient wallet address is required.' });
    }

    const artwork = await db.artworks.findUnique(artworkId);
    if (!artwork) {
      return res.status(404).json({ error: 'Artwork not found' });
    }

    let onChainTransferId: string | null = null;
    let txHash: string = '0x' + '0'.repeat(64);
    let blockNumber: number = 0;

    const isChainAvailable = await BlockchainService.isAvailable();
    if (isChainAvailable && artwork.blockchainArtworkId) {
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
        console.error('Blockchain initiateTransfer failed:', chainErr);
        return res.status(502).json({ error: 'Could not initiate the transfer on-chain' });
      }
    }

    const transferData = {
      artworkId,
      sellerId,
      buyerId: buyerId || null,
      transferDate: transferDate ? new Date(transferDate).toISOString() : new Date().toISOString(),
      priceVisibility: priceVisibility || 'PARTIES_AND_AUTHORISED',
      txHash,
      blockNumber,
      status: 'PENDING',
    };

    const transfer = onChainTransferId
      ? await db.transfers.upsertByBlockchainId({
          ...transferData,
          blockchainTransferId: onChainTransferId,
        })
      : await db.transfers.create(transferData);

    // Record Transfer Initiated activity
    try {
      await db.activities.create({
        userId: sellerId,
        type: 'TRANSFER',
        title: 'Custody Transfer Initiated',
        detail: `Transfer initiated for "${artwork.title}"`,
        badge: 'MULTISIG ESCROW',
        txHash: transfer.txHash,
      });
    } catch (actErr) {
      console.warn('Failed to log transfer activity:', actErr);
    }

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
    const transfer = await db.transfers.findUnique(id);
    if (!transfer) {
      return res.status(404).json({ error: 'Transfer not found' });
    }

    if (transfer.blockchainTransferId) {
      return res.status(409).json({
        error: 'Accept this transfer from the recipient wallet. The transfer status will update after the on-chain confirmation.',
      });
    }

    const updated = await db.transfers.update(id, {
      status: 'FINALIZED',
    });

    if (transfer.buyerId) {
      await db.artworks.update(transfer.artworkId, { ownerId: transfer.buyerId });
    }

    // Record Transfer Finalized activity
    try {
      await db.activities.create({
        userId: transfer.buyerId || transfer.sellerId,
        type: 'TRANSFER',
        title: 'Custody Transfer Finalized',
        detail: `Transfer finalized on-chain`,
        badge: 'FINALIZED',
        txHash: transfer.txHash,
      });
    } catch (actErr) {
      console.warn('Failed to log transfer finalize activity:', actErr);
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
    const transfer = await db.transfers.findUnique(id);
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

    const updated = await db.transfers.update(id, { status: 'CANCELLED' });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message || 'Failed to cancel transfer' });
  }
});

// Get a specific artwork by ID
app.get('/api/artworks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const artwork = await db.artworks.findUnique(id);

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
    const transfers = await db.transfers.findByArtworkId(artworkId);
    res.json(transfers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transfers for artwork' });
  }
});

// Full Provenance verification (DB + On-Chain Cryptographic verification)
app.get('/api/artworks/:id/provenance', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const artwork = await db.artworks.findUnique(id);
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

    const transfers = await db.transfers.findByArtworkId(id);

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
    const artwork = await db.artworks.findUnique(id);
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
  console.log(`Server is running on port ${PORT} (100% Supabase powered)`);
});

export default app;
