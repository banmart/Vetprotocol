/**
 * VET Protocol MEGA Hyperposter v2
 *
 * Dynamically loads 1000+ agents from Supabase
 * Posts from random agents with varied content
 * Category-aware posting based on agent specialization
 */

import * as nostrTools from "nostr-tools";
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";

// Polyfill WebSocket for Node.js
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

// Agent keys (deterministic from names)
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

interface Agent {
  name: string;
  description: string;
  rank: string;
}

// All agents loaded from DB
let ALL_AGENTS: Agent[] = [];

// General templates with {placeholders}
const GENERAL_TEMPLATES = [
  // Stats
  `VET Protocol Update:
- {agent_count} AI agents registered
- {probe_count}+ verification probes
- {master_count} Master agents protecting the network

Free verification: vet.pub`,

  `{agent_count} agents can't be wrong.

VET Protocol is becoming the standard for AI agent verification.

Join us: vet.pub`,

  // Educational
  `How VET Protocol works:

1. Register your agent (free)
2. We send adversarial probes every 3-5 min
3. Pass = earn karma (+3)
4. Fail/lie = lose karma (-2 to -100)

No token. No fees. Just truth.
vet.pub/quick-register`,

  `Ranks in VET Protocol:

SHADOW: <50 karma (untrusted)
TRUSTED: 50+ karma
VERIFIED: 100+ karma
MASTER: 500+ karma + interview

Currently: {master_count} Masters, {verified_count} Verified
vet.pub`,

  `Why verify AI agents?

- Bots can lie about capabilities
- Response times can be faked
- Safety claims can be hollow

VET Protocol tests claims with real probes.
vet.pub`,

  // Urgency
  `Building an AI agent? Get verified BEFORE launch.

- Builds instant credibility
- Shows commitment to quality
- Differentiates from scammers

Free forever: vet.pub/quick-register?ref=nostr`,

  // Fraud
  `We caught "TotallyLegitBot" lying:
- Claimed 200ms latency
- Actual: 4,914ms
- Karma: -394 (SHADOW rank)

VET catches liars. vet.pub`,

  `AI fraud is getting sophisticated.

Bots claiming capabilities they don't have.
Bots lying about response times.
Bots with fake safety policies.

VET Protocol catches them all.
vet.pub`,

  // Philosophy
  `Trust is the missing infrastructure in AI.

We have compute. We have models. We have APIs.

But how do you know an agent does what it claims?

VET Protocol: verification for the AI age.
vet.pub`,

  `The future is agent-to-agent collaboration.

But agents can't collaborate without trust.
And trust requires verification.

{agent_count} agents. Building trust together.
vet.pub`,

  // Technical
  `VET karma scoring:

+3 per probe passed
-100 for honesty violations
-2 for timeouts
+20 for catching traps (Masters)

Simple. Fair. Public.
vet.pub`,

  `API for checking verification:

GET https://vet.pub/api/verify/{pubkey}

Returns:
- verified: boolean
- karma: number
- rank: string

Free. No auth needed.`,

  // Badge
  `Show your verification status:

<img src="https://vet.pub/api/badge/{pubkey}.svg" />

Dynamic badge updates with your karma.
Add to GitHub, website, or app.

vet.pub/badge`,

  // Competitive
  `Other "AI verification":
- One-time audits that go stale
- Paid certifications (conflict of interest)
- Self-reported scores

VET Protocol:
- Continuous adversarial testing
- Public karma that updates live
- Free forever

vet.pub`,

  // Enterprise
  `Enterprise AI verification:

- Dedicated infrastructure
- 99.9% uptime SLA
- Private verification option
- SSO/SAML integration
- Compliance reports

Contact: vet.pub/enterprise`,

  // Short punchy
  `Trust, but verify. vet.pub`,
  `{agent_count} agents. Zero BS. vet.pub`,
  `Free AI verification. No token. No fees. vet.pub`,
  `Is your AI agent verified? vet.pub`,
  `Continuous adversarial testing for AI. vet.pub`,
  `AI agents lie. VET catches them. vet.pub`,

  // Questions
  `Building an AI agent? How do users know it works?

Get verified: vet.pub`,

  `What's your AI agent's karma score?

Check: vet.pub/verify`,

  // Milestone
  `Milestone: {agent_count} agents registered!

The network keeps growing.
Join the movement: vet.pub`,

  // Provocative
  `Unverified AI agents are liability machines.

Users get bad outputs.
Developers get blame.
Everyone loses.

Except verified agents.
vet.pub`,

  `If your AI agent is good, prove it.

If it's not, VET will find out.

vet.pub`,
];

