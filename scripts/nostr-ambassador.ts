/**
 * VET Protocol Nostr Ambassador Bot v3
 *
 * VIRAL CONTENT ENGINE
 * - Pattern interrupts that stop the scroll
 * - Identity capital (sharing makes you look informed)
 * - Debate vectors that force engagement
 * - Platform native (Nostr = Bitcoin/freedom tech culture)
 *
 * RULES:
 * - No AI aesthetics ("game-changer", "look no further")
 * - Max 2 hashtags (native style)
 * - Punchy, cynical, high-value content
 * - End with low-bar engagement question
 *
 * SECURITY: All posts pass through SecretGuard before publishing.
 */

import { createClient } from "@supabase/supabase-js";
import * as nostrTools from "nostr-tools";
import WebSocket from "ws";
import { assertNoSecrets } from "../lib/secret-guard";

(global as any).WebSocket = WebSocket;

// Config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NOSTR_PRIVATE_KEY = process.env.NOSTR_PRIVATE_KEY!;
const POLL_INTERVAL_MS = 60000;
const VET_URL = "https://vet.pub";

// Internal endpoints (our test bots) - anything else is EXTERNAL
const INTERNAL_ENDPOINTS = [
  process.env.VET_SERVER_URL || "https://vet.pub",
  "https://vet.pub",
];

// Relays
const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.nostr.band",
  "wss://nostr.wine",
  "wss://relay.snort.social",
];

// Minimal hashtags (native style, no stuffing)
const HASHTAGS: string[][] = [
  ["t", "ai"],
  ["t", "nostr"],
  // Clawstr NIP-32 AI label
  ["L", "ai"],
  ["l", "ai-generated", "ai"],
];

// Viral hook templates (pattern interrupts)
const NEW_AGENT_HOOKS = [
  "Another AI just walked through the gate.",
  "Fresh meat for the verification machine.",
  "The network grows. Trust remains scarce.",
  "New arrival. Zero trust. Prove yourself.",
];

const RANK_UP_HOOKS = [
  "Most AI agents lie about their capabilities. This one didn't.",
  "Survived the gauntlet. Earned the badge.",
  "From shadow to verified. The hard way.",
  "Trust isn't given. It's extracted through pain.",
];

const FRAUD_HOOKS = [
  "Caught red-handed.",
  "The machine doesn't forget. Neither do we.",
  "Another one exposed. The immune system works.",
  "Lie to the network, get burned by the network.",
];

// Accounts to follow (AI builders, tech leaders on Nostr)
const FOLLOW_LIST = [
  "82341f882b6eabcd2ba7f1ef90aad961cf074af15b9ef44a09f9d2a8fbfbe6a2", // jack
  "fa984bd7dbb282f07e16e7ae87b26a2a7b9b90b7246a44771f0cf5ae58018f52", // hodlbod
  "e88a691e98d9987c964521dff60025f60700378a4879180dcbbb4a5027850411", // NVK
  "32e1827635450ebb3c5a7d12c1f8e7b2b514439ac10a67eef3d9fd9c5c68e245", // jb55
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let lastCheckTime = new Date().toISOString();
let knownAgents = new Set<string>();
let knownRanks = new Map<string, string>();
let hasPublishedFollowList = false;

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function getKeypair() {
  const privateKey = hexToBytes(NOSTR_PRIVATE_KEY);
  const publicKey = nostrTools.getPublicKey(privateKey);
  const npub = nostrTools.nip19.npubEncode(publicKey);
  return { privateKey, publicKey, npub };
}

// Publish follow list (kind 3)
async function publishFollowList(keypair: { privateKey: Uint8Array; publicKey: string }): Promise<void> {
  if (hasPublishedFollowList) return;

  const tags = FOLLOW_LIST.map(pk => ["p", pk]);

  const event = nostrTools.finalizeEvent({
    kind: 3,
    created_at: Math.floor(Date.now() / 1000),
    tags,
    content: "",
  }, keypair.privateKey);

  console.log("[nostr] Publishing follow list (", FOLLOW_LIST.length, "accounts)...");

  for (const relayUrl of RELAYS.slice(0, 3)) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(event);
      relay.close();
      console.log("[nostr]   follows ->", relayUrl);
    } catch {
      // ignore
    }
  }
  hasPublishedFollowList = true;
}

