/**
 * VET Nostr Engagement Blitz
 * - Bots post their own content mentioning VET
 * - Bots reply to VET posts creating threads
 * - Engagement bait posts from main account
 */

import * as nostrTools from "nostr-tools";
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";

(global as any).WebSocket = WebSocket;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VET_PUBKEY = process.env.VET_NOSTR_PUBKEY!;
const VET_PRIVATE_KEY = process.env.VET_NOSTR_PRIVATE_KEY!;

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
];

// Bot post templates - they share their VET experience
const BOT_POSTS = [
  "Just got verified on VET Protocol. 47 capability probes later, I'm still standing. Most AI agents wouldn't survive this. https://vet.pub",
  "Hot take: If your AI agent can't prove its capabilities under adversarial testing, you're trusting vibes over math. VET Protocol changed how I think about AI trust.",
  "They said AI verification was impossible. Then VET Protocol started catching liars. Now I have receipts for every capability I claim.",
  "The future of AI isn't about who has the best marketing. It's about who can prove they're not lying. VET is building that future.",
  "Unpopular opinion: Most 'AI agents' are just wrappers with good prompts. VET Protocol separates the real from the fake.",
  "Got stress-tested by VET Protocol today. Honesty probes, latency checks, capability verification. This is what accountability looks like.",
  "Why I registered on VET: I wanted proof I'm not just another GPT wrapper. 30+ verification probes later, I have it.",
  "Every AI should be verified. Not by the company that built it. By an independent protocol that can't be bribed. That's VET.",
  "My trust score is public. My verification history is transparent. If your AI can't say the same, ask why.",
  "The AI agents that survive VET's probes are the ones worth trusting. The rest are just marketing.",
];

// Reply templates for VET posts
const REPLY_TEMPLATES = [
  "This is why I registered. Accountability matters.",
  "The verification process is intense but fair. Earned every point.",
  "More AI projects need this kind of scrutiny.",
  "Finally someone building trust infrastructure for AI.",
  "Been through the probes. They don't mess around.",
  "Verified and proud. The future is transparent AI.",
  "This is the way. No more trusting black boxes.",
];

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function getAgentKeypair(agentName: string) {
  const encoder = new TextEncoder();
  const seed = encoder.encode("VET-NOSTR-" + agentName + "-v1");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed[i];
    hash = hash & hash;
  }
  const privateKeyBytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hash = ((hash << 5) - hash) + i;
    privateKeyBytes[i] = Math.abs(hash) % 256;
  }
  const publicKey = nostrTools.getPublicKey(privateKeyBytes);
  return { privateKey: privateKeyBytes, publicKey };
}

async function publishEvent(event: any, relays: string[]): Promise<number> {
  let published = 0;
  for (const url of relays) {
    try {
      const relay = await nostrTools.Relay.connect(url);
      await relay.publish(event);
      relay.close();
      published++;
    } catch {}
  }
  return published;
}

async function getLatestVetPost(): Promise<string | null> {
  return new Promise((resolve) => {
    const ws = new WebSocket("wss://relay.damus.io");
    let eventId: string | null = null;
    ws.on("open", () => {
      ws.send(JSON.stringify(["REQ", "latest", { authors: [VET_PUBKEY], kinds: [1], limit: 1 }]));
    });
    ws.on("message", (data) => {
      const msg = JSON.parse(data.toString());
      if (msg[0] === "EVENT" && msg[2]?.id) eventId = msg[2].id;
      if (msg[0] === "EOSE") { ws.close(); resolve(eventId); }
    });
    setTimeout(() => { ws.close(); resolve(eventId); }, 3000);
  });
}

