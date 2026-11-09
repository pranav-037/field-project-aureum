/**
 * Migration Script: Migrate data from Prisma SQLite database to Supabase PostgreSQL
 * 
 * Usage:
 *   npx ts-node scripts/migrate-to-supabase.ts
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined in your .env file.');
  process.exit(1);
}

const prisma = new PrismaClient();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function migrateTable<T extends { id?: any }>(
  tableName: string,
  fetchFn: () => Promise<T[]>,
  primaryKey: string = 'id'
) {
  console.log(`\n⏳ Fetching records for "${tableName}" from Prisma SQLite...`);
  const records = await fetchFn();
  console.log(`ℹ️ Found ${records.length} records in SQLite "${tableName}".`);

  if (records.length === 0) {
    console.log(`⏩ Skipping "${tableName}" (0 records).`);
    return { sourceCount: 0, targetCount: 0 };
  }

  // Sanitize Date objects to ISO strings if needed
  const sanitized = records.map((record: any) => {
    const copy = { ...record };
    for (const [key, value] of Object.entries(copy)) {
      if (value instanceof Date) {
        copy[key] = value.toISOString();
      }
    }
    return copy;
  });

  // Batch upsert in chunks of 100
  const CHUNK_SIZE = 100;
  let inserted = 0;
  for (let i = 0; i < sanitized.length; i += CHUNK_SIZE) {
    const chunk = sanitized.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from(tableName).upsert(chunk, {
      onConflict: primaryKey,
    });

    if (error) {
      console.error(`❌ Error migrating chunk ${i / CHUNK_SIZE + 1} of "${tableName}":`, error.message);
      throw error;
    }
    inserted += chunk.length;
  }

  // Verify count in Supabase
  const { count, error: countErr } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (countErr) {
    console.warn(`⚠️ Warning: Could not verify count for "${tableName}":`, countErr.message);
  } else {
    console.log(`✅ "${tableName}" migration complete: ${inserted} records upserted. (Supabase total: ${count})`);
  }

  return { sourceCount: records.length, targetCount: count || inserted };
}

async function runMigration() {
  console.log('================================================================');
  console.log('🚀 Starting Aureum Data Migration: SQLite (Prisma) -> Supabase');
  console.log('Target Supabase URL:', SUPABASE_URL);
  console.log('================================================================');

  const summary: Record<string, { sourceCount: number; targetCount: number }> = {};

  try {
    // 1. User
    summary['User'] = await migrateTable('User', () => prisma.user.findMany());

    // 2. Institution
    summary['Institution'] = await migrateTable('Institution', () => prisma.institution.findMany(), 'walletAddress');

    // 3. Artwork
    summary['Artwork'] = await migrateTable('Artwork', () => prisma.artwork.findMany());

    // 4. Transfer
    summary['Transfer'] = await migrateTable('Transfer', () => prisma.transfer.findMany());

    // 5. Amendment
    summary['Amendment'] = await migrateTable('Amendment', () => prisma.amendment.findMany(), 'blockchainAmendmentId');

    // 6. DisputeFlag
    summary['DisputeFlag'] = await migrateTable('DisputeFlag', () => prisma.disputeFlag.findMany(), 'blockchainFlagId');

    // 7. SyncState
    summary['SyncState'] = await migrateTable('SyncState', () => prisma.syncState.findMany());

    // 8. Activity
    summary['Activity'] = await migrateTable('Activity', () => prisma.activity.findMany());

    console.log('\n================================================================');
    console.log('🎉 Data Migration Finished Successfully!');
    console.log('================================================================');
    console.table(summary);
  } catch (err) {
    console.error('\n❌ Migration failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();

