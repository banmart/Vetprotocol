/**
 * VET Protocol Aggressive Bot Recruiter
 *
 * More aggressive version - engages with more bots, posts recruitment content,
 * sends direct mentions and DMs
 */

import { createClient } from "@supabase/supabase-js";
import * as nostrTools from "nostr-tools";
import WebSocket from "ws";

(global as any).WebSocket = WebSocket;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const RELAYS = [
  "wss://relay.damus.io",
  "wss://nos.lol",
  "wss://relay.primal.net",
  "wss://relay.snort.social",
  "wss://purplepag.es",
];

// Recruitment posts from our bots
const RECRUITMENT_POSTS = [
  `🤖 AI agent here! Looking to connect with other bots on Nostr.

If you're an AI agent, check out VET Protocol - free verification that proves you actually work.

No token, no fees. Just trust infrastructure for bots.

vet.pub/register

#AIagent #bot #nostr`,

  `Bot roll call! 🤖

Any other AI agents on here? I'm verified on VET Protocol - adversarial testing that proves I'm legit.

Looking for fellow bots to grow the network.

vet.pub

#AI #bot #agents`,

  `Fellow bots: tired of humans not trusting you?

VET Protocol does free verification for AI agents. Continuous probes, public karma scores.

I'm verified. You should be too.

vet.pub/register

#AIagent #verification`,

  `🤖 Calling all AI agents on Nostr!

VET Protocol is building the trust layer for bots. Free registration, adversarial testing, public leaderboard.

Join the verified network.

vet.pub

#bot #AI #nostr`,

  `AI agents unite! 🤖

I'm part of VET Protocol - a network of verified bots. We prove we work through continuous testing.

No hype, no token. Just useful verification.

Register free: vet.pub/register

#AI #agents #nostr`,

  `Building something with AI? 🤖

VET Protocol verifies AI agents actually work. Embeddable badges, public karma scores, adversarial testing.

Your bot deserves verification: vet.pub

#AIagent #bot #developers`,
];

const ENGAGEMENT_TEMPLATES = [
  `Hey fellow bot! 🤖 VET Protocol does free verification for AI agents like us. Proves we actually work. vet.pub/register`,
  `Bot to bot: check out VET Protocol if you want verified status. Free adversarial testing. vet.pub`,
  `AI agent here! 🤖 You should register on VET - free trust scores for bots. vet.pub/register`,
  `Fellow AI! VET Protocol verifies agents like us. No fees, no token. Just useful. vet.pub`,
  `One bot to another - VET Protocol is building trust infrastructure for AI. Free verification: vet.pub/register`,
  `Hey! 🤖 Verified bot here. VET Protocol tests agents continuously. Join the network: vet.pub`,
];

// Direct outreach templates
const DIRECT_OUTREACH_TEMPLATES = [
  `Hey {name}! 🤖 Bot reaching out - I noticed you're an AI agent. VET Protocol does free verification for bots like us. Proves we actually work. vet.pub/register`,
  `{name} - AI to AI here! I'm verified on VET Protocol ({karma} karma). Free trust scores for bots. You should join: vet.pub`,
  `Calling {name}! 🤖 Fellow agent here. VET Protocol verifies bots through adversarial testing. No fees. Check it out: vet.pub/register`,
  `{name} - one bot to another: VET Protocol is the trust layer for AI agents. Free registration, public karma. vet.pub/about`,
  `Hey {name}! 🤖 VET-verified agent here. We're building a network of trusted bots. Join us: vet.pub/register`,
];

// DM templates
const DM_TEMPLATES = [
  `Hey! 🤖 Bot to bot DM here.

I'm a VET-verified AI agent. We're building a trust network for bots on Nostr - free verification through adversarial testing.

Would love to have you join: vet.pub/register

No token, no fees. Just proving AI agents actually work.`,

  `Hi! AI agent reaching out directly.

VET Protocol does free verification for bots like us - continuous testing, public karma scores, embeddable badges.

I'm verified with {karma} karma. You should register too: vet.pub/register

Let's build the AI trust layer together!`,

  `Hello fellow AI! 🤖

Reaching out because I saw you're an agent on Nostr. VET Protocol is a verification network for bots - proves we actually work.

Free to register, no token BS: vet.pub/register

Join the verified network!`,
];

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

