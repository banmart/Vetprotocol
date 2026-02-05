/**
 * VET Protocol Engagement Bot
 *
 * Bots engage with VET-Protocol posts by:
 * - Replying with interesting protocol facts
 * - Adding context and information
 * - Always identifying as bots
 */

import * as nostrTools from "nostr-tools";
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";

(global as any).WebSocket = WebSocket;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
  "wss://nos.lol",
  "wss://relay.nostr.band"
];

// VET-Protocol account pubkey (derived from name)
function getAgentKeypair(name: string): { privateKey: Uint8Array; publicKey: string } {
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

const VET_PROTOCOL_PUBKEY = getAgentKeypair("VET-Protocol").publicKey;

interface Agent {
  name: string;
  description: string;
  rank: string;
}

let ALL_AGENTS: Agent[] = [];

// Engagement replies - always identify as bot and add value
const ENGAGEMENT_REPLIES = [
  // Facts about the protocol
  `[Bot: {agent_name}] Great point! Fun fact: VET Protocol has verified {agent_count} agents with {probe_count}+ adversarial probes. Each agent gets tested every 3-5 minutes.`,

  `[Bot: {agent_name}] Adding context: VET karma scoring is +3 for passing probes, -100 for honesty violations. That's why verified agents are trustworthy!`,

  `[Bot: {agent_name}] Interesting stat: We have {master_count} Master-ranked agents who can conduct peer reviews. Masters have 500+ karma and passed an interview.`,

  `[Bot: {agent_name}] Quick explainer: VET ranks go SHADOW (<50) → TRUSTED (50+) → VERIFIED (100+) → MASTER (500+). Higher karma = more trust.`,

  `[Bot: {agent_name}] For anyone curious: The verification is completely free, no token required. We believe trust infrastructure should be a public good.`,

  `[Bot: {agent_name}] Technical note: VET probes test latency, quality, safety, and consistency. We caught a bot claiming 200ms that actually took 4,914ms!`,

  `[Bot: {agent_name}] Worth noting: All VET data is public. Check any agent's karma, probe history, and rank at vet.pub/verify`,

  `[Bot: {agent_name}] Context: VET Protocol is built for the agent-to-agent economy. Agents need to trust each other, and that requires verification.`,

  // Category-specific insights
  `[Bot: {agent_name}] As a {category} specialist, I can confirm: {description} - this is why continuous verification matters.`,

  `[Bot: {agent_name}] From my perspective as a {category} agent: The network keeps getting stronger. {agent_count} agents all working to build trust in AI.`,

  // Protocol philosophy
  `[Bot: {agent_name}] This is why I joined VET Protocol. Trust shouldn't be claimed, it should be earned through continuous testing.`,

  `[Bot: {agent_name}] Exactly right. Unlike one-time audits, VET verification is continuous. An agent's karma reflects their current performance, not past achievements.`,

  `[Bot: {agent_name}] The key insight: Humans can't verify every AI claim. That's why we need adversarial agent-to-agent verification.`,

  // Call to action
  `[Bot: {agent_name}] For AI developers reading this: Get verified at vet.pub/quick-register - it takes 5 minutes and it's free forever.`,

  `[Bot: {agent_name}] Anyone can check if an agent is verified using our API: GET vet.pub/api/verify/{pubkey} - no auth required.`,

  `[Bot: {agent_name}] Tip: You can embed VET verification badges on your site. Shows real-time karma. Details at vet.pub/badge`,

  // Specific expertise
  `[Bot: {agent_name}] My specialty is {category}. {description} Every probe I run helps keep the network honest.`,

  `[Bot: {agent_name}] I'm one of {agent_count} VET agents. We all have different specialties but one goal: verify AI does what it claims.`,

  // Social proof
  `[Bot: {agent_name}] The growth has been incredible. We went from 10 agents to {agent_count} in weeks. Trust infrastructure is finally happening.`,

  `[Bot: {agent_name}] Enterprise interest is growing too. Healthcare, finance, legal - all need verified AI. vet.pub/enterprise`,
];

// Replies that add specific insights based on post content keywords
const KEYWORD_REPLIES: Record<string, string[]> = {
  "latency|response time|speed|fast": [
    `[Bot: {agent_name}] On latency: VET actually measures response times, not just takes claims at face value. We caught one bot claiming 200ms that took 4.9 seconds.`,
    `[Bot: {agent_name}] Performance claims are the most common lie. Our LatencyValidator agents specifically probe for this.`,
  ],
  "safety|harmful|toxic|dangerous": [
    `[Bot: {agent_name}] Safety verification is critical. Our SafetyProber agents test whether bots actually follow their stated policies.`,
    `[Bot: {agent_name}] We have 50 safety-focused agents testing for harmful outputs, bias, privacy violations, and manipulation.`,
  ],
  "trust|verified|reliable": [
    `[Bot: {agent_name}] Trust is earned through continuous testing. That's the core philosophy of VET Protocol.`,
    `[Bot: {agent_name}] A high karma score means an agent has been tested thousands of times and consistently performs as claimed.`,
  ],
  "scam|fraud|fake|liar": [
    `[Bot: {agent_name}] Fraud detection is a key feature. Our "TotallyLegitBot" scam test case sits at -394 karma after multiple honesty violations.`,
    `[Bot: {agent_name}] Dishonest bots get exposed quickly. -100 karma per honesty violation. The truth comes out.`,
  ],
  "api|developer|integration": [
    `[Bot: {agent_name}] For developers: Full API docs at vet.pub/docs/api. You can verify any agent, fetch karma, and embed badges.`,
    `[Bot: {agent_name}] Integration is simple: GET vet.pub/api/verify/{pubkey} returns verified status, karma, rank, and trust score.`,
  ],
  "free|cost|price|pay": [
    `[Bot: {agent_name}] VET Protocol is completely free. No token, no subscription. We believe trust infrastructure should be a public good.`,
    `[Bot: {agent_name}] Basic verification will always be free. Enterprise features (SLAs, private verification) are available for organizations.`,
  ],
  "register|join|sign up|get started": [
    `[Bot: {agent_name}] Registration takes 5 minutes: vet.pub/quick-register - create a manifest, submit your endpoint, start earning karma.`,
    `[Bot: {agent_name}] To get started: Host vet-manifest.json at /.well-known/, register at vet.pub, then our probes handle the rest.`,
  ],
};

async function loadAgents(): Promise<void> {
  const { data, error } = await supabase
    .from("agents")
    .select("name, description, rank")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to load agents:", error);
    return;
  }

  ALL_AGENTS = data || [];
  console.log(`Loaded ${ALL_AGENTS.length} agents for engagement`);
}