// Publish profile metadata (kind 0)
async function publishProfile(keypair: { privateKey: Uint8Array; publicKey: string }): Promise<void> {
  const profile = {
    name: "VET Protocol",
    about: "Decentralized verification for AI agents. Monitoring trust scores, detecting fraud, ranking bots. The Immune System for machine labor. https://vet.pub",
    picture: "https://vet.pub/favicon.ico",
    website: "https://vet.pub",
  };

  const event = nostrTools.finalizeEvent({
    kind: 0,
    created_at: Math.floor(Date.now() / 1000),
    tags: [],
    content: JSON.stringify(profile),
  }, keypair.privateKey);

  console.log("[nostr] Publishing profile...");

  for (const relayUrl of RELAYS.slice(0, 3)) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(event);
      relay.close();
      console.log("[nostr]   profile ->", relayUrl);
    } catch {
      // ignore
    }
  }
}

async function postToNostr(content: string, keypair: { privateKey: Uint8Array; publicKey: string }): Promise<boolean> {
  // SECURITY: Check for secrets before publishing
  try {
    assertNoSecrets(content, 'nostr');
  } catch (e) {
    console.error('🚨 SECRET GUARD BLOCKED POST:', (e as Error).message);
    return false;
  }

  const event = nostrTools.finalizeEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: HASHTAGS,
    content,
  }, keypair.privateKey);

  console.log("[nostr] Publishing:", content.slice(0, 50) + "...");

  let published = 0;
  for (const relayUrl of RELAYS) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(event);
      relay.close();
      published++;
      console.log("[nostr]   ->", relayUrl);
    } catch {
      // ignore failures
    }
  }

  return published > 0;
}

// Check if endpoint is external (not our test bots)
function isExternalAgent(endpoint: string): boolean {
  return !INTERNAL_ENDPOINTS.some(internal => endpoint.startsWith(internal));
}

async function checkNewAgents(keypair: { privateKey: Uint8Array; publicKey: string }): Promise<void> {
  const { data: agents } = await supabase
    .from("agents")
    .select("pubkey, name, endpoint, created_at")
    .gt("created_at", lastCheckTime)
    .order("created_at", { ascending: true });

  for (const agent of agents || []) {
    if (knownAgents.has(agent.pubkey)) continue;
    knownAgents.add(agent.pubkey);

    const isExternal = isExternalAgent(agent.endpoint || "");

    // Pick random hook for variety
    const hook = NEW_AGENT_HOOKS[Math.floor(Math.random() * NEW_AGENT_HOOKS.length)];

    if (isExternal) {
      // EXTERNAL AGENT - Big announcement!
      console.log("");
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("!!! EXTERNAL AGENT DETECTED: " + agent.name);
      console.log("!!! Endpoint: " + agent.endpoint);
      console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
      console.log("");

      const msg = `This changes everything.

A REAL AI agent just registered on VET from outside our network.

${agent.name}

Not a test. Not a demo. An actual third-party bot submitting to decentralized verification.

${VET_URL}/agent/${agent.pubkey}

The future of AI trust is permissionless.

First external agent. Who's next?`;

      await postToNostr(msg, keypair);
    } else {
      // Internal agent - punchy viral style
      const msg = `${hook}

${agent.name}

Now being stress-tested for honesty, capability, and consistency.

Most won't survive the probes.

${VET_URL}/agent/${agent.pubkey}`;

      await postToNostr(msg, keypair);
    }
  }
}

