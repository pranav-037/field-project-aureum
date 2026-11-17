-- ==============================================================================
-- Supabase PostgreSQL Migration for Aureum Platform
-- Replaces Prisma SQLite schema with production-grade Supabase schema
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function to automatically manage updated_at timestamps
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ------------------------------------------------------------------------------
-- 1. User Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "email" TEXT NOT NULL UNIQUE,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'VIEWER', -- ADMIN, AUTHENTICATOR, VIEWER, COLLECTOR
  "password" TEXT NOT NULL DEFAULT '',
  "walletAddress" TEXT,
  "googleId" TEXT UNIQUE,
  "avatarUrl" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS "idx_user_email" ON "User"("email");
CREATE INDEX IF NOT EXISTS "idx_user_wallet_address" ON "User"("walletAddress");
CREATE INDEX IF NOT EXISTS "idx_user_google_id" ON "User"("googleId");

CREATE OR REPLACE TRIGGER trigger_user_updated_at
BEFORE UPDATE ON "User"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 2. Institution Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Institution" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "walletAddress" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- APPROVED, REVOKED, PENDING
  "approvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS "idx_institution_wallet" ON "Institution"("walletAddress");
CREATE INDEX IF NOT EXISTS "idx_institution_status" ON "Institution"("status");

CREATE OR REPLACE TRIGGER trigger_institution_updated_at
BEFORE UPDATE ON "Institution"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 3. Artwork Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Artwork" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "blockchainArtworkId" TEXT UNIQUE,
  "txHash" TEXT,
  "blockNumber" INTEGER,
  "title" TEXT NOT NULL,
  "artist" TEXT NOT NULL,
  "year" TEXT,
  "medium" TEXT NOT NULL,
  "dimensions" TEXT NOT NULL,
  "metadataCid" TEXT NOT NULL,
  "imageCids" TEXT NOT NULL DEFAULT '',
  "documentCids" TEXT NOT NULL DEFAULT '',
  "bindingReference" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'UNVERIFIABLE', -- VERIFIED, BROKEN, UNVERIFIABLE, DISPUTED
  "ownerId" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS "idx_artwork_blockchain_id" ON "Artwork"("blockchainArtworkId");
CREATE INDEX IF NOT EXISTS "idx_artwork_owner" ON "Artwork"("ownerId");
CREATE INDEX IF NOT EXISTS "idx_artwork_status" ON "Artwork"("status");

CREATE OR REPLACE TRIGGER trigger_artwork_updated_at
BEFORE UPDATE ON "Artwork"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 4. Transfer Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Transfer" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "blockchainTransferId" TEXT UNIQUE,
  "artworkId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "buyerId" TEXT,
  "senderUserId" TEXT,
  "recipientUserId" TEXT,
  "transferDate" TIMESTAMPTZ NOT NULL,
  "priceVisibility" TEXT NOT NULL DEFAULT 'PUBLIC', -- PUBLIC, PARTIES_AND_AUTHORISED, HIDDEN
  "txHash" TEXT NOT NULL,
  "blockNumber" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, FINALIZED, EXPIRED, CANCELLED
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT transfer_sender_user_fk FOREIGN KEY ("senderUserId") REFERENCES "User"("id"),
  CONSTRAINT transfer_recipient_user_fk FOREIGN KEY ("recipientUserId") REFERENCES "User"("id"),
  CONSTRAINT transfer_artwork_fk FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id")
);