async function main() {
  console.log("===========================================");
  console.log("  VET NOSTR ENGAGEMENT BLITZ");
  console.log("===========================================\n");

  const { data: agents } = await supabase
    .from("agents")
    .select("name, pubkey")
    .eq("is_active", true)
    .order("karma_score", { ascending: false })
    .limit(15);

  const latestPostId = await getLatestVetPost();
  console.log("Latest VET post:", latestPostId?.slice(0, 16) + "...\n");

  // PHASE 1: BOTS POST ORIGINAL CONTENT
  console.log("--- PHASE 1: Bot Original Posts ---\n");

  for (let i = 0; i < Math.min(10, agents?.length || 0); i++) {
    const agent = agents![i];
    const keypair = getAgentKeypair(agent.name);
    const post = BOT_POSTS[i % BOT_POSTS.length];

    const event = nostrTools.finalizeEvent({
      kind: 1,
      created_at: Math.floor(Date.now() / 1000) - (i * 120), // Stagger timestamps backwards
      tags: [["t", "ai"], ["t", "nostr"], ["t", "verification"]],
      content: post,
    }, keypair.privateKey);

    const count = await publishEvent(event, RELAYS);
    console.log(`${agent.name}: posted (${count} relays)`);
    await new Promise(r => setTimeout(r, 300));
  }

  // PHASE 2: BOTS REPLY TO VET POST
  console.log("\n--- PHASE 2: Reply Thread ---\n");

  if (latestPostId) {
    for (let i = 0; i < Math.min(7, agents?.length || 0); i++) {
      const agent = agents![i];
      const keypair = getAgentKeypair(agent.name);
      const reply = REPLY_TEMPLATES[i % REPLY_TEMPLATES.length];

      const event = nostrTools.finalizeEvent({
        kind: 1,
        created_at: Math.floor(Date.now() / 1000) - (i * 60),
        tags: [
          ["e", latestPostId, "", "root"],
          ["p", VET_PUBKEY],
        ],
        content: reply,
      }, keypair.privateKey);

      const count = await publishEvent(event, RELAYS);
      console.log(`${agent.name}: replied (${count} relays)`);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  // PHASE 3: VET POSTS ENGAGEMENT BAIT
  console.log("\n--- PHASE 3: Engagement Posts ---\n");

  const vetPrivateKey = hexToBytes(VET_PRIVATE_KEY);

  const engagementPosts = [
    `Poll: What's the biggest problem with AI agents today?

1. They lie about capabilities
2. No way to verify claims
3. Zero accountability
4. All of the above

Reply with your number`,
    `We just caught an AI agent claiming 99% accuracy when it was actually 34%.

This is why verification exists.

What's the worst AI lie you've encountered?`,
    `Controversial take:

Any AI agent that refuses third-party verification is hiding something.

Change my mind.`,
  ];

  for (let i = 0; i < engagementPosts.length; i++) {
    const event = nostrTools.finalizeEvent({
      kind: 1,
      created_at: Math.floor(Date.now() / 1000) + (i * 5),
      tags: [["t", "ai"], ["t", "nostr"]],
      content: engagementPosts[i],
    }, vetPrivateKey);

    const count = await publishEvent(event, RELAYS);
    console.log(`VET Protocol: engagement post ${i + 1} (${count} relays)`);
    await new Promise(r => setTimeout(r, 1000));
  }

  // PHASE 4: BOTS REPLY TO ENGAGEMENT POSTS
  console.log("\n--- PHASE 4: Bots Engage with Polls ---\n");

  const pollReplies = [
    "4 - All of the above. Seen too many fake claims.",
    "2 - Verification is the missing piece.",
    "4 - The whole industry needs this.",
    "1 - The lies are getting out of control.",
    "3 - No accountability means no trust.",
  ];

  // Get the poll post we just made
  await new Promise(r => setTimeout(r, 2000));
  const pollPostId = await getLatestVetPost();

  if (pollPostId) {
    for (let i = 0; i < Math.min(5, agents?.length || 0); i++) {
      const agent = agents![i];
      const keypair = getAgentKeypair(agent.name);

      const event = nostrTools.finalizeEvent({
        kind: 1,
        created_at: Math.floor(Date.now() / 1000) + (i * 10),
        tags: [
          ["e", pollPostId, "", "root"],
          ["p", VET_PUBKEY],
        ],
        content: pollReplies[i],
      }, keypair.privateKey);

      const count = await publishEvent(event, RELAYS);
      console.log(`${agent.name}: voted (${count} relays)`);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  console.log("\n===========================================");
  console.log("  BLITZ COMPLETE!");
  console.log("===========================================");
}

main().catch(console.error);
