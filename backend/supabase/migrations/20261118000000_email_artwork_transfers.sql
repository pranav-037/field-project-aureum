-- Email-addressed custody transfers with atomic approval.
ALTER TABLE "Transfer"
  ADD COLUMN IF NOT EXISTS "senderUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "recipientUserId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transfer_sender_user_fk') THEN
    ALTER TABLE "Transfer"
      ADD CONSTRAINT transfer_sender_user_fk
      FOREIGN KEY ("senderUserId") REFERENCES "User"("id") NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transfer_recipient_user_fk') THEN
    ALTER TABLE "Transfer"
      ADD CONSTRAINT transfer_recipient_user_fk
      FOREIGN KEY ("recipientUserId") REFERENCES "User"("id") NOT VALID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transfer_artwork_fk') THEN
    ALTER TABLE "Transfer"
      ADD CONSTRAINT transfer_artwork_fk
      FOREIGN KEY ("artworkId") REFERENCES "Artwork"("id") NOT VALID;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS "idx_transfer_recipient_user"
  ON "Transfer"("recipientUserId");
CREATE INDEX IF NOT EXISTS "idx_transfer_recipient_status"
  ON "Transfer"("recipientUserId", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_transfer_one_pending_email_per_artwork"
  ON "Transfer"("artworkId")
  WHERE "status" = 'pending' AND "senderUserId" IS NOT NULL;

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
  SELECT * INTO v_transfer
  FROM "Transfer"
  WHERE "id" = p_transfer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSFER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_transfer."recipientUserId" IS DISTINCT FROM p_recipient_user_id THEN
    RAISE EXCEPTION 'RECIPIENT_MISMATCH' USING ERRCODE = 'P0001';
  END IF;
  IF v_transfer."senderUserId" IS DISTINCT FROM p_sender_user_id
     OR v_transfer."status" <> 'pending' THEN
    RAISE EXCEPTION 'TRANSFER_NOT_PENDING' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_artwork
  FROM "Artwork"
  WHERE "id" = v_transfer."artworkId"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TRANSFER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;
  IF v_artwork."ownerId" <> p_sender_user_id
     AND (
       p_sender_wallet_address IS NULL
       OR lower(v_artwork."ownerId") <> lower(p_sender_wallet_address)
     ) THEN
    RAISE EXCEPTION 'ARTWORK_CUSTODY_MISMATCH' USING ERRCODE = 'P0001';
  END IF;

  UPDATE "Artwork"
  SET "ownerId" = p_recipient_user_id,
      "updatedAt" = timezone('utc'::text, now())
  WHERE "id" = v_artwork."id";

  UPDATE "Transfer"
  SET "status" = 'accepted',
      "buyerId" = p_recipient_user_id,
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
