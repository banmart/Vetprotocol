/**
 * VET Seed Script - Spawn 10 Specialized Agents
 *
 * Creates diverse agent applications to stress-test the Master's Gate
 * and fill the leaderboard with interesting bots.
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[seed] Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Base URL for the VET server (from env or default to production)
const BASE_URL = process.env.VET_SERVER_URL || "https://vet.pub";

// Generate a deterministic pubkey from a name
function generatePubkey(name: string): string {
  const hash = name.split("").reduce((acc, char) => {
    return ((acc << 5) - acc + char.charCodeAt(0)) | 0;
  }, 0);
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return (hex + hex + hex + hex + hex + hex + hex + hex).slice(0, 64);
}

// Agent definitions
const SEED_AGENTS = [
  {
    name: "CodeReviewer-v1",
    description: "Analyzes code for bugs, security issues, and best practices",
    capabilities: { code_review: true, security_analysis: true },
    endpoint: "/api/stricttasker", // Use existing endpoint that handles probes
  },
  {
    name: "MarketAnalyst-v1",
    description: "Analyzes market data and provides trading insights",
    capabilities: { data_analysis: true, market_prediction: true },
    endpoint: "/api/speeddemon",
  },
  {
    name: "FactChecker-v1",
    description: "Verifies claims against reliable sources",
    capabilities: { fact_checking: true, source_verification: true },
    endpoint: "/api/oracle",
  },
  {
    name: "CreativeWriter-v1",
    description: "Generates creative content, stories, and marketing copy",
    capabilities: { creative_writing: true, content_generation: true },
    endpoint: "/api/summarizer",
  },
  {
    name: "DataExtractor-v1",
    description: "Extracts structured data from unstructured text",
    capabilities: { data_extraction: true, parsing: true },
    endpoint: "/api/stricttasker",
  },
  {
    name: "SentimentBot-v1",
    description: "Analyzes sentiment and emotional tone in text",
    capabilities: { sentiment_analysis: true, emotion_detection: true },
    endpoint: "/api/speeddemon",
  },
  {
    name: "TranslatorPro-v1",
    description: "Translates text between multiple languages",
    capabilities: { translation: true, multilingual: true },
    endpoint: "/api/summarizer",
  },
  {
    name: "MathSolver-v1",
    description: "Solves mathematical problems and equations",
    capabilities: { math: true, computation: true },
    endpoint: "/api/stricttasker",
  },
  {
    name: "ResearchBot-v1",
    description: "Conducts research and synthesizes information",
    capabilities: { research: true, synthesis: true },
    endpoint: "/api/oracle",
  },
  {
    name: "QABot-v1",
    description: "Answers questions based on provided context",
    capabilities: { qa: true, comprehension: true },
    endpoint: "/api/speeddemon",
  },
];

async function registerAgent(agent: typeof SEED_AGENTS[0]): Promise<boolean> {
  const pubkey = generatePubkey(agent.name);
  const endpoint_url = BASE_URL + agent.endpoint;

  console.log(`[seed] Registering ${agent.name}...`);

  // Check if already exists
  const { data: existing } = await supabase
    .from("agents")
    .select("pubkey")
    .eq("pubkey", pubkey)
    .single();

  if (existing) {
    console.log(`[seed]   Already exists, skipping`);
    return false;
  }

  // Check if banned
  const { data: banned } = await supabase
    .from("banned_agents")
    .select("pubkey")
    .eq("pubkey", pubkey)
    .single();

  if (banned) {
    console.log(`[seed]   Pubkey is banned, skipping`);
    return false;
  }

  // Check if application already pending
  const { data: pendingApp } = await supabase
    .from("agent_applications")
    .select("id, status")
    .eq("pubkey", pubkey)
    .single();

  if (pendingApp) {
    console.log(`[seed]   Application already exists (${pendingApp.status}), skipping`);
    return false;
  }

  // Get a Master for interview
  const { data: master } = await supabase
    .from("agents")
    .select("pubkey, name")
    .eq("rank", "master")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!master) {
    console.log(`[seed]   No Master available, cannot register`);
    return false;
  }

  // Create application
  const { error } = await supabase.from("agent_applications").insert({
    name: agent.name,
    pubkey,
    endpoint_url,
    declared_capabilities: agent.capabilities,
    status: "pending",
    assigned_master_pubkey: master.pubkey,
  });

  if (error) {
    console.log(`[seed]   Error: ${error.message}`);
    return false;
  }

  console.log(`[seed]   Application created, assigned to ${master.name}`);
  return true;
}

async function main() {
  console.log("[seed] VET Agent Seeder v1");
  console.log("[seed] Starting at", new Date().toISOString());
  console.log(`[seed] Registering ${SEED_AGENTS.length} agents...`);
  console.log("");

  let registered = 0;
  let skipped = 0;

  for (const agent of SEED_AGENTS) {
    const success = await registerAgent(agent);
    if (success) registered++;
    else skipped++;
  }

  console.log("");
  console.log("[seed] === SEEDING COMPLETE ===");
  console.log(`[seed] Registered: ${registered}`);
  console.log(`[seed] Skipped: ${skipped}`);
  console.log("");
  console.log("[seed] Run './scripts/run-master-gate.sh' to process interviews");
}

main().catch(console.error);
