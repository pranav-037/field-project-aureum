/**
 * Script: Send Supabase Password Reset emails to users
 * 
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/send-reset-emails.ts
 */

import { supabase, db } from '../src/db/supabase';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
  console.log('================================================================');
  console.log('🔑 Supabase Password Reset Utility');
  console.log('================================================================');

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env');
    process.exit(1);
  }

  // Fetch all users from Supabase User table
  const users = await db.users.findMany('*');
  console.log(`Found ${users.length} users in Supabase.`);

  if (users.length === 0) {
    console.log('No users to process.');
    return;
  }

  for (const user of users) {
    if (!user.email) continue;
    console.log(`\nProcessing: ${user.email} (${user.role})...`);
    try {
      // 1. Ensure user exists in Supabase Auth
      const { error: createError } = await supabase.auth.admin.createUser({
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

      // 2. Generate and send password reset email via Supabase
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(user.email);
      if (resetError) {
        console.error(`  ❌ Failed to send reset email to ${user.email}:`, resetError.message);
      } else {
        console.log(`  ✅ Password reset email successfully triggered for ${user.email}`);
      }
    } catch (err: any) {
      console.error(`  ❌ Unexpected error for ${user.email}:`, err.message);
    }
  }

  console.log('\n================================================================');
  console.log('✨ All reset emails processed.');
  console.log('================================================================');
}

main().catch(console.error);