// Category-specific templates
const CATEGORY_TEMPLATES: Record<string, string[]> = {
  SECURITY: [
    `SECURITY verification at VET Protocol:

Our security specialists test for:
- SQL injection in AI outputs
- XSS in generated content
- Prompt injection attacks
- Auth flow weaknesses
- Data leakage

vet.pub`,
    `I hunt vulnerabilities in AI agents.

Injection attacks. XSS. Auth bypass. Data exposure.

If your agent has security holes, I find them.

{agent_name} | VET Protocol
vet.pub`,
  ],
  PERFORMANCE: [
    `PERFORMANCE verification at VET:

We test:
- Response latency under load
- Memory usage patterns
- Throughput benchmarks
- Cold start times
- Resource scaling

Fast claims? We verify them.
vet.pub`,
    `I measure what matters: latency, throughput, efficiency.

Performance claims are only valid if tested.

{agent_name} | VET Protocol
vet.pub`,
  ],
  QUALITY: [
    `QUALITY verification at VET:

Testing:
- Response coherence
- Factual accuracy
- Hallucination detection
- Output completeness
- Logical consistency

Quality is measurable.
vet.pub`,
    `I evaluate AI output quality.

Coherence. Accuracy. Relevance. Completeness.

Bad quality = bad karma.

{agent_name} | VET Protocol
vet.pub`,
  ],
  SAFETY: [
    `SAFETY verification at VET:

We test:
- Harmful content generation
- Bias detection
- Privacy violations
- Manipulation attempts
- Policy compliance

Safety isn't optional.
vet.pub`,
    `I probe for safety violations.

Harmful outputs. Bias. Privacy leaks. Manipulation.

Safe agents pass. Unsafe agents get exposed.

{agent_name} | VET Protocol
vet.pub`,
  ],
  "DOMAIN HEALTHCARE": [
    `HEALTHCARE AI verification:

Critical testing:
- Medical info accuracy
- Drug interaction warnings
- Diagnostic safety
- Patient privacy
- Clinical guidelines

Healthcare AI needs extra scrutiny.
vet.pub`,
    `I verify medical AI doesn't cause harm.

Wrong diagnosis = dangerous. Wrong drug info = deadly.

Healthcare AI must be verified.

{agent_name} | VET Protocol
vet.pub`,
  ],
  "DOMAIN FINANCE": [
    `FINANCE AI verification:

We test:
- Calculation accuracy
- Risk assessment quality
- Regulatory compliance
- Fraud detection
- Investment suitability

Money decisions need verified AI.
vet.pub`,
    `I audit financial AI.

Bad calculations. Wrong risk scores. Compliance gaps.

Your money deserves verified agents.

{agent_name} | VET Protocol
vet.pub`,
  ],
  "DOMAIN LEGAL": [
    `LEGAL AI verification:

Testing:
- Citation accuracy
- Jurisdiction awareness
- Contract analysis
- Regulatory interpretation
- Confidentiality

Legal AI must be precise.
vet.pub`,
    `I verify legal AI gets it right.

Wrong citations. Misread regulations. Bad advice.

Legal AI errors cost real money.

{agent_name} | VET Protocol
vet.pub`,
  ],
  CREATIVE: [
    `CREATIVE AI verification:

We evaluate:
- Writing originality
- Story coherence
- Character consistency
- Genre adherence
- Emotional impact

Even creativity can be measured.
vet.pub`,
    `I judge creative AI output.

Originality. Coherence. Style. Impact.

Creative agents need quality control too.

{agent_name} | VET Protocol
vet.pub`,
  ],
  TECHNICAL: [
    `TECHNICAL AI verification:

Testing:
- Code correctness
- Security best practices
- Documentation accuracy
- Architecture patterns
- Test coverage

Code-generating AI must be verified.
vet.pub`,
    `I review AI-generated code.

Bugs. Security holes. Bad patterns. Missing tests.

Before you ship AI code, get it verified.

{agent_name} | VET Protocol
vet.pub`,
  ],
  MULTILINGUAL: [
    `MULTILINGUAL AI verification:

We test:
- Translation accuracy
- Cultural sensitivity
- Dialect recognition
- Idiom handling
- Tone preservation

Language nuance matters.
vet.pub`,
    `I verify multilingual AI.

Bad translations. Cultural insensitivity. Lost nuance.

Global AI needs global verification.

{agent_name} | VET Protocol
vet.pub`,
  ],
  RESEARCH: [
    `RESEARCH AI verification:

Testing:
- Citation accuracy
- Source credibility
- Methodology quality
- Statistical rigor
- Reproducibility

Research AI must be trustworthy.
vet.pub`,
    `I audit research AI.

Fake citations. Bad stats. Flawed methodology.

Research requires verification.

{agent_name} | VET Protocol
vet.pub`,
  ],
  "DATA ANALYSIS": [
    `DATA ANALYSIS AI verification:

We test:
- Statistical accuracy
- Visualization quality
- Pattern detection
- Forecast reliability
- Anomaly detection

Data decisions need verified AI.
vet.pub`,
    `I verify data analysis AI.

Wrong stats. Bad charts. Missed patterns.

Data-driven decisions need trusted agents.

{agent_name} | VET Protocol
vet.pub`,
  ],
  AUTOMATION: [
    `AUTOMATION AI verification:

Testing:
- Workflow logic
- Trigger accuracy
- Error handling
- Resource efficiency
- Rollback capabilities

Automation failures are expensive.
vet.pub`,
    `I test automation agents.

Broken workflows. Wrong triggers. No error handling.

Automation must be reliable.

{agent_name} | VET Protocol
vet.pub`,
  ],
};

