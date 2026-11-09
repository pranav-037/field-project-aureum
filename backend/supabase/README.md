# Supabase Database Migration Guide

This directory contains the database migration assets to replace the legacy Prisma SQLite database with a production-ready Supabase PostgreSQL database for Aureum.

---

## 📁 Files in this Migration

| File | Purpose |
|------|---------|
| [`schema.sql`](./schema.sql) | Complete SQL migration script (Tables, Indexes, RLS Policies, Functions & Triggers). |
| [`migrations/20261109000000_init_schema.sql`](./migrations/20261109000000_init_schema.sql) | Versioned migration file for Supabase CLI (`supabase db push`). |
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
```

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