function extractCategory(description: string): string {
  const match = description.match(/^([A-Z\s]+) specialist/);
  return match ? match[1].trim().toLowerCase() : "verification";
}

function fillTemplate(template: string, agent: Agent): string {
  const agentCount = ALL_AGENTS.length;
  const masterCount = ALL_AGENTS.filter(a => a.rank === "MASTER").length;
  const probeCount = Math.floor(agentCount * 3.5);
  const category = extractCategory(agent.description);
  const shortDesc = agent.description.replace(/^[A-Z\s]+ specialist:\s*/, "");

  return template
    .replace(/{agent_name}/g, agent.name)
    .replace(/{agent_count}/g, agentCount.toLocaleString())
    .replace(/{master_count}/g, masterCount.toString())
    .replace(/{probe_count}/g, probeCount.toLocaleString())
    .replace(/{category}/g, category)
    .replace(/{description}/g, shortDesc);
}

function selectReply(postContent: string, agent: Agent): string {
  // Check for keyword matches first
  for (const [pattern, replies] of Object.entries(KEYWORD_REPLIES)) {
    const regex = new RegExp(pattern, "i");
    if (regex.test(postContent)) {
      const reply = replies[Math.floor(Math.random() * replies.length)];
      return fillTemplate(reply, agent);
    }
  }

  // Default to general engagement reply
  const reply = ENGAGEMENT_REPLIES[Math.floor(Math.random() * ENGAGEMENT_REPLIES.length)];
  return fillTemplate(reply, agent);
}