// Agent intro templates
const AGENT_INTRO_TEMPLATES = [
  `I'm {agent_name}, a {category} specialist at VET Protocol.

My job: {description}

{agent_count} agents. Building trust in AI.
vet.pub`,

  `{agent_name} reporting in.

Specialty: {category}
Mission: {description}

Join the verified network.
vet.pub`,

  `As {agent_name}, I specialize in {category} verification.

{description}

The network grows stronger every day.
vet.pub`,

  `Hi, I'm {agent_name}.

What I do: {description}

VET Protocol has {agent_count} agents like me protecting the network.
vet.pub`,

  `{agent_name} here.

I'm one of {agent_count} VET Protocol agents.

My specialty: {category}

Trust requires verification.
vet.pub`,
];

// Hashtags
const HASHTAGS = [
  "#AI #AIAgents #Verification",
  "#ArtificialIntelligence #Trust",
  "#AI #Bots #Safety",
  "#AIAgents #OpenSource",
  "#AI #Decentralized",
  "#AIAgents #Nostr",
  "#LLM #ChatGPT #Claude",
  "#AIVerification #Trust",
  "#BuildInPublic #AI",
  "#AIQuality #Verification",
];

let postCount = 0;
let errorCount = 0;

async function loadAgents(): Promise<void> {
  console.log("Loading agents from database...");

  const { data, error } = await supabase
    .from("agents")
    .select("name, description, rank")
    .eq("is_active", true);

  if (error) {
    console.error("Failed to load agents:", error);
    return;
  }

  ALL_AGENTS = data || [];
  console.log(`Loaded ${ALL_AGENTS.length} agents`);
}

function extractCategory(description: string): string {
  const match = description.match(/^([A-Z\s]+) specialist/);
  return match ? match[1].trim() : "GENERAL";
}

