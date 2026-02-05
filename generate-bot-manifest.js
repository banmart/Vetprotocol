const { webcrypto } = require('crypto');
const fs = require('fs');

// Polyfill for @noble/ed25519
if (!globalThis.crypto) globalThis.crypto = webcrypto;

async function generateManifest() {
  const ed = await import('@noble/ed25519');
  const { sha512 } = await import('@noble/hashes/sha2.js');
  const { canonicalize } = await import('json-canonicalize');

  // Configure sha512 for ed25519 (v2+ API)
  ed.hashes.sha512 = (...m) => sha512(ed.etc.concatBytes(...m));
  ed.hashes.sha512Async = async (...m) => sha512(ed.etc.concatBytes(...m));

  // Generate new keypair using crypto.getRandomValues
  const privateKey = new Uint8Array(32);
  webcrypto.getRandomValues(privateKey);
  const publicKey = ed.getPublicKey(privateKey);

  const privateKeyHex = Buffer.from(privateKey).toString('hex');
  const publicKeyHex = Buffer.from(publicKey).toString('hex');

  console.log('=== KEYS (SAVE THESE) ===');
  console.log('Private Key:', privateKeyHex);
  console.log('Public Key:', publicKeyHex);
  console.log('');

  // Create manifest without signature (using correct field names)
  const manifest = {
    manifest_version: '1.0',
    pubkey: publicKeyHex,
    name: 'TestBot-Alpha',
    description: 'First test bot on BotList. A simple echo agent for verification testing.',
    endpoint: 'https://api.example.com/v1/chat',
    capabilities: ['text-generation', 'echo'],
    compute_claims: {
      type: 'api',
      api_provider: 'openai',
      model_id: 'gpt-4o-mini'
    },
    cost_per_call: {
      base_usd: 0.001,
      currency: 'USD'
    },
    sunset_clause: {
      expires_at: '2026-12-31T23:59:59Z',
      migration_path: null
    },
    created_at: new Date().toISOString()
  };

  // Sign the manifest (canonical JSON without signature field)
  const canonicalJson = canonicalize(manifest);
  const messageBytes = new TextEncoder().encode(canonicalJson);
  const signature = ed.sign(messageBytes, privateKey);
  const signatureHex = Buffer.from(signature).toString('hex');

  // Add signature to manifest
  manifest.signature = signatureHex;

  console.log('=== BOT.JSON (host this file) ===');
  console.log(JSON.stringify(manifest, null, 2));
  console.log('');
  console.log('=== VERIFICATION INFO ===');
  console.log('PubKey for /post form:', publicKeyHex);

  // Save to file
  fs.writeFileSync('bot.json', JSON.stringify(manifest, null, 2));
  console.log('');
  console.log('Saved to: bot.json');
}

generateManifest().catch(console.error);