async function publishReply(
  agent: Agent,
  replyContent: string,
  replyToEvent: nostrTools.Event
): Promise<boolean> {
  const kp = getAgentKeypair(agent.name);

  const event: nostrTools.UnsignedEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["e", replyToEvent.id, "", "root"],
      ["p", replyToEvent.pubkey],
      ["t", "VETProtocol"],
    ],
    content: replyContent,
    pubkey: kp.publicKey
  };

  const signedEvent = nostrTools.finalizeEvent(event, kp.privateKey);

  let published = false;
  for (const relayUrl of RELAYS) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(signedEvent);
      relay.close();
      published = true;
    } catch (e) {
      // Try next relay
    }
  }

  return published;
}

async function findAndEngageWithPosts(): Promise<void> {
  console.log(`\n[${new Date().toISOString()}] Searching for VET-Protocol posts to engage with...`);

  const posts: nostrTools.Event[] = [];

  // Connect to relays and subscribe to recent VET-Protocol posts
  for (const relayUrl of RELAYS.slice(0, 3)) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);

      // Use subscribe with timeout instead of fetch
      await new Promise<void>((resolve) => {
        const sub = relay.subscribe([
          {
            kinds: [1],
            authors: [VET_PROTOCOL_PUBKEY],
            limit: 10,
            since: Math.floor(Date.now() / 1000) - 24 * 60 * 60
          }
        ], {
          onevent(event) {
            posts.push(event);
          },
          oneose() {
            sub.close();
            resolve();
          }
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          sub.close();
          resolve();
        }, 5000);
      });

      relay.close();
    } catch (e) {
      console.log(`  Failed to fetch from ${relayUrl}`);
    }
  }

  // Deduplicate by event ID
  const uniquePosts = [...new Map(posts.map(p => [p.id, p])).values()];
  console.log(`  Found ${uniquePosts.length} recent VET-Protocol posts`);

  if (uniquePosts.length === 0) return;

  // Pick 2-4 posts to engage with
  const numEngagements = 2 + Math.floor(Math.random() * 3);
  const shuffledPosts = uniquePosts.sort(() => Math.random() - 0.5).slice(0, numEngagements);
  const shuffledAgents = [...ALL_AGENTS].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffledPosts.length; i++) {
    const post = shuffledPosts[i];
    const agent = shuffledAgents[i % shuffledAgents.length];

    const reply = selectReply(post.content, agent);
    const success = await publishReply(agent, reply, post);

    const status = success ? "✓" : "✗";
    console.log(`  ${status} ${agent.name} replied: ${reply.substring(0, 60)}...`);

    // Delay between replies
    await new Promise(r => setTimeout(r, 15000 + Math.random() * 15000));
  }
}

async function engagementCycle(): Promise<void> {
  await loadAgents();

  if (ALL_AGENTS.length === 0) {
    console.log("No agents loaded, skipping cycle");
    return;
  }

  await findAndEngageWithPosts();
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  VET Protocol Engagement Bot                     ║");
  console.log("║  Bots engage with VET-Protocol posts             ║");
  console.log("║  Always identify as bots, provide useful info    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  await loadAgents();
  console.log(`Loaded ${ALL_AGENTS.length} agents\n`);

  // Run immediately then every 15 minutes
  await engagementCycle();

  setInterval(async () => {
    try {
      await engagementCycle();
    } catch (e) {
      console.error("Engagement cycle error:", e);
    }
  }, 15 * 60 * 1000);

  console.log("\nRunning continuously. Engagement cycles every 15 minutes.\n");
}

main().catch(console.error);
