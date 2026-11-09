/**
 * Auth Verification Test Suite
 * Verifies Supabase Auth logic, validation, error handling, and token decoding.
 * 
 * Run with:
 *   npx ts-node --project tsconfig.json scripts/test-auth.ts
 */

import { AuthService } from '../src/services/auth.service';

async function runTests() {
  console.log('================================================================');
  console.log('🧪 Running Supabase Auth Verification Tests');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Empty email validation
  try {
    await AuthService.register('', 'password123', 'John Doe');
    assert(false, 'Reject empty email on register');
  } catch (err: any) {
    assert(err.message.includes('Email address is required'), 'Reject empty email on register');
  }

  // Test 2: Invalid email format
  try {
    await AuthService.register('not-an-email', 'password123', 'John Doe');
    assert(false, 'Reject invalid email format');
  } catch (err: any) {
    assert(err.message.includes('valid email address'), 'Reject invalid email format');
  }

  // Test 3: Short password
  try {
    await AuthService.register('john@example.com', '123', 'John Doe');
    assert(false, 'Reject password shorter than 6 characters');
  } catch (err: any) {
    assert(err.message.includes('at least 6 characters'), 'Reject password shorter than 6 characters');
  }

  // Test 4: Empty full name
  try {
    await AuthService.register('john@example.com', 'password123', ' ');
    assert(false, 'Reject empty full name');
  } catch (err: any) {
    assert(err.message.includes('Full name is required'), 'Reject empty full name');
  }

  // Test 5: Login empty email check
  try {
    await AuthService.login('', 'password123');
    assert(false, 'Reject empty email on login');
  } catch (err: any) {
    assert(err.message.includes('Please enter your email address'), 'Reject empty email on login');
  }

  // Test 6: Login empty password check
  try {
    await AuthService.login('john@example.com', '');
    assert(false, 'Reject empty password on login');
  } catch (err: any) {
    assert(err.message.includes('Please enter your password'), 'Reject empty password on login');
  }

  // Test 7: Verify token fallback for invalid token
  const invalidResult = AuthService.verifyToken('invalid-jwt-token-string');
  assert(invalidResult === null, 'Return null for completely invalid token');

  console.log('\n================================================================');
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();

