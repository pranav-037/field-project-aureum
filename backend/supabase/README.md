# Supabase Database Migration Guide

This directory contains the database migration assets to replace the legacy Prisma SQLite database with a production-ready Supabase PostgreSQL database for Aureum.

---

## 📁 Files in this Migration

| File | Purpose |
|------|---------|
| [`schema.sql`](./schema.sql) | Complete SQL migration script (Tables, Indexes, RLS Policies, Functions & Triggers). |
| [`migrations/20261109000000_init_schema.sql`](./migrations/20261109000000_init_schema.sql) | Versioned migration file for Supabase CLI (`supabase db push`). |
| [`migrations/20261118000000_email_artwork_transfers.sql`](./migrations/20261118000000_email_artwork_transfers.sql) | Adds email-addressed transfers, recipient indexes, foreign keys, and atomic approval. |
| [`../scripts/migrate-to-supabase.ts`](../scripts/migrate-to-supabase.ts) | Automated Node.js / TypeScript data migration pipeline (extracts existing SQLite data and upserts into Supabase). |
| [`../src/db/supabase.ts`](../src/db/supabase.ts) | Supabase client singleton and TypeScript interfaces. |

---

## 🚀 Execution Steps

### Step 1: Create Supabase Project & Retrieve API Keys
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Under **Project Settings -> API**, copy:
   - **Project URL** (`SUPABASE_URL`)
   - **anon / public key** (`SUPABASE_ANON_KEY`)
   - **service_role secret key** (`SUPABASE_SERVICE_ROLE_KEY`)

### Step 2: Apply the PostgreSQL Schema

You can apply the schema using either the **Supabase Dashboard** or the **Supabase CLI**:

#### Option A: Supabase Dashboard (Recommended / Easiest)
1. Open your Supabase Dashboard and click on **SQL Editor** in the left sidebar.
2. Create a new query, paste the full contents of [`backend/supabase/schema.sql`](./schema.sql), and click **Run**.
3. All 8 tables (`User`, `Institution`, `Artwork`, `Transfer`, `Amendment`, `DisputeFlag`, `SyncState`, `Activity`), indexes, triggers, and Row Level Security (RLS) policies will be created.

#### Option B: Supabase CLI
```bash
# Link to your Supabase project
npx supabase link --project-ref your-project-ref

# Push the migration
npx supabase db push
```

---

### Step 3: Configure Environment Variables

Edit `field-project-aureum/backend/.env` with your Supabase credentials:

```env
SUPABASE_URL=https://<your-project-id>.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
FRONTEND_URL=http://localhost:5173
```

### Authentication email setup

Registration uses a confirmation link, email/password is used to sign in, and password recovery uses a reset link. Configure Supabase Auth in the Dashboard:

1. Enable the Email provider and **Confirm email** under **Authentication -> Providers -> Email**.
2. Set the **Confirm signup** and **Reset password** templates to use `{{ .ConfirmationURL }}`.
3. Configure a production SMTP provider for reliable delivery; Supabase's default email service is rate-limited and intended for testing.
4. Set the **Site URL** to `https://aureum-app.onrender.com` and add `https://aureum-app.onrender.com/auth/callback*` and `https://aureum-app.onrender.com/reset-password` to the allowed redirect URLs. Keep `http://localhost:5174/auth/callback*` and `http://localhost:5174/reset-password` for local development. The Render deployment sets `VITE_SITE_URL` to the public site so verification links work on other devices.
5. Copy the project URL and **anon/public** key into `frontend/.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never use the service-role key in the frontend.

**RLS warning:** the current schema grants anonymous/authenticated SELECT on every table. A browser Supabase client exposes the anon key by design, so do not use it with sensitive production data until table-specific RLS policies are reviewed and applied. The OTP client only uses Auth, but the exposed key can also be used against the project's Data API.

---

### Step 4: Run Data Migration Script

To transfer any existing records from your SQLite database (`prisma/dev.db`) into Supabase:

```bash
cd field-project-aureum/backend
npm run db:migrate-data
```

The script will:
- Connect to both SQLite and Supabase
- Read records for each model
- Sanitize timestamps and batch upsert in chunks of 100
- Validate target table row counts
- Output a verification summary table

---

### Step 5: Verify Schema & Data in Supabase

1. In Supabase Dashboard, open **Table Editor**.
2. Verify all tables are present with expected columns and data:
   - `User`
   - `Institution`
   - `Artwork`
   - `Transfer`
   - `Amendment`
   - `DisputeFlag`
   - `SyncState`
   - `Activity`
3. Verify RLS is enabled on all tables with full access granted for `service_role`.

### Email-based artwork custody transfers

Every account receives a starter collection on its first authenticated API request. An empty account starts with five labeled sample artworks, three initially owned works, two pending incoming transfers, and one pending outgoing transfer. Two of the owned samples have verified status. Existing owned or transfer-linked works with the same title and artist are reused, so an established account's totals can differ. Run `npm run seed:demo` from `backend` to populate existing profiles. The script inserts missing sample records using stable IDs and preserves ownership changes and transfer decisions. Each account's registry shows one entry per demo artwork. Sample transfers use a public sample custodian profile without creating a Supabase Auth login.

For an existing database, apply `migrations/20261118000000_email_artwork_transfers.sql` after the initial schema migration (or run `npx supabase db push`). It adds `senderUserId` and `recipientUserId` references to `User`, a foreign key from each transfer to `Artwork`, pending-recipient indexes, and the `approve_user_artwork_transfer` PostgreSQL function. Foreign keys are added `NOT VALID` to avoid blocking on older transfer history; new writes are still checked.

The authenticated API supports `POST /api/transfers` with `{ "artworkId": "...", "recipientEmail": "..." }`, `GET /api/transfers/incoming`, and recipient-only `POST /api/transfers/:id/approve` or `/reject`. Approval runs in one database function/transaction and moves `Artwork.ownerId` together with the transfer status. The dashboard polls every 15 seconds for sender-side status changes. Existing wallet/on-chain transfer routes remain available.

Run the backend service tests with `cd backend && npm test`; they cover request validation, duplicate requests, recipient listing, approval, rejection, and custody changes.