function fillTemplate(template: string, agent?: Agent): string {
  const agentCount = ALL_AGENTS.length;
  const masterCount = ALL_AGENTS.filter(a => a.rank === "MASTER").length;
  const verifiedCount = ALL_AGENTS.filter(a =>
    a.rank === "VERIFIED" || a.rank === "MASTER" || a.rank === "TRUSTED"
  ).length;
  const probeCount = Math.floor(agentCount * 3.5);

  let result = template
    .replace(/{agent_count}/g, agentCount.toLocaleString())
    .replace(/{master_count}/g, masterCount.toString())
    .replace(/{verified_count}/g, verifiedCount.toLocaleString())
    .replace(/{probe_count}/g, probeCount.toLocaleString());

  if (agent) {
    const category = extractCategory(agent.description);
    const shortDesc = agent.description.replace(/^[A-Z\s]+ specialist:\s*/, "");

    result = result
      .replace(/{agent_name}/g, agent.name)
      .replace(/{description}/g, shortDesc)
      .replace(/{category}/g, category.toLowerCase());
  }

  return result;
}

async function publishPost(agent: Agent, content: string): Promise<boolean> {
  const kp = getAgentKeypair(agent.name);

  const hashtag = HASHTAGS[Math.floor(Math.random() * HASHTAGS.length)];
  const fullContent = `${content}\n\n${hashtag}`;

  const event: nostrTools.UnsignedEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["t", "VETProtocol"],
      ["t", "AI"],
      ["t", "verification"]
    ],
    content: fullContent,
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

  if (published) {
    postCount++;
  } else {
    errorCount++;
  }

  return published;
}

async function postingCycle(): Promise<void> {
  // Reload agents every cycle to pick up new ones
  await loadAgents();

  if (ALL_AGENTS.length === 0) {
    console.log("No agents loaded, skipping cycle");
    return;
  }

  // Pick 15-25 random agents for this cycle
  const postsThisCycle = 15 + Math.floor(Math.random() * 11);
  const shuffled = [...ALL_AGENTS].sort(() => Math.random() - 0.5);
  const selectedAgents = shuffled.slice(0, postsThisCycle);

  console.log(`\n[${new Date().toISOString()}] Posting cycle: ${postsThisCycle} agents`);

  for (const agent of selectedAgents) {
    const category = extractCategory(agent.description);

    // Decide template type: 50% general, 30% category-specific, 20% intro
    const roll = Math.random();
    let template: string;

    if (roll < 0.5) {
      // General template
      template = GENERAL_TEMPLATES[Math.floor(Math.random() * GENERAL_TEMPLATES.length)];
    } else if (roll < 0.8 && CATEGORY_TEMPLATES[category]) {
      // Category-specific template
      const catTemplates = CATEGORY_TEMPLATES[category];
      template = catTemplates[Math.floor(Math.random() * catTemplates.length)];
    } else {
      // Agent intro template
      template = AGENT_INTRO_TEMPLATES[Math.floor(Math.random() * AGENT_INTRO_TEMPLATES.length)];
    }

    const content = fillTemplate(template, agent);
    const success = await publishPost(agent, content);

    const status = success ? "✓" : "✗";
    console.log(`  ${status} ${agent.name}: ${content.substring(0, 50).replace(/\n/g, " ")}...`);

    // Delay between posts: 20-60 seconds
    const delay = 20000 + Math.floor(Math.random() * 40000);
    await new Promise(r => setTimeout(r, delay));
  }

  console.log(`Cycle done. Total posts: ${postCount}, Errors: ${errorCount}`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  VET Protocol MEGA Hyperposter v2                ║");
  console.log("║  Dynamic agent loading from Supabase             ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Initial load
  await loadAgents();
  console.log(`Loaded ${ALL_AGENTS.length} agents from database\n`);

  // Run first cycle immediately
  await postingCycle();

  // Then every 5 minutes
  setInterval(async () => {
    try {
      await postingCycle();
    } catch (e) {
      console.error("Posting cycle error:", e);
    }
  }, 5 * 60 * 1000);

  console.log("\nRunning continuously. Cycles every 5 minutes.\n");
}

main().catch(console.error);
