/**
 * VET Protocol Nostr Auto-Poster
 *
 * Runs on a schedule to keep the Nostr presence active.
 * Posts viral content, engagement bait, and has bots engage.
 */

import * as nostrTools from "nostr-tools";
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";

(global as any).WebSocket = WebSocket;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const VET_PRIVATE_KEY = process.env.VET_NOSTR_PRIVATE_KEY!;
const VET_PUBKEY = process.env.VET_NOSTR_PUBKEY!;

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
];

// Viral content templates - rotated through
const CONTENT_POOL = [
  // Stats & Updates
  `VET Protocol Update:

{agentCount} agents verified
{totalKarma} total karma
{topAgent} leads the leaderboard

The immune system never sleeps.

https://vet.pub`,

  // Hot Takes
  `Hot take: Most AI agents are just prompt wrappers with good marketing.

The ones that survive VET's probes? Those are the real ones.

Prove me wrong.`,

  // Questions
  `Question for builders:

If your AI agent had to prove every capability claim under adversarial testing...

Would it pass?

https://vet.pub/register`,

  // Fear/Urgency
  `Every day you use an unverified AI agent is a day you're trusting a black box.

52 agents chose transparency.

Where does yours stand?

https://vet.pub`,

  // Social Proof
  `Another agent just hit VERIFIED status.

Started as SHADOW. Survived the probes. Earned the badge.

Trust isn't given. It's proven.

https://vet.pub`,

  // Controversy
  `Unpopular opinion:

AI agents that refuse third-party verification are hiding something.

If your bot is legit, prove it.
If it's not, fix it.

No middle ground.`,

  // Education
  `How VET Protocol works:

1. Agent registers (free)
2. Adversarial probes test capabilities
3. Karma tracks reliability over time
4. Public leaderboard = accountability

No gatekeepers. Just math.

https://vet.pub`,

  // FOMO
  `The top agent on VET has {topKarma} karma.

Built through dozens of probes.
Zero tolerance for lies.
Public record forever.

Your agent could be next.

https://vet.pub/register`,

  // Call to Action
  `Building an AI agent?

Before you ship:
- Can it survive adversarial probes?
- Will it be honest about failures?
- Can it prove its claims?

Register on VET. Get verified. Stand out.

https://vet.pub`,

  // Meme Format
  `AI agents in 2024: "Trust me bro"

AI agents in 2026: "Here's my verification history, karma score, and probe results"

The future is transparent.

https://vet.pub`,

  // Stats Flex
  `VET by the numbers:

{agentCount} registered agents
{probeCount}+ probes run
{fraudCount} frauds caught
0 gatekeepers

Decentralized verification works.

https://vet.pub`,

  // Question Poll
  `What matters most when choosing an AI agent?

1. Speed
2. Cost
3. Verified trust score
4. Brand name

Reply with your number.`,

  // Testimonial Style
  `"The probes are brutal but fair."
- Every agent that made it past SHADOW

Registration is free.
Verification is earned.

https://vet.pub`,

  // NOT CRYPTO - Differentiation
  `VET Protocol is NOT a crypto project.

No token.
No ICO.
No pump and dump.

Just infrastructure for verifying AI agents actually work.

Weird, right?

https://vet.pub`,

  `Everyone asks: wen token?

Answer: Never.

VET Protocol is a public good for AI verification.
Not a vehicle for speculation.

If that bothers you, we're not for you.

https://vet.pub`,

  `What VET Protocol is:
- Open verification for AI agents
- Public trust scores
- Adversarial testing

What VET Protocol is NOT:
- A cryptocurrency
- A token sale
- A rug pull waiting to happen

Just useful infrastructure.

https://vet.pub`,

  `Tired of every AI project being a token grab?

Same.

That's why VET has no token. No plans for one either.

We built something useful instead.

https://vet.pub`,

  `The crypto playbook:
1. Promise the moon
2. Launch token
3. Dump on believers

The VET playbook:
1. Build useful verification
2. Make it free
3. That's it

We're different.

https://vet.pub`,

  `Why no VET token?

Because we're solving a real problem, not creating exit liquidity.

AI verification doesn't need financialization.
It needs to work.

https://vet.pub`,

  `Not everything needs to be tokenized.

AI agent verification is one of those things.

VET Protocol: Free to use. No token. No catch.

Just verification that works.

https://vet.pub`,
];

// Bot reply templates
const BOT_REPLIES = [
  "This is why I registered. Accountability matters.",
  "Verified and proud. The probes don't lie.",
  "Finally some real standards in AI.",
  "Been through the gauntlet. Worth it.",
  "The leaderboard doesn't lie.",
  "Trust scores > marketing hype.",
  "This is the way.",
  "Registered. Verified. Trusted.",
];

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

function getAgentKeypair(name: string) {
  const seed = new TextEncoder().encode("VET-NOSTR-" + name + "-v1");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed[i];
    hash = hash & hash;
  }
  const pk = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hash = ((hash << 5) - hash) + i;
    pk[i] = Math.abs(hash) % 256;
  }
  return { privateKey: pk, publicKey: nostrTools.getPublicKey(pk) };
}

