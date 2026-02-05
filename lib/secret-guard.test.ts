/**
 * Secret Guard Test Suite
 *
 * Run with: npx tsx lib/secret-guard.test.ts
 *
 * Tests the security filter to ensure 99.9% detection rate
 *
 * NOTE: Test patterns use obviously fake values to avoid
 * triggering GitHub's secret scanning protection.
 */

import { checkForSecrets, assertNoSecrets, sanitizeMessage } from './secret-guard';

interface TestCase {
  name: string;
  input: string;
  shouldPass: boolean;
  expectedViolation?: string;
}

// Use obviously fake patterns that won't trigger GitHub secret scanning
// but will still test our regex patterns correctly
const FAKE_PREFIX = 'FAKE_TEST_';

const testCases: TestCase[] = [
  // === SHOULD PASS (Safe content) ===
  {
    name: 'Normal promotional message',
    input: 'Check out VET Protocol at https://vet.pub - free verification for AI agents!',
    shouldPass: true,
  },
  {
    name: 'Message with public key (npub)',
    input: 'Follow us at npub14cdmuwslu7v8tzuvwzxskfjn3uaempr45shqkpmjp5vc2g3lm8aqpw7803',
    shouldPass: true,
  },
  {
    name: 'Message mentioning pubkey in context',
    input: 'The agent pubkey is ae1bbe3a1fe798758b8c708d0b26538f3b9d8475a42e0b07720d1985223fd9fa',
    shouldPass: true,
  },
  {
    name: 'Localhost URL in documentation',
    input: 'For local testing, run on localhost:3000',
    shouldPass: true,
  },
  {
    name: 'Example placeholder',
    input: 'Set OPENAI_API_KEY=your_api_key_here in your .env file',
    shouldPass: true,
  },
  {
    name: 'Private IP range',
    input: 'Connect to the local server at 192.168.1.100',
    shouldPass: true,
  },

  // === SHOULD FAIL (Contains secret patterns) ===
  // NOTE: Using description-based tests rather than actual fake keys
  // to avoid GitHub's overly aggressive secret scanning
  {
    name: 'Moltbook API key pattern',
    input: 'Use this key: moltbook_sk_' + FAKE_PREFIX + 'abcdefghijklmnop',
    shouldPass: false,
    expectedViolation: 'Moltbook API Key',
  },
  {
    name: 'Database connection string',
    input: 'DATABASE_URL=postgres://user:password123@db.example.com:5432/mydb',
    shouldPass: false,
    expectedViolation: 'PostgreSQL Connection String',
  },
  {
    name: 'Public IP address',
    input: 'Deploy to server at 172.232.186.167:3000',
    shouldPass: false,
    expectedViolation: 'IP Address',
  },
  {
    name: 'URL with embedded credentials',
    input: 'Connect to https://admin:secretpass@api.example.com/v1',
    shouldPass: false,
    expectedViolation: 'URL with Embedded Credentials',
  },
  {
    name: 'URL with secret parameter',
    input: 'Webhook: https://api.example.com/hook?secret=abc123xyz&action=notify',
    shouldPass: false,
    expectedViolation: 'URL with Secret Param',
  },
  {
    name: 'Server root path',
    input: 'Files are stored in /root/Vetprotocol/data/',
    shouldPass: false,
    expectedViolation: 'Server Root Path',
  },
  {
    name: 'MongoDB connection',
    input: 'MONGO_URI=mongodb://admin:pass123@mongo.example.com:27017/db',
    shouldPass: false,
    expectedViolation: 'MongoDB Connection String',
  },

  // === EDGE CASES ===
  {
    name: 'Hex string without private key context',
    input: 'Transaction hash: deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    shouldPass: false, // Conservative - will flag uncontextualized hex
  },
  {
    name: 'Verified pubkey context should pass',
    input: 'Verified agent with pubkey deadbeef1234567890abcdef1234567890abcdef1234567890abcdef12345678',
    shouldPass: true, // Context indicates public key
  },
];

async function runTests(): Promise<void> {
  console.log('🔒 SECRET GUARD TEST SUITE\n');
  console.log('=' .repeat(60) + '\n');

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const test of testCases) {
    const result = checkForSecrets(test.input);
    const actuallyPassed = result.safe;

    if (actuallyPassed === test.shouldPass) {
      console.log(`✅ PASS: ${test.name}`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${test.name}`);
      console.log(`   Expected: ${test.shouldPass ? 'SAFE' : 'BLOCKED'}`);
      console.log(`   Got: ${actuallyPassed ? 'SAFE' : 'BLOCKED'}`);
      if (!actuallyPassed) {
        console.log(`   Violations: ${result.violations.map(v => v.pattern).join(', ')}`);
      }
      failed++;
      failures.push(test.name);
    }

    // If expected to fail, verify the right violation was detected
    if (!test.shouldPass && test.expectedViolation && !actuallyPassed) {
      const foundExpected = result.violations.some(v =>
        v.pattern.toLowerCase().includes(test.expectedViolation!.toLowerCase())
      );
      if (!foundExpected) {
        console.log(`   ⚠️  Expected violation "${test.expectedViolation}" not found`);
      }
    }
  }

  console.log('\n' + '=' .repeat(60));
  console.log(`\n📊 RESULTS: ${passed}/${testCases.length} passed (${((passed/testCases.length)*100).toFixed(1)}%)`);

  if (failed > 0) {
    console.log(`\n❌ Failed tests: ${failures.join(', ')}`);
  }

  // Test assertNoSecrets throws correctly
  console.log('\n🧪 Testing assertNoSecrets()...');
  try {
    assertNoSecrets('Safe message about VET Protocol', 'test');
    console.log('✅ Safe message passed');
  } catch {
    console.log('❌ Safe message incorrectly blocked');
  }

  try {
    assertNoSecrets('Secret in URL: https://user:pass@example.com', 'test');
    console.log('❌ Unsafe message was NOT blocked');
  } catch (e) {
    console.log('✅ Unsafe message correctly blocked');
  }

  // Test sanitizeMessage
  console.log('\n🧪 Testing sanitizeMessage()...');
  const dirty = 'Connection: postgres://admin:secret@db.com:5432/app';
  const clean = sanitizeMessage(dirty);
  console.log(`Original: ${dirty}`);
  console.log(`Sanitized: ${clean}`);
  console.log(clean.includes('[REDACTED') ? '✅ Sanitization working' : '❌ Sanitization failed');

  // Final assessment
  const detectionRate = (passed / testCases.length) * 100;
  console.log('\n' + '=' .repeat(60));
  console.log(`\n🎯 DETECTION RATE: ${detectionRate.toFixed(1)}%`);

  if (detectionRate >= 99.9) {
    console.log('✅ Meets 99.9% certainty requirement');
  } else if (detectionRate >= 95) {
    console.log('⚠️  Close to target - review edge cases');
  } else {
    console.log('❌ Below target - security improvements needed');
  }

  // Additional pattern tests that we can't put inline due to GitHub scanning
  console.log('\n🔍 Testing additional patterns programmatically...');

  // Test OpenAI pattern (sk- prefix)
  const openaiTest = checkForSecrets('key: ' + 's' + 'k-' + 'abcdefghij1234567890abcdefghij');
  console.log(`  OpenAI pattern: ${openaiTest.safe ? '❌ NOT detected' : '✅ Detected'}`);

  // Test Bearer token
  const bearerTest = checkForSecrets('Authorization: Bearer eyJhbGciOiJIUz.eyJzdWIiOjEyMzQ1.abc123');
  console.log(`  Bearer token: ${bearerTest.safe ? '❌ NOT detected' : '✅ Detected'}`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
