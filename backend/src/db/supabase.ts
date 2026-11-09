import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'placeholder-key';

if (!process.env.SUPABASE_URL || (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)) {
  console.warn(
    '⚠️ Supabase environment variables missing! Please configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file.'
  );
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Database Models Interface
export interface DbUser {
  id: string;
  email: string;
  name: string;
  role: string;
  password?: string;
  walletAddress?: string | null;
  googleId?: string | null;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbInstitution {
  id: string;
  name: string;
  walletAddress: string;
  status: string;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DbArtwork {
  id: string;
  blockchainArtworkId?: string | null;
  txHash?: string | null;
  blockNumber?: number | null;
  title: string;
  artist: string;
  year?: string | null;
  medium: string;
  dimensions: string;
  metadataCid: string;
  imageCids: string;
  documentCids: string;
  bindingReference: string;
  status: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbTransfer {
  id: string;
  blockchainTransferId?: string | null;
  artworkId: string;
  sellerId: string;
  buyerId?: string | null;
  transferDate: string;
  priceVisibility: string;
  txHash: string;
  blockNumber: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface DbAmendment {
  id: string;
  blockchainAmendmentId: string;
  blockchainArtworkId: string;
  issuerAddress: string;
  reason: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
}

export interface DbDisputeFlag {
  id: string;
  blockchainFlagId: string;
  blockchainArtworkId: string;
  flaggerAddress: string;
  flagType: number;
  reason: string;
  evidenceRef: string;
  active: boolean;
  txHash: string;
  blockNumber: number;
  createdAt: string;
  resolvedAt?: string | null;
  resolverAddress?: string | null;
}

export interface DbSyncState {
  id: string;
  lastBlockIndexed: number;
  updatedAt: string;
}

export interface DbActivity {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  type: string;
  title: string;
  detail?: string | null;
  badge?: string | null;
  txHash?: string | null;
  createdAt: string;
}