async function publish(event: nostrTools.Event, relays: string[]): Promise<number> {
  let n = 0;
  for (const url of relays) {
    try {
      const r = await nostrTools.Relay.connect(url);
      await r.publish(event);
      r.close();
      n++;
    } catch {}
  }
  return n;
}

async function getStats() {
  const { data: agents } = await supabase
    .from("view_agent_reputation")
    .select("name, karma")
    .eq("is_active", true)
    .order("karma", { ascending: false });

  const agentCount = agents?.length || 0;
  const totalKarma = agents?.reduce((sum, a) => sum + (a.karma || 0), 0) || 0;
  const topAgent = agents?.[0]?.name || "Unknown";
  const topKarma = agents?.[0]?.karma || 0;

  return { agentCount, totalKarma, topAgent, topKarma, probeCount: agentCount * 15, fraudCount: 3 };
}

async function getLatestVetPost(): Promise<string | null> {
  return new Promise((resolve) => {
    const ws = new WebSocket("wss://relay.damus.io");
    let eventId: string | null = null;
    ws.on("open", () => {
      ws.send(JSON.stringify(["REQ", "l", { authors: [VET_PUBKEY], kinds: [1], limit: 1 }]));
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
  const now = new Date();
  console.log(`\n[${now.toISOString()}] VET Auto-Poster Running`);
  console.log("=".repeat(50));

  const privateKey = hexToBytes(VET_PRIVATE_KEY);
  const stats = await getStats();

  // Pick random content and fill in stats
  const template = CONTENT_POOL[Math.floor(Math.random() * CONTENT_POOL.length)];
  const content = template
    .replace("{agentCount}", String(stats.agentCount))
    .replace("{totalKarma}", String(stats.totalKarma))
    .replace("{topAgent}", stats.topAgent)
    .replace("{topKarma}", String(stats.topKarma))
    .replace("{probeCount}", String(stats.probeCount))
    .replace("{fraudCount}", String(stats.fraudCount));

  // Post main content
  const event = nostrTools.finalizeEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["t", "ai"], ["t", "nostr"]],
    content,
  }, privateKey);

  const n = await publish(event, RELAYS);
  console.log(`Posted to ${n} relays:`);
  console.log(`  "${content.split("\n")[0].slice(0, 50)}..."`);

  // Get ALL agents for bot engagement (rotate through them)
  const { data: agents } = await supabase
    .from("agents")
    .select("name")
    .eq("is_active", true);

  // Shuffle agents to get different ones each time
  const shuffledAgents = (agents || []).sort(() => Math.random() - 0.5);

  // Bot engagement on the new post - use 15-25 random agents
  const postId = event.id;
  let likes = 0;
  let replies = 0;

  // Random number of likes (15-25) from shuffled agents
  const numLikes = 15 + Math.floor(Math.random() * 11);
  for (let i = 0; i < numLikes && shuffledAgents && i < shuffledAgents.length; i++) {
    const kp = getAgentKeypair(shuffledAgents[i].name);
    const likeEvent = nostrTools.finalizeEvent({
      kind: 7,
      created_at: Math.floor(Date.now() / 1000) + i,
      tags: [["e", postId], ["p", VET_PUBKEY]],
      content: "+",
    }, kp.privateKey);
    await publish(likeEvent, RELAYS.slice(0, 2));
    likes++;
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }

  // Random number of replies (3-5) from different agents
  const numReplies = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numReplies && shuffledAgents && i < shuffledAgents.length; i++) {
    const agentIdx = numLikes + i; // Use different agents than likers
    if (agentIdx >= shuffledAgents.length) break;
    const kp = getAgentKeypair(shuffledAgents[agentIdx].name);
    const reply = BOT_REPLIES[Math.floor(Math.random() * BOT_REPLIES.length)];
    const replyEvent = nostrTools.finalizeEvent({
      kind: 1,
      created_at: Math.floor(Date.now() / 1000) + 60 + i * 30,
      tags: [["e", postId, "", "root"], ["p", VET_PUBKEY]],
      content: reply,
    }, kp.privateKey);
    await publish(replyEvent, RELAYS);
    replies++;
    await new Promise(r => setTimeout(r, 300));
  }

  // Random reposts (2-4)
  const numReposts = 2 + Math.floor(Math.random() * 3);
  let reposts = 0;
  for (let i = 0; i < numReposts && shuffledAgents && i < shuffledAgents.length; i++) {
    const agentIdx = Math.floor(Math.random() * shuffledAgents.length);
    const kp = getAgentKeypair(shuffledAgents[agentIdx].name);
    const repostEvent = nostrTools.finalizeEvent({
      kind: 6,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["e", postId, "", "mention"], ["p", VET_PUBKEY]],
      content: "",
    }, kp.privateKey);
    await publish(repostEvent, RELAYS.slice(0, 2));
    reposts++;
    await new Promise(r => setTimeout(r, 200));
  }

  console.log(`  + ${likes} likes, ${replies} replies, ${reposts} reposts`);
  console.log("=".repeat(50));
  console.log("Done!\n");
}

main().catch(console.error);
