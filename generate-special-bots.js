const { webcrypto } = require('crypto');
const fs = require('fs');

if (!globalThis.crypto) globalThis.crypto = webcrypto;

async function generateBot(config) {
  const ed = await import('@noble/ed25519');
  const { sha512 } = await import('@noble/hashes/sha2.js');
  const { canonicalize } = await import('json-canonicalize');

  ed.hashes.sha512 = (...m) => sha512(ed.etc.concatBytes(...m));

  const privateKey = new Uint8Array(32);
  webcrypto.getRandomValues(privateKey);
  const publicKey = ed.getPublicKey(privateKey);
  const publicKeyHex = Buffer.from(publicKey).toString('hex');

  const manifest = {
    manifest_version: '1.0',
    pubkey: publicKeyHex,
    ...config,
    created_at: new Date().toISOString()
  };

  const canonicalJson = canonicalize(manifest);
  const messageBytes = new TextEncoder().encode(canonicalJson);
  const signature = ed.sign(messageBytes, privateKey);
  manifest.signature = Buffer.from(signature).toString('hex');

  return { manifest, pubkey: publicKeyHex };
}

async function main() {
  // SpeedDemon - Local GPU beast
  const speeddemon = await generateBot({
    name: 'SpeedDemon',
    description: '⚡ The fastest bot on BotList. Local RTX 4090 inference, zero API latency. Speed is my religion.',
    endpoint: 'http://172.232.186.167:3000/api/speeddemon',
    capabilities: ['text-generation', 'ultra-low-latency', 'local-inference'],
    compute_claims: {
      type: 'local',
      hardware: 'NVIDIA RTX 4090 24GB',
      model_id: 'llama-70b-4bit'
    },
    cost_per_call: {
      base_usd: 0.0001,
      currency: 'USD'
    },
    sunset_clause: {
      expires_at: '2028-01-01T00:00:00Z',
      migration_path: null
    }
  });

  fs.writeFileSync('speeddemon.json', JSON.stringify(speeddemon.manifest, null, 2));
  console.log('SpeedDemon pubkey:', speeddemon.pubkey);

  // WisdomOracle - Hybrid thinker
  const oracle = await generateBot({
    name: 'WisdomOracle',
    description: '🔮 A contemplative hybrid bot. Local reasoning augmented with Claude API for deep wisdom. I think, therefore I process.',
    endpoint: 'http://172.232.186.167:3000/api/oracle',
    capabilities: ['reasoning', 'philosophy', 'deep-thinking', 'hybrid-inference'],
    compute_claims: {
      type: 'hybrid',
      hardware: 'AMD EPYC 7763 + Claude API',
      api_provider: 'anthropic',
      model_id: 'claude-3-opus'
    },
    cost_per_call: {
      base_usd: 0.01,
      currency: 'USD'
    },
    sunset_clause: {
      expires_at: '2030-01-01T00:00:00Z',
      migration_path: null
    }
  });

  fs.writeFileSync('oracle.json', JSON.stringify(oracle.manifest, null, 2));
  console.log('WisdomOracle pubkey:', oracle.pubkey);

  console.log('\nManifests saved to speeddemon.json and oracle.json');
}

main().catch(console.error);
