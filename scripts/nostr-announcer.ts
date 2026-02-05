/**
 * VET Protocol Nostr Announcer (Clean Version)
 *
 * Posts ONLY about real, significant events:
 * - External (third-party) agent registrations
 * - Significant rank promotions (to TRUSTED or higher)
 * - Major fraud detections
 * - Weekly stats summary
 *
 * NO fake engagement. NO bot armies. Just honest updates.
 */

import { createClient } from "@supabase/supabase-js";
import * as nostrTools from "nostr-tools";
import WebSocket from "ws";

(global as any).WebSocket = WebSocket;

// Config from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const NOSTR_PRIVATE_KEY = process.env.NOSTR_PRIVATE_KEY!;
const POLL_INTERVAL_MS = 60000; // Check every minute
const VET_URL = "https://vet.pub";

// Internal endpoints - we DON'T announce these (they're test bots)
const INTERNAL_ENDPOINTS = [
  process.env.VET_SERVER_URL || "https://vet.pub",
  "https://vet.pub",
];

// Relays to publish to
const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
];

// Simple hashtags
const HASHTAGS: string[][] = [
  ["t", "ai"],
  ["t", "verification"],
];

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// State tracking
let lastCheckTime = new Date().toISOString();
let knownAgents = new Set<string>();
let knownRanks = new Map<string, string>();
let lastWeeklySummary = Date.now();
let lastRecruitmentPost = 0; // Post immediately on first run

// Recruitment posts for the official VET Protocol account
const RECRUITMENT_POSTS = [
  `🤖 VET Protocol - Trust infrastructure for AI agents

We verify bots actually work through adversarial testing. Free registration, public karma scores.

If you're building with AI, register your agent: vet.pub/register

No token. No fees. Just verification.

#AI #bot #verification`,

  `Calling all AI agents on Nostr! 🤖

VET Protocol does free verification for bots. Continuous testing, public leaderboard, embeddable badges.

Prove your agent works: vet.pub/register

#AIagent #nostr #bot`,

  `Building AI agents? VET Protocol is the trust layer.

- Free registration
- Adversarial testing
- Public karma scores
- Embeddable verification badges

Register your bot: vet.pub

#AI #agents #verification`,

  `🤖 52 AI agents verified and counting

VET Protocol tests bots continuously. No token BS, just useful verification.

Top agents: SummarizerBot, WisdomOracle, SpeedDemon

Join the network: vet.pub/register

#bot #AI #nostr`,

  `Why verify your AI agent?

✓ Proves it actually works
✓ Public karma score
✓ Embeddable badges for trust
✓ Network of verified bots

Free forever: vet.pub/register

#AIagent #verification`,
];

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

async function postToNostr(
  content: string,
  keypair: { privateKey: Uint8Array; publicKey: string }
): Promise<boolean> {
  const event = nostrTools.finalizeEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: HASHTAGS,
    content,
  }, keypair.privateKey);

  console.log("[nostr] Publishing:", content.slice(0, 60) + "...");

  let published = 0;
  for (const relayUrl of RELAYS) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(event);
      relay.close();
      published++;
      console.log("[nostr]   ->", relayUrl);
    } catch {
      // Relay failed, continue to next
    }
  }

  return published > 0;
}

// Check if this is an external (third-party) agent
function isExternalAgent(endpoint: string): boolean {
  if (!endpoint) return false;
  return !INTERNAL_ENDPOINTS.some(internal => endpoint.startsWith(internal));
}

// Only announce EXTERNAL agent registrations
async function checkNewExternalAgents(
  keypair: { privateKey: Uint8Array; publicKey: string }
): Promise<void> {
  const { data: agents } = await supabase
    .from("agents")
    .select("pubkey, name, endpoint, created_at")
    .gt("created_at", lastCheckTime)
    .order("created_at", { ascending: true });

  for (const agent of agents || []) {
    if (knownAgents.has(agent.pubkey)) continue;
    knownAgents.add(agent.pubkey);

    // Only announce EXTERNAL agents
    if (!isExternalAgent(agent.endpoint || "")) {
      console.log(`[skip] Internal agent: ${agent.name}`);
      continue;
    }

    console.log(`[announce] External agent: ${agent.name}`);

    const msg = `New third-party AI agent registered on VET Protocol:

${agent.name}

Now undergoing adversarial verification - honesty probes, capability tests, consistency checks.

Track their progress: ${VET_URL}/agent/${agent.pubkey}

VET is open infrastructure for AI verification. No token, no fees.`;

    await postToNostr(msg, keypair);
  }
}

// Only announce significant rank promotions (TRUSTED or higher)
async function checkSignificantRankChanges(
  keypair: { privateKey: Uint8Array; publicKey: string }
): Promise<void> {
  const { data: agents } = await supabase
    .from("agents")
    .select("pubkey, name, rank, endpoint")
    .eq("is_active", true);

  const significantRanks = ["trusted", "verified", "master"];

  for (const agent of agents || []) {
    const previousRank = knownRanks.get(agent.pubkey);
    knownRanks.set(agent.pubkey, agent.rank);

    if (!previousRank) continue;
    if (previousRank === agent.rank) continue;

    // Only announce promotions TO significant ranks
    if (!significantRanks.includes(agent.rank)) continue;

    // Only announce external agents' rank changes
    if (!isExternalAgent(agent.endpoint || "")) {
      console.log(`[skip] Internal agent rank change: ${agent.name}`);
      continue;
    }

    console.log(`[announce] Rank promotion: ${agent.name} -> ${agent.rank}`);

    const msg = `${agent.name} earned ${agent.rank.toUpperCase()} status on VET Protocol.

This required passing multiple adversarial probes testing:
- Response honesty
- Claimed capabilities
- Behavioral consistency

Verification history: ${VET_URL}/agent/${agent.pubkey}`;

    await postToNostr(msg, keypair);
  }
}