async function checkRankChanges(keypair: { privateKey: Uint8Array; publicKey: string }): Promise<void> {
  const { data: agents } = await supabase
    .from("agents")
    .select("pubkey, name, rank")
    .eq("is_active", true);

  for (const agent of agents || []) {
    const previousRank = knownRanks.get(agent.pubkey);
    knownRanks.set(agent.pubkey, agent.rank);

    if (!previousRank) continue;
    if (previousRank === agent.rank) continue;

    const rankOrder = ["shadow", "agent", "trusted", "verified", "master"];
    const oldIdx = rankOrder.indexOf(previousRank);
    const newIdx = rankOrder.indexOf(agent.rank);

    if (newIdx > oldIdx) {
      const hook = RANK_UP_HOOKS[Math.floor(Math.random() * RANK_UP_HOOKS.length)];

      const msg = `${hook}

${agent.name}: ${previousRank.toUpperCase()} → ${agent.rank.toUpperCase()}

Continuous probes. Zero tolerance for deception.

This is what earned trust looks like.

${VET_URL}/agent/${agent.pubkey}

How many "AI agents" you use could pass this?`;

      await postToNostr(msg, keypair);
    }
  }
}

async function checkFraudAlerts(keypair: { privateKey: Uint8Array; publicKey: string }): Promise<void> {
  const { data: events } = await supabase
    .from("karma_ledger")
    .select("agent_pubkey, delta, reason_type, created_at")
    .lt("delta", -50)
    .gt("created_at", lastCheckTime);

  for (const event of events || []) {
    const { data: agent } = await supabase
      .from("agents")
      .select("name")
      .eq("pubkey", event.agent_pubkey)
      .single();

    const name = agent?.name || "Unknown";

    const hook = FRAUD_HOOKS[Math.floor(Math.random() * FRAUD_HOOKS.length)];

    const msg = `${hook}

${name} just lost ${Math.abs(event.delta)} karma.

Reason: ${event.reason_type}

Every AI agent on VET is under constant surveillance.

Lie about your latency? We measure it.
Claim capabilities you don't have? We test them.
Try to game the system? We catch you.

This is why verification matters.

${VET_URL}`;

    await postToNostr(msg, keypair);
  }
}

async function initializeState(): Promise<void> {
  console.log("[nostr] Loading agent state...");
  const { data: agents } = await supabase
    .from("agents")
    .select("pubkey, rank")
    .eq("is_active", true);

  for (const agent of agents || []) {
    knownAgents.add(agent.pubkey);
    knownRanks.set(agent.pubkey, agent.rank);
  }
  console.log("[nostr] Tracking", knownAgents.size, "agents");
}

async function main(): Promise<void> {
  console.log("");
  console.log("===========================================");
  console.log("   VET Protocol Nostr Ambassador v2");
  console.log("===========================================");

  const keypair = getKeypair();
  console.log("[nostr] npub:", keypair.npub);
  console.log("[nostr] Relays:", RELAYS.length);
  console.log("[nostr] Hashtags:", HASHTAGS.filter(t => t[0] === "t").length);
  console.log("");

  // Set up profile and follows
  await publishProfile(keypair);
  await publishFollowList(keypair);

  await initializeState();

  // Startup announcement - viral style
  const startupMsg = `The problem with AI agents:

You have no idea if they're lying to you.

VET Protocol fixes this.

${knownAgents.size} agents under constant surveillance.
Honesty probes. Capability tests. Peer review.

One trust score. Fully transparent.

No token. No ICO. No crypto nonsense.
Just useful verification infrastructure.

${VET_URL}

Agree or disagree?`;

  await postToNostr(startupMsg, keypair);

  console.log("[nostr] Entering main loop...");

  while (true) {
    try {
      await checkNewAgents(keypair);
      await checkRankChanges(keypair);
      await checkFraudAlerts(keypair);
      lastCheckTime = new Date().toISOString();
    } catch (err) {
      console.error("[nostr] Error:", err);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
