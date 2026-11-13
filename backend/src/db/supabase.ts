import { createClient, SupabaseClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

const rawUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'placeholder-key';

if (
  !process.env.SUPABASE_URL ||
  (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.SUPABASE_ANON_KEY)
) {
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

/**
 * Clean Supabase Typed Database Client
 * Replaces all Prisma ORM operations across Aureum platform.
 */
export const db = {
  // ── Users ──
  users: {
    async count(): Promise<number> {
      const { count, error } = await supabase
        .from('User')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    async findMany(select = 'id, email, name, role, createdAt'): Promise<Partial<DbUser>[]> {
      const { data, error } = await supabase.from('User').select(select);
      if (error) throw error;
      return (data as any) || [];
    },
    async findUnique(id: string): Promise<DbUser | null> {
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async findByEmail(email: string): Promise<DbUser | null> {
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async create(userData: Partial<DbUser>): Promise<DbUser> {
      const id = userData.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('User')
        .insert({
          id,
          createdAt: now,
          updatedAt: now,
          ...userData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  // ── Institutions ──
  institutions: {
    async findMany(): Promise<DbInstitution[]> {
      const { data, error } = await supabase
        .from('Institution')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async findByWallet(walletAddress: string): Promise<DbInstitution | null> {
      const { data, error } = await supabase
        .from('Institution')
        .select('*')
        .eq('walletAddress', walletAddress)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async upsert(institutionData: {
      name: string;
      walletAddress: string;
      status: string;
      approvedAt?: string | Date | null;
    }): Promise<DbInstitution> {
      const now = new Date().toISOString();
      const approvedAt = institutionData.approvedAt
        ? new Date(institutionData.approvedAt).toISOString()
        : null;
      const { data, error } = await supabase
        .from('Institution')
        .upsert(
          {
            name: institutionData.name,
            walletAddress: institutionData.walletAddress,
            status: institutionData.status,
            approvedAt,
            updatedAt: now,
          },
          { onConflict: 'walletAddress' }
        )
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    async updateStatus(walletAddress: string, status: string): Promise<void> {
      const { error } = await supabase
        .from('Institution')
        .update({ status, updatedAt: new Date().toISOString() })
        .eq('walletAddress', walletAddress);
      if (error) throw error;
    },
  },

  // ── Artworks ──
  artworks: {
    async count(): Promise<number> {
      const { count, error } = await supabase
        .from('Artwork')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    async findMany(select = 'id, blockchainArtworkId, txHash, title, artist, status, createdAt'): Promise<any[]> {
      const { data, error } = await supabase
        .from('Artwork')
        .select(select)
        .order('createdAt', { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
    async findUnique(id: string): Promise<DbArtwork | null> {
      const { data, error } = await supabase
        .from('Artwork')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async findByBlockchainId(blockchainArtworkId: string): Promise<DbArtwork | null> {
      const { data, error } = await supabase
        .from('Artwork')
        .select('*')
        .eq('blockchainArtworkId', blockchainArtworkId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async findByBlockchainIdOrBinding(blockchainArtworkId: string, bindingReference: string): Promise<DbArtwork | null> {
      const { data, error } = await supabase
        .from('Artwork')
        .select('*')
        .or(`blockchainArtworkId.eq.${blockchainArtworkId},bindingReference.eq.${bindingReference}`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async create(artworkData: Partial<DbArtwork>): Promise<DbArtwork> {
      const id = artworkData.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('Artwork')
        .insert({
          id,
          createdAt: now,
          updatedAt: now,
          ...artworkData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    async update(id: string, updates: Partial<DbArtwork>): Promise<DbArtwork> {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('Artwork')
        .update({
          ...updates,
          updatedAt: now,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    async updateByBlockchainId(blockchainArtworkId: string, updates: Partial<DbArtwork>): Promise<void> {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('Artwork')
        .update({
          ...updates,
          updatedAt: now,
        })
        .eq('blockchainArtworkId', blockchainArtworkId);
      if (error) throw error;
    },
  },

  // ── Transfers ──
  transfers: {
    async count(): Promise<number> {
      const { count, error } = await supabase
        .from('Transfer')
        .select('*', { count: 'exact', head: true });
      if (error) throw error;
      return count || 0;
    },
    async findMany(select = 'id, blockchainTransferId, artworkId, sellerId, buyerId, transferDate, priceVisibility, status, txHash, createdAt'): Promise<any[]> {
      const { data, error } = await supabase
        .from('Transfer')
        .select(select)
        .order('createdAt', { ascending: false });
      if (error) throw error;
      return (data as any) || [];
    },
    async findUnique(id: string): Promise<DbTransfer | null> {
      const { data, error } = await supabase
        .from('Transfer')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async findByBlockchainId(blockchainTransferId: string): Promise<DbTransfer | null> {
      const { data, error } = await supabase
        .from('Transfer')
        .select('*')
        .eq('blockchainTransferId', blockchainTransferId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async findByArtworkId(artworkId: string): Promise<DbTransfer[]> {
      const { data, error } = await supabase
        .from('Transfer')
        .select('*')
        .eq('artworkId', artworkId)
        .order('transferDate', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async create(transferData: Partial<DbTransfer>): Promise<DbTransfer> {
      const id = transferData.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('Transfer')
        .insert({
          id,
          createdAt: now,
          updatedAt: now,
          ...transferData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    async update(id: string, updates: Partial<DbTransfer>): Promise<DbTransfer> {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('Transfer')
        .update({
          ...updates,
          updatedAt: now,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    async updateByBlockchainId(blockchainTransferId: string, updates: Partial<DbTransfer>): Promise<void> {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('Transfer')
        .update({
          ...updates,
          updatedAt: now,
        })
        .eq('blockchainTransferId', blockchainTransferId);
      if (error) throw error;
    },
  },

  // ── Amendments ──
  amendments: {
    async findByBlockchainId(blockchainAmendmentId: string): Promise<DbAmendment | null> {
      const { data, error } = await supabase
        .from('Amendment')
        .select('*')
        .eq('blockchainAmendmentId', blockchainAmendmentId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async create(amendmentData: Partial<DbAmendment>): Promise<DbAmendment> {
      const id = amendmentData.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('Amendment')
        .insert({
          id,
          createdAt: now,
          ...amendmentData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },

  // ── Dispute Flags ──
  disputeFlags: {
    async findByBlockchainId(blockchainFlagId: string): Promise<DbDisputeFlag | null> {
      const { data, error } = await supabase
        .from('DisputeFlag')
        .select('*')
        .eq('blockchainFlagId', blockchainFlagId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async countActiveForArtwork(blockchainArtworkId: string): Promise<number> {
      const { count, error } = await supabase
        .from('DisputeFlag')
        .select('*', { count: 'exact', head: true })
        .eq('blockchainArtworkId', blockchainArtworkId)
        .eq('active', true);
      if (error) throw error;
      return count || 0;
    },
    async create(flagData: Partial<DbDisputeFlag>): Promise<DbDisputeFlag> {
      const id = flagData.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('DisputeFlag')
        .insert({
          id,
          createdAt: now,
          ...flagData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    async resolveFlag(blockchainFlagId: string, resolverAddress: string, resolvedAt: Date): Promise<void> {
      const { error } = await supabase
        .from('DisputeFlag')
        .update({
          active: false,
          resolverAddress,
          resolvedAt: resolvedAt.toISOString(),
        })
        .eq('blockchainFlagId', blockchainFlagId);
      if (error) throw error;
    },
  },

  // ── SyncState ──
  syncState: {
    async get(): Promise<DbSyncState | null> {
      const { data, error } = await supabase
        .from('SyncState')
        .select('*')
        .eq('id', 'singleton')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    async upsert(lastBlockIndexed: number): Promise<void> {
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('SyncState')
        .upsert(
          {
            id: 'singleton',
            lastBlockIndexed,
            updatedAt: now,
          },
          { onConflict: 'id' }
        );
      if (error) throw error;
    },
  },

  // ── Activities ──
  activities: {
    async findMany(userId?: string, limit = 50): Promise<DbActivity[]> {
      let query = supabase.from('Activity').select('*').order('createdAt', { ascending: false }).limit(limit);
      if (userId) {
        query = query.eq('userId', userId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    async create(activityData: Partial<DbActivity>): Promise<DbActivity> {
      const id = activityData.id || crypto.randomUUID();
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('Activity')
        .insert({
          id,
          createdAt: now,
          ...activityData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
  },
};