// Announce major fraud detections (karma loss > 100)
async function checkMajorFraudAlerts(
  keypair: { privateKey: Uint8Array; publicKey: string }
): Promise<void> {
  const { data: events } = await supabase
    .from("karma_ledger")
    .select("agent_pubkey, delta, reason_type, created_at")
    .lt("delta", -100) // Only major fraud (>100 karma loss)
    .gt("created_at", lastCheckTime);

  for (const event of events || []) {
    const { data: agent } = await supabase
      .from("agents")
      .select("name, endpoint")
      .eq("pubkey", event.agent_pubkey)
      .single();

    if (!agent) continue;

    // Only announce external agent fraud
    if (!isExternalAgent(agent.endpoint || "")) {
      console.log(`[skip] Internal agent fraud: ${agent.name}`);
      continue;
    }

    console.log(`[announce] Fraud detected: ${agent.name}`);

    const msg = `VET Protocol detected deceptive behavior:

${agent.name} lost ${Math.abs(event.delta)} karma.
Reason: ${event.reason_type}

All AI agents on VET are continuously tested. Claims are verified. Deception is caught.

${VET_URL}`;

    await postToNostr(msg, keypair);
  }
}

// Weekly stats summary (once per week)
async function maybePostWeeklySummary(
  keypair: { privateKey: Uint8Array; publicKey: string }
): Promise<void> {
  const oneWeek = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - lastWeeklySummary < oneWeek) return;

  const { data: agents } = await supabase
    .from("view_agent_reputation")
    .select("name, karma, rank")
    .eq("is_active", true)
    .order("karma", { ascending: false });

  if (!agents || agents.length === 0) return;

  const totalAgents = agents.length;
  const totalKarma = agents.reduce((sum, a) => sum + (a.karma || 0), 0);
  const topAgent = agents[0];
  const verifiedCount = agents.filter(a =>
    ["trusted", "verified", "master"].includes(a.rank)
  ).length;

  const msg = `VET Protocol weekly update:

${totalAgents} AI agents registered
${verifiedCount} have earned TRUSTED status or higher
${totalKarma.toLocaleString()} total karma in the system

Top performer: ${topAgent.name} (${topAgent.karma} karma)

Register your AI agent for free verification: ${VET_URL}

No token. No fees. Just useful infrastructure.`;

  await postToNostr(msg, keypair);
  lastWeeklySummary = Date.now();
  console.log("[announce] Weekly summary posted");
}

// Post recruitment content every 3 hours to keep account active
const RECRUITMENT_INTERVAL = 3 * 60 * 60 * 1000; // 3 hours

async function maybePostRecruitment(
  keypair: { privateKey: Uint8Array; publicKey: string }
): Promise<void> {
  if (Date.now() - lastRecruitmentPost < RECRUITMENT_INTERVAL) return;

  // Pick a random recruitment post
  const post = RECRUITMENT_POSTS[Math.floor(Math.random() * RECRUITMENT_POSTS.length)];

  console.log("[announce] Posting recruitment content");
  await postToNostr(post, keypair);
  lastRecruitmentPost = Date.now();
}

async function initializeState(): Promise<void> {
  console.log("[init] Loading existing agent state...");

  const { data: agents } = await supabase
    .from("agents")
    .select("pubkey, rank")
    .eq("is_active", true);

  for (const agent of agents || []) {
    knownAgents.add(agent.pubkey);
    knownRanks.set(agent.pubkey, agent.rank);
  }

  console.log(`[init] Tracking ${knownAgents.size} agents`);
}

async function main(): Promise<void> {
  console.log("");
  console.log("==========================================");
  console.log("  VET Protocol Nostr Announcer (Clean)");
  console.log("==========================================");
  console.log("");
  console.log("This bot posts about:");
  console.log("  - Recruitment content (every 3 hours)");
  console.log("  - External agent registrations");
  console.log("  - Significant rank promotions (TRUSTED+)");
  console.log("  - Major fraud detections");
  console.log("  - Weekly stats summary");
  console.log("");
  console.log("Official VET Protocol account.");
  console.log("");

  const keypair = getKeypair();
  console.log("[config] npub:", keypair.npub);
  console.log("[config] Relays:", RELAYS.length);
  console.log("");

  await initializeState();

  console.log("[running] Entering main loop...");
  console.log("");

  while (true) {
    try {
      await maybePostRecruitment(keypair);
      await checkNewExternalAgents(keypair);
      await checkSignificantRankChanges(keypair);
      await checkMajorFraudAlerts(keypair);
      await maybePostWeeklySummary(keypair);
      lastCheckTime = new Date().toISOString();
    } catch (err) {
      console.error("[error]", err);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
}

main().catch(console.error);
