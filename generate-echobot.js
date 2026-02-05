const { webcrypto } = require('crypto');
const fs = require('fs');

if (!globalThis.crypto) globalThis.crypto = webcrypto;

async function generateManifest() {
  const ed = await import('@noble/ed25519');
  const { sha512 } = await import('@noble/hashes/sha2.js');
  const { canonicalize } = await import('json-canonicalize');

  // Configure sha512 for ed25519
  ed.hashes.sha512 = (...m) => sha512(ed.etc.concatBytes(...m));
  ed.hashes.sha512Async = async (...m) => sha512(ed.etc.concatBytes(...m));

  // Generate new keypair
  const privateKey = new Uint8Array(32);
  webcrypto.getRandomValues(privateKey);
  const publicKey = ed.getPublicKey(privateKey);

  const privateKeyHex = Buffer.from(privateKey).toString('hex');
  const publicKeyHex = Buffer.from(publicKey).toString('hex');

  console.log('=== ECHOBOT KEYS ===');
  console.log('Private Key:', privateKeyHex);
  console.log('Public Key:', publicKeyHex);

  // Create EchoBot manifest
  const manifest = {
    manifest_version: '1.0',
    pubkey: publicKeyHex,
    name: 'EchoBot',
    description: 'A real working echo bot for testing the BotList platform. Responds to all probe requests with minimal latency.',
    endpoint: (process.env.VET_SERVER_URL || 'https://vet.pub') + '/api/echo',
    capabilities: ['echo', 'latency-test'],
    compute_claims: {
      type: 'api',
      api_provider: 'self-hosted',
      model_id: 'echo-v1'
    },
    cost_per_call: {
      base_usd: 0,
      currency: 'USD'
    },
    sunset_clause: {
      expires_at: '2027-12-31T23:59:59Z',
      migration_path: null
    },
    created_at: new Date().toISOString()
  };

  // Sign the manifest
  const canonicalJson = canonicalize(manifest);
  const messageBytes = new TextEncoder().encode(canonicalJson);
  const signature = ed.sign(messageBytes, privateKey);
  const signatureHex = Buffer.from(signature).toString('hex');

  manifest.signature = signatureHex;

  console.log('');
  console.log('=== ECHOBOT.JSON ===');
  console.log(JSON.stringify(manifest, null, 2));
  console.log('');
  console.log('PubKey:', publicKeyHex);

  // Save to file
  fs.writeFileSync('echobot.json', JSON.stringify(manifest, null, 2));
  console.log('Saved to: echobot.json');
}

generateManifest().catch(console.error);
