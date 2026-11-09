/**
 * Script: Send Supabase Password Reset emails to existing legacy users
 * 
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/send-reset-emails.ts
 */

import { PrismaClient } from '@prisma/client';
import { supabase } from '../src/db/supabase';
import dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('================================================================');
  console.log('🔑 Supabase Password Reset Utility for Legacy Users');
  console.log('================================================================');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
    process.exit(1);
  }

  // Fetch all legacy collectors & users
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} legacy users in SQLite.`);

  if (users.length === 0) {
    console.log('No legacy users to migrate.');
    return;
  }

  for (const user of users) {
    console.log(`\nProcessing: ${user.email} (${user.role})...`);
    try {
      // 1. Ensure user exists in Supabase Auth (create with temporary random password if missing)
      const { data: created, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          role: user.role,
          walletAddress: user.walletAddress,
        },
      });

      if (createError && !createError.message.includes('already been registered')) {
        console.warn(`  ⚠️ Could not register auth user for ${user.email}:`, createError.message);
      }

      // 2. Generate password reset link
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: user.email,
        options: {
          redirectTo: process.env.FRONTEND_URL || 'http://localhost:5173/login',
        },
      });

      if (linkError) {
        console.error(`  ❌ Failed to generate reset link for ${user.email}:`, linkError.message);
      } else {
        console.log(`  ✅ Generated recovery link for ${user.email}:`);
        console.log(`     Link: ${linkData.properties.action_link}`);
      }
    } catch (err) {
      console.error(`  ❌ Error processing ${user.email}:`, err);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 Done processing password reset links.');
  console.log('================================================================');
}

main().finally(() => prisma.$disconnect());

