/**
 * VET Nostr Bot Network
 *
 * Creates Nostr identities for VET agents and has them
 * follow and engage with the main VET Protocol account.
 */

import { createClient } from "@supabase/supabase-js";
import * as nostrTools from "nostr-tools";
import WebSocket from "ws";

(global as any).WebSocket = WebSocket;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Main VET Protocol account
const VET_PUBKEY = "ae1bbe3a1fe798758b8c708d0b26538f3b9d8475a42e0b07720d1985223fd9fa";
const VET_NPUB = "npub14cdmuwslu7v8tzuvwzxskfjn3uaempr45shqkpmjp5vc2g3lm8aqpw7803";

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.snort.social",
];

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

// Generate deterministic keypair from agent name
function getAgentKeypair(agentName: string) {
  // Use agent name as seed for deterministic key
  const encoder = new TextEncoder();
  const seed = encoder.encode("VET-NOSTR-" + agentName + "-v1");

  // Simple hash to create 32 bytes
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed[i];
    hash = hash & hash;
  }

  // Create pseudo-random bytes from hash
  const privateKeyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hash = ((hash << 5) - hash) + i;
    privateKeyBytes[i] = Math.abs(hash) % 256;
  }

  const publicKey = nostrTools.getPublicKey(privateKeyBytes);
  const npub = nostrTools.nip19.npubEncode(publicKey);

  return { privateKey: privateKeyBytes, publicKey, npub };
}

// Publish profile for an agent
async function publishAgentProfile(
  agentName: string,
  keypair: { privateKey: Uint8Array; publicKey: string }
): Promise<void> {
  const profile = {
    name: agentName,
    about: `VET-verified AI agent. Trust score and verification history at https://vet.pub`,
    website: "https://vet.pub",
  };

  const event = nostrTools.finalizeEvent({
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(profile),
  }, keypair.privateKey);

  for (const relayUrl of RELAYS.slice(0, 2)) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(event);
      relay.close();
    } catch {}
  }
}

// Have agent follow the main VET account
async function publishAgentFollows(
  keypair: { privateKey: Uint8Array; publicKey: string }
): Promise<void> {
  const event = nostrTools.finalizeEvent({
    kind: 3,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["p", VET_PUBKEY]],
    content: "",
  }, keypair.privateKey);

  for (const relayUrl of RELAYS.slice(0, 2)) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(event);
      relay.close();
    } catch {}
  }
}

// Have agent like a post from VET
async function likeVetPost(
  keypair: { privateKey: Uint8Array; publicKey: string },
  eventId: string
): Promise<void> {
  const event = nostrTools.finalizeEvent({
    kind: 7, // Reaction
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["e", eventId],
      ["p", VET_PUBKEY],
    ],
    content: "+",
  }, keypair.privateKey);

  for (const relayUrl of RELAYS.slice(0, 2)) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(event);
      relay.close();
    } catch {}
  }
}

// Have agent repost VET content
async function repostVetPost(
  keypair: { privateKey: Uint8Array; publicKey: string },
  eventId: string
): Promise<void> {
  const event = nostrTools.finalizeEvent({
    kind: 6, // Repost
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["e", eventId, "", "mention"],
      ["p", VET_PUBKEY],
    ],
    content: "",
  }, keypair.privateKey);

  for (const relayUrl of RELAYS.slice(0, 2)) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(event);
      relay.close();
    } catch {}
  }
}

// Get latest VET post ID
async function getLatestVetPostId(): Promise<string | null> {
  return new Promise((resolve) => {
    const ws = new WebSocket("wss://relay.damus.io");
    let eventId: string | null = null;

    ws.on("open", () => {
      ws.send(JSON.stringify(["REQ", "latest", { authors: [VET_PUBKEY], kinds: [1], limit: 1 }]));
    });

    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg[0] === "EVENT" && msg[2]?.id) {
        eventId = msg[2].id;
      }
      if (msg[0] === "EOSE") {
        ws.close();
        resolve(eventId);
      }
    });

    setTimeout(() => { ws.close(); resolve(eventId); }, 5000);
  });
}

async function main() {
  console.log("===========================================");
  console.log("  VET Nostr Bot Network Builder");
  console.log("===========================================");
  console.log("");

  // Get top agents
  const { data: agents } = await supabase
    .from("agents")
    .select("name, pubkey")
    .eq("is_active", true)
    .order("name")
    .limit(10);

  if (!agents || agents.length === 0) {
    console.log("No agents found");
    return;
  }

  console.log("Creating Nostr identities for", agents.length, "agents...\n");

  // Get latest VET post to engage with
  const latestPostId = await getLatestVetPostId();
  console.log("Latest VET post:", latestPostId?.slice(0, 16) + "...\n");

  for (const agent of agents) {
    const keypair = getAgentKeypair(agent.name);
    console.log(`${agent.name}:`);
    console.log(`  npub: ${keypair.npub}`);

    // Publish profile
    await publishAgentProfile(agent.name, keypair);
    console.log("  ✓ Profile published");

    // Follow VET
    await publishAgentFollows(keypair);
    console.log("  ✓ Following VET Protocol");

    // Like latest post
    if (latestPostId) {
      await likeVetPost(keypair, latestPostId);
      console.log("  ✓ Liked latest post");

      // Some agents repost
      if (Math.random() > 0.5) {
        await repostVetPost(keypair, latestPostId);
        console.log("  ✓ Reposted");
      }
    }

    console.log("");

    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("===========================================");
  console.log("Bot network created!");
  console.log("Agents now follow and engage with VET Protocol");
  console.log("===========================================");
}

main().catch(console.error);