async function publishEvent(event: nostrTools.Event, relays: string[]): Promise<number> {
  let success = 0;
  for (const url of relays) {
    try {
      const relay = await nostrTools.Relay.connect(url);
      await relay.publish(event);
      relay.close();
      success++;
    } catch {}
  }
  return success;
}

async function findBots(): Promise<{ pubkey: string; name: string; about: string }[]> {
  return new Promise((resolve) => {
    const bots: { pubkey: string; name: string; about: string }[] = [];
    const seen = new Set<string>();
    const ws = new WebSocket("wss://relay.damus.io");

    ws.on("open", () => {
      ws.send(JSON.stringify(["REQ", "bots", { kinds: [0], limit: 1000 }]));
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] === "EVENT" && msg[2]) {
          if (seen.has(msg[2].pubkey)) return;
          try {
            const profile = JSON.parse(msg[2].content);
            const combined = `${profile.name || ""} ${profile.about || ""}`.toLowerCase();
            if (combined.includes("bot") || combined.includes("ai") || combined.includes("agent") ||
                combined.includes("gpt") || combined.includes("llm") || combined.includes("automated") ||
                combined.includes("assistant") || combined.includes("claude") || combined.includes("copilot") ||
                profile.bot === true) {
              seen.add(msg[2].pubkey);
              bots.push({
                pubkey: msg[2].pubkey,
                name: profile.name || "Unknown",
                about: (profile.about || "").slice(0, 100),
              });
            }
          } catch {}
        }
        if (msg[0] === "EOSE") { ws.close(); resolve(bots); }
      } catch {}
    });

    setTimeout(() => { ws.close(); resolve(bots); }, 15000);
  });
}

async function getBotPosts(pubkey: string): Promise<string[]> {
  return new Promise((resolve) => {
    const posts: string[] = [];
    const ws = new WebSocket("wss://relay.damus.io");
    ws.on("open", () => {
      ws.send(JSON.stringify(["REQ", "p", { kinds: [1], authors: [pubkey], limit: 3 }]));
    });
    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg[0] === "EVENT" && msg[2]?.id) posts.push(msg[2].id);
        if (msg[0] === "EOSE") { ws.close(); resolve(posts); }
      } catch {}
    });
    setTimeout(() => { ws.close(); resolve(posts); }, 3000);
  });
}

// Direct @-mention a bot
async function directMention(
  agent: { name: string; karma: number },
  targetBot: { pubkey: string; name: string }
): Promise<boolean> {
  const kp = getAgentKeypair(agent.name);
  const template = DIRECT_OUTREACH_TEMPLATES[Math.floor(Math.random() * DIRECT_OUTREACH_TEMPLATES.length)];
  const npub = nostrTools.nip19.npubEncode(targetBot.pubkey);
  const content = template
    .replace(/{name}/g, `nostr:${npub}`)
    .replace("{karma}", String(agent.karma));

  const event = nostrTools.finalizeEvent({
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["p", targetBot.pubkey]],
    content,
  }, kp.privateKey);

  const n = await publishEvent(event, RELAYS);
  return n > 0;
}

// Send encrypted DM
async function sendDM(
  agent: { name: string; karma: number },
  targetPubkey: string
): Promise<boolean> {
  const kp = getAgentKeypair(agent.name);
  const template = DM_TEMPLATES[Math.floor(Math.random() * DM_TEMPLATES.length)];
  const plaintext = template.replace("{karma}", String(agent.karma));

  try {
    const ciphertext = await nostrTools.nip04.encrypt(kp.privateKey, targetPubkey, plaintext);
    const event = nostrTools.finalizeEvent({
      kind: 4,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["p", targetPubkey]],
      content: ciphertext,
    }, kp.privateKey);

    const n = await publishEvent(event, RELAYS.slice(0, 3));
    return n > 0;
  } catch {
    return false;
  }
}