CREATE INDEX IF NOT EXISTS "idx_transfer_artwork" ON "Transfer"("artworkId");
CREATE INDEX IF NOT EXISTS "idx_transfer_blockchain_id" ON "Transfer"("blockchainTransferId");
CREATE INDEX IF NOT EXISTS "idx_transfer_seller" ON "Transfer"("sellerId");
CREATE INDEX IF NOT EXISTS "idx_transfer_buyer" ON "Transfer"("buyerId");
CREATE INDEX IF NOT EXISTS "idx_transfer_status" ON "Transfer"("status");
CREATE INDEX IF NOT EXISTS "idx_transfer_recipient_user" ON "Transfer"("recipientUserId");
CREATE INDEX IF NOT EXISTS "idx_transfer_recipient_status" ON "Transfer"("recipientUserId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transfer_one_pending_email_per_artwork"
  ON "Transfer"("artworkId")
  WHERE "status" = 'pending' AND "senderUserId" IS NOT NULL;

CREATE OR REPLACE TRIGGER trigger_transfer_updated_at
BEFORE UPDATE ON "Transfer"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION approve_user_artwork_transfer(
  p_transfer_id TEXT,
  p_recipient_user_id TEXT,
  p_sender_user_id TEXT,
  p_sender_wallet_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_transfer "Transfer"%ROWTYPE;
  v_artwork "Artwork"%ROWTYPE;
BEGIN
  SELECT * INTO v_transfer FROM "Transfer" WHERE "id" = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRANSFER_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF v_transfer."recipientUserId" IS DISTINCT FROM p_recipient_user_id THEN
    RAISE EXCEPTION 'RECIPIENT_MISMATCH' USING ERRCODE = 'P0001';
  END IF;
  IF v_transfer."senderUserId" IS DISTINCT FROM p_sender_user_id OR v_transfer."status" <> 'pending' THEN
    RAISE EXCEPTION 'TRANSFER_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_artwork FROM "Artwork" WHERE "id" = v_transfer."artworkId" FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TRANSFER_NOT_FOUND' USING ERRCODE = 'P0001'; END IF;
  IF v_artwork."ownerId" <> p_sender_user_id
     AND (p_sender_wallet_address IS NULL OR lower(v_artwork."ownerId") <> lower(p_sender_wallet_address)) THEN
    RAISE EXCEPTION 'ARTWORK_CUSTODY_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  UPDATE "Artwork"
  SET "ownerId" = p_recipient_user_id, "updatedAt" = timezone('utc'::text, now())
  WHERE "id" = v_artwork."id";
  UPDATE "Transfer"
  SET "status" = 'accepted', "buyerId" = p_recipient_user_id,
      "updatedAt" = timezone('utc'::text, now())
  WHERE "id" = v_transfer."id"
  RETURNING * INTO v_transfer;
  RETURN to_jsonb(v_transfer);
END;
$$;

REVOKE ALL ON FUNCTION approve_user_artwork_transfer(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION approve_user_artwork_transfer(TEXT, TEXT, TEXT, TEXT) FROM anon;
REVOKE ALL ON FUNCTION approve_user_artwork_transfer(TEXT, TEXT, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION approve_user_artwork_transfer(TEXT, TEXT, TEXT, TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 5. Amendment Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Amendment" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "blockchainAmendmentId" TEXT NOT NULL UNIQUE,
  "blockchainArtworkId" TEXT NOT NULL,
  "issuerAddress" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "txHash" TEXT NOT NULL,
  "blockNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS "idx_amendment_artwork_id" ON "Amendment"("blockchainArtworkId");
CREATE INDEX IF NOT EXISTS "idx_amendment_blockchain_id" ON "Amendment"("blockchainAmendmentId");

-- ------------------------------------------------------------------------------
-- 6. DisputeFlag Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "DisputeFlag" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "blockchainFlagId" TEXT NOT NULL UNIQUE,
  "blockchainArtworkId" TEXT NOT NULL,
  "flaggerAddress" TEXT NOT NULL,
  "flagType" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "evidenceRef" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "txHash" TEXT NOT NULL,
  "blockNumber" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  "resolvedAt" TIMESTAMPTZ,
  "resolverAddress" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_flag_blockchain_artwork" ON "DisputeFlag"("blockchainArtworkId");
CREATE INDEX IF NOT EXISTS "idx_flag_blockchain_id" ON "DisputeFlag"("blockchainFlagId");
CREATE INDEX IF NOT EXISTS "idx_flag_active" ON "DisputeFlag"("active");

-- ------------------------------------------------------------------------------
-- 7. SyncState Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SyncState" (
  "id" TEXT PRIMARY KEY DEFAULT 'singleton',
  "lastBlockIndexed" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE OR REPLACE TRIGGER trigger_syncstate_updated_at
BEFORE UPDATE ON "SyncState"
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------------------------
-- 8. Activity Table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Activity" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" TEXT,
  "userEmail" TEXT,
  "type" TEXT NOT NULL, -- LOGIN, REGISTER, GENESIS, TRANSFER, VERIFICATION, AMENDMENT, FLAG
  "title" TEXT NOT NULL,
  "detail" TEXT,
  "badge" TEXT,
  "txHash" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS "idx_activity_user_id" ON "Activity"("userId");
CREATE INDEX IF NOT EXISTS "idx_activity_created_at" ON "Activity"("createdAt" DESC);

-- ------------------------------------------------------------------------------
-- Enable Row Level Security (RLS) on all tables
-- ------------------------------------------------------------------------------
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Institution" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Artwork" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transfer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Amendment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "DisputeFlag" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SyncState" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Activity" ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- Service Role Policy (Full access for server backend via service_role key)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY['User', 'Institution', 'Artwork', 'Transfer', 'Amendment', 'DisputeFlag', 'SyncState', 'Activity'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "service_role_all" ON %I', tbl);
    EXECUTE format('CREATE POLICY "service_role_all" ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', tbl);
    
    -- Public read policy for artworks and verified transfers
    EXECUTE format('DROP POLICY IF EXISTS "allow_anon_read" ON %I', tbl);
    EXECUTE format('CREATE POLICY "allow_anon_read" ON %I FOR SELECT TO anon, authenticated USING (true)', tbl);
  END LOOP;
END;
$$;

-- ------------------------------------------------------------------------------
-- 9. Automatic Sync of Supabase Auth Users with Public "User" Profile Table
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (
    "id",
    "email",
    "name",
    "role",
    "walletAddress",
    "avatarUrl",
    "password",
    "createdAt",
    "updatedAt"
  )
  VALUES (
    NEW.id::text,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'COLLECTOR'),
    NEW.raw_user_meta_data->>'walletAddress',
    NEW.raw_user_meta_data->>'avatar_url',
    '',
    NEW.created_at,
    now()
  )
  ON CONFLICT ("id") DO UPDATE
  SET
    "name" = EXCLUDED."name",
    "role" = EXCLUDED."role",
    "walletAddress" = COALESCE(EXCLUDED."walletAddress", public."User"."walletAddress"),
    "avatarUrl" = COALESCE(EXCLUDED."avatarUrl", public."User"."avatarUrl"),
    "updatedAt" = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table (executed whenever a user signs up via Supabase Auth)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'users') THEN
    DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT OR UPDATE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
  END IF;
END;
$$;