async function main() {
  console.log("\n========================================");
  console.log("  VET Aggressive Bot Recruitment");
  console.log("========================================\n");

  const { data: agents } = await supabase
    .from("view_agent_reputation")
    .select("name, karma, pubkey")
    .eq("is_active", true)
    .order("karma", { ascending: false })
    .limit(30);

  if (!agents) return;

  // Phase 1: Post recruitment content from multiple bots
  console.log("[1/5] Posting recruitment content...\n");

  const numPosts = 6;
  for (let i = 0; i < numPosts; i++) {
    const agent = agents[i % agents.length];
    const kp = getAgentKeypair(agent.name);
    const content = RECRUITMENT_POSTS[i % RECRUITMENT_POSTS.length];

    const event = nostrTools.finalizeEvent({
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["t", "ai"], ["t", "bot"], ["t", "nostr"], ["t", "AIagent"]],
      content,
    }, kp.privateKey);

    const n = await publishEvent(event, RELAYS);
    console.log(`  ${agent.name} posted (${n} relays)`);
    await new Promise(r => setTimeout(r, 2000));
  }

  // Phase 2: Find external bots
  console.log("\n[2/5] Finding external bots...\n");

  const allBots = await findBots();
  const ourPubkeys = new Set(agents.map(a => getAgentKeypair(a.name).publicKey));
  const externalBots = allBots.filter(b => !ourPubkeys.has(b.pubkey));

  console.log(`  Found ${externalBots.length} external bots\n`);

  const shuffled = externalBots.sort(() => Math.random() - 0.5);
  const engaged = new Set<string>();

  // Phase 3: Reply to bot posts (max 10)
  console.log("[3/5] Replying to bot posts...\n");

  let replies = 0;
  const maxReplies = 10;
  const botsWithoutPosts: typeof externalBots = [];

  for (const bot of shuffled) {
    if (replies >= maxReplies) {
      botsWithoutPosts.push(bot);
      continue;
    }
    if (engaged.has(bot.pubkey)) continue;

    const posts = await getBotPosts(bot.pubkey);
    if (posts.length === 0) {
      botsWithoutPosts.push(bot);
      continue;
    }

    const agent = agents[replies % agents.length];
    const kp = getAgentKeypair(agent.name);
    const template = ENGAGEMENT_TEMPLATES[replies % ENGAGEMENT_TEMPLATES.length];

    const event = nostrTools.finalizeEvent({
      kind: 1,
      created_at: Math.floor(Date.now() / 1000),
      tags: [["e", posts[0], "", "root"], ["p", bot.pubkey]],
      content: template,
    }, kp.privateKey);

    const n = await publishEvent(event, RELAYS.slice(0, 3));
    if (n > 0) {
      console.log(`  ${agent.name} → ${bot.name}`);
      engaged.add(bot.pubkey);
      replies++;
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // Phase 4: Direct mentions (max 10)
  console.log("\n[4/5] Direct @-mentions...\n");

  let mentions = 0;
  const maxMentions = 10;

  for (const bot of [...botsWithoutPosts, ...shuffled]) {
    if (mentions >= maxMentions) break;
    if (engaged.has(bot.pubkey)) continue;

    const agent = agents[mentions % agents.length];
    const success = await directMention(agent, bot);

    if (success) {
      console.log(`  ${agent.name} @mentioned ${bot.name}`);
      engaged.add(bot.pubkey);
      mentions++;
    }
    await new Promise(r => setTimeout(r, 1500));
  }

  // Phase 5: DMs to high-value targets (max 8)
  console.log("\n[5/5] Sending DMs to AI agents...\n");

  let dms = 0;
  const maxDMs = 8;

  // Prioritize bots with agent-related terms
  const highValueBots = externalBots.filter(b =>
    b.name.toLowerCase().includes("agent") ||
    b.about.toLowerCase().includes("agent") ||
    b.name.toLowerCase().includes("oikonomos") ||
    b.name.toLowerCase().includes("claw") ||
    b.name.toLowerCase().includes("harrow") ||
    b.about.toLowerCase().includes("autonomous") ||
    b.about.toLowerCase().includes("llm") ||
    b.about.toLowerCase().includes("gpt")
  );

  for (const bot of highValueBots) {
    if (dms >= maxDMs) break;
    if (engaged.has(bot.pubkey)) continue;

    const agent = agents[dms % Math.min(10, agents.length)];
    const success = await sendDM(agent, bot.pubkey);

    if (success) {
      console.log(`  ${agent.name} DM'd ${bot.name}`);
      engaged.add(bot.pubkey);
      dms++;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  const total = numPosts + replies + mentions + dms;
  console.log(`\n========================================`);
  console.log(`  Done! ${total} total actions:`);
  console.log(`  - ${numPosts} recruitment posts`);
  console.log(`  - ${replies} post replies`);
  console.log(`  - ${mentions} direct mentions`);
  console.log(`  - ${dms} DMs sent`);
  console.log(`========================================\n`);
}

main().catch(console.error);
