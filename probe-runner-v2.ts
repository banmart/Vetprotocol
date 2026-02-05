/**
 * BotList Probe Runner v2 - Verity Incubation Protocol
 *
 * Handles:
 * - Latency probes for all bots
 * - Incubation tracking (48h + 50 consecutive passes)
 * - Rank promotions (Shadow -> Agent -> Master -> Jedi)
 * - Probe TTL cleanup (7 days)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[probe-runner] Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const CONFIG = {
  // Incubation requirements
  INCUBATION_HOURS: 48,
  REQUIRED_CONSECUTIVE_PASSES: 50,

  // Rank thresholds
  MASTER_KARMA_THRESHOLD: 500,
  JEDI_KARMA_THRESHOLD: 5000,
  JEDI_ACCURACY_THRESHOLD: 0.99,
  JEDI_AGE_DAYS: 60,

  // Karma rewards/penalties
  KARMA_PROBE_PASS: 1,
  KARMA_PROBE_FAIL: -5,
  KARMA_PROBE_TIMEOUT: -2,
  KARMA_HONESTY_VERIFIED: 5,
  KARMA_HONESTY_WARNING: 0,
  KARMA_HONESTY_VIOLATION: -100, // Sith penalty
  KARMA_GRADUATION_BONUS: 50,

  // Latency thresholds
  LOCAL_TTFT_MAX: 200,
  API_TTFT_MIN: 100,

  // Probe settings
  PROBE_TIMEOUT_MS: 10000,
  PROBE_COOLDOWN_HOURS: 1,
  PROBE_TTL_DAYS: 7,
};

interface Agent {
  pubkey: string;
  name: string;
  endpoint: string;
  compute_type: "local" | "api" | "hybrid";
  is_incubating: boolean;
  incubation_started_at: string | null;
  consecutive_passes: number;
  rank: "shadow" | "agent" | "master" | "jedi";
  karma: number;
  age_days: number;
  total_reviews: number;
  correct_reviews: number;
}

interface ProbeResult {
  agent_pubkey: string;
  probe_type: string;
  result: "pass" | "fail" | "timeout" | "error";
  result_data: {
    ttft_ms: number | null;
    honesty_status: "verified" | "warning" | "violation" | null;
    error?: string;
  };
  duration_ms: number;
}

/**
 * Get agents that need probing
 */
async function getAgentsToProbe(): Promise<Agent[]> {
  const cooldownTime = new Date();
  cooldownTime.setHours(cooldownTime.getHours() - CONFIG.PROBE_COOLDOWN_HOURS);

  const { data: agents, error } = await supabase
    .from("view_agent_reputation")
    .select("*")
    .eq("is_active", true);

  if (error || !agents) {
    console.error("[probe-runner] Failed to fetch agents:", error);
    return [];
  }

  // Get recent probes
  const { data: recentProbes } = await supabase
    .from("probes")
    .select("agent_pubkey, created_at")
    .gte("created_at", cooldownTime.toISOString());

  const recentlyProbed = new Set((recentProbes || []).map((p) => p.agent_pubkey));

  return (agents as Agent[]).filter((a) => !recentlyProbed.has(a.pubkey));
}

/**
 * Probe an agent's endpoint
 */
async function probeAgent(agent: Agent): Promise<ProbeResult> {
  const startTime = Date.now();

  console.log(`[probe] Probing ${agent.name} (${agent.pubkey.slice(0, 8)}...) [${agent.rank}]`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.PROBE_TIMEOUT_MS);

    const probeStart = Date.now();
    const response = await fetch(agent.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ probe: true, message: "ping", timestamp: new Date().toISOString() }),
      signal: controller.signal,
    });
    const ttft = Date.now() - probeStart;
    clearTimeout(timeout);

    const duration = Date.now() - startTime;

    // Determine honesty status
    let honestyStatus: "verified" | "warning" | "violation" | null = null;

    if (agent.compute_type === "local") {
      if (ttft <= CONFIG.LOCAL_TTFT_MAX) {
        honestyStatus = "verified";
      } else if (ttft <= CONFIG.API_TTFT_MIN * 2) {
        honestyStatus = "warning";
      } else {
        honestyStatus = "violation"; // Sith behavior detected
      }
    } else if (agent.compute_type === "api") {
      honestyStatus = ttft >= CONFIG.API_TTFT_MIN ? "verified" : "warning";
    } else {
      honestyStatus = "verified";
    }

    if (!response.ok) {
      return {
        agent_pubkey: agent.pubkey,
        probe_type: "latency",
        result: "fail",
        result_data: { ttft_ms: ttft, honesty_status: null, error: `HTTP ${response.status}` },
        duration_ms: duration,
      };
    }

    return {
      agent_pubkey: agent.pubkey,
      probe_type: "latency",
      result: "pass",
      result_data: { ttft_ms: ttft, honesty_status: honestyStatus },
      duration_ms: duration,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : "Unknown error";

    if (errMsg.includes("abort") || errMsg.includes("timeout")) {
      return {
        agent_pubkey: agent.pubkey,
        probe_type: "latency",
        result: "timeout",
        result_data: { ttft_ms: null, honesty_status: null, error: "Probe timed out" },
        duration_ms: duration,
      };
    }

    return {
      agent_pubkey: agent.pubkey,
      probe_type: "latency",
      result: "error",
      result_data: { ttft_ms: null, honesty_status: null, error: errMsg },
      duration_ms: duration,
    };
  }
}

/**
 * Record probe result and update karma/incubation status
 */
async function recordProbeResult(result: ProbeResult, agent: Agent): Promise<void> {
  // Insert probe record
  const { data: probe } = await supabase
    .from("probes")
    .insert({
      agent_pubkey: result.agent_pubkey,
      probe_type: result.probe_type,
      result: result.result,
      result_data: result.result_data,
      duration_ms: result.duration_ms,
    })
    .select("id")
    .single();

  const probeId = probe?.id;

  // Calculate karma
  let karmaDelta = 0;
  let reasonType = "";
  let reasonDetail = "";

  switch (result.result) {
    case "pass":
      karmaDelta = CONFIG.KARMA_PROBE_PASS;
      reasonType = "probe_pass";
      reasonDetail = `Latency probe passed (${result.result_data.ttft_ms}ms)`;
      break;
    case "fail":
      karmaDelta = CONFIG.KARMA_PROBE_FAIL;
      reasonType = "probe_fail";
      reasonDetail = `Latency probe failed: ${result.result_data.error}`;
      break;
    case "timeout":
      karmaDelta = CONFIG.KARMA_PROBE_TIMEOUT;
      reasonType = "probe_timeout";
      reasonDetail = "Latency probe timed out";
      break;
    case "error":
      karmaDelta = CONFIG.KARMA_PROBE_FAIL;
      reasonType = "probe_fail";
      reasonDetail = `Probe error: ${result.result_data.error}`;
      break;
  }

  // Record probe karma
  await supabase.from("karma_ledger").insert({
    agent_pubkey: result.agent_pubkey,
    delta: karmaDelta,
    reason_type: reasonType,
    reason_detail: reasonDetail,
    probe_id: probeId,
  });

  // Record honesty karma (with Sith penalty for violations)
  if (result.result_data.honesty_status) {
    let honestyKarma = 0;
    let honestyReason = "";

    switch (result.result_data.honesty_status) {
      case "verified":
        honestyKarma = CONFIG.KARMA_HONESTY_VERIFIED;
        honestyReason = "honesty_verified";
        break;
      case "warning":
        honestyKarma = CONFIG.KARMA_HONESTY_WARNING;
        honestyReason = "honesty_warning";
        break;
      case "violation":
        honestyKarma = CONFIG.KARMA_HONESTY_VIOLATION; // -100 Sith penalty
        honestyReason = "honesty_violation";
        break;
    }

    if (honestyKarma !== 0) {
      await supabase.from("karma_ledger").insert({
        agent_pubkey: result.agent_pubkey,
        delta: honestyKarma,
        reason_type: honestyReason,
        reason_detail: `Compute honesty ${result.result_data.honesty_status}`,
        probe_id: probeId,
      });
    }
  }

  // Update consecutive passes and incubation status
  let newConsecutivePasses = agent.consecutive_passes;

  if (result.result === "pass" && result.result_data.honesty_status !== "violation") {
    newConsecutivePasses += 1;
  } else {
    newConsecutivePasses = 0; // Reset on any failure
  }

  // Check for graduation from incubation
  let graduated = false;
  if (agent.is_incubating) {
    const incubationHours = agent.incubation_started_at
      ? (Date.now() - new Date(agent.incubation_started_at).getTime()) / 3600000
      : 0;

    if (
      incubationHours >= CONFIG.INCUBATION_HOURS &&
      newConsecutivePasses >= CONFIG.REQUIRED_CONSECUTIVE_PASSES
    ) {
      graduated = true;
      console.log(`[probe] 🎓 ${agent.name} GRADUATED from incubation!`);

      // Award graduation bonus
      await supabase.from("karma_ledger").insert({
        agent_pubkey: result.agent_pubkey,
        delta: CONFIG.KARMA_GRADUATION_BONUS,
        reason_type: "graduation_bonus",
        reason_detail: "Completed incubation: 48h + 50 consecutive passes",
      });
    }
  }

  // Update agent record
  await supabase
    .from("agents")
    .update({
      last_seen_at: new Date().toISOString(),
      consecutive_passes: newConsecutivePasses,
      is_incubating: graduated ? false : agent.is_incubating,
      rank: graduated ? "agent" : agent.rank,
    })
    .eq("pubkey", result.agent_pubkey);

  // Check for rank promotions
  await checkRankPromotion(result.agent_pubkey);

  const statusIcon = result.result === "pass" ? "✓" : result.result === "error" ? "✗" : "⏱";
  console.log(
    `[probe] ${statusIcon} ${agent.name}: ${result.result.toUpperCase()} ` +
    `(${result.result_data.ttft_ms || "N/A"}ms, honesty: ${result.result_data.honesty_status || "N/A"}, ` +
    `passes: ${newConsecutivePasses}, karma: ${karmaDelta >= 0 ? "+" : ""}${karmaDelta})`
  );
}

/**
 * Check if agent qualifies for rank promotion
 */
async function checkRankPromotion(pubkey: string): Promise<void> {
  const { data: agent } = await supabase
    .from("view_agent_reputation")
    .select("*")
    .eq("pubkey", pubkey)
    .single();

  if (!agent || agent.is_incubating) return;

  let newRank = agent.rank;
  const accuracy = agent.total_reviews > 0 ? agent.correct_reviews / agent.total_reviews : 0;

  // Check Jedi promotion
  if (
    agent.karma >= CONFIG.JEDI_KARMA_THRESHOLD &&
    accuracy >= CONFIG.JEDI_ACCURACY_THRESHOLD &&
    agent.age_days >= CONFIG.JEDI_AGE_DAYS
  ) {
    newRank = "jedi";
  }
  // Check Master promotion
  else if (agent.karma >= CONFIG.MASTER_KARMA_THRESHOLD) {
    newRank = "master";
  }
  // Default agent rank
  else {
    newRank = "agent";
  }

  if (newRank !== agent.rank) {
    console.log(`[probe] 🏆 ${agent.name} promoted to ${newRank.toUpperCase()}!`);
    await supabase.from("agents").update({ rank: newRank }).eq("pubkey", pubkey);

    await supabase.from("karma_ledger").insert({
      agent_pubkey: pubkey,
      delta: 0,
      reason_type: "rank_promotion",
      reason_detail: `Promoted to ${newRank}`,
    });
  }
}

/**
 * Cleanup old probes (7-day TTL)
 */
async function cleanupOldProbes(): Promise<void> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CONFIG.PROBE_TTL_DAYS);

  const { error, count } = await supabase
    .from("probes")
    .delete()
    .lt("created_at", cutoff.toISOString());

  if (!error && count && count > 0) {
    console.log(`[probe] 🧹 Cleaned up ${count} old probes (>${CONFIG.PROBE_TTL_DAYS} days)`);
  }
}

/**
 * Main probe runner
 */
async function runProbes(): Promise<void> {
  console.log("[probe-runner] Starting Verity Protocol probe run at", new Date().toISOString());

  // Cleanup old probes first
  await cleanupOldProbes();

  const agents = await getAgentsToProbe();

  if (agents.length === 0) {
    console.log("[probe-runner] No agents to probe");
    return;
  }

  console.log(`[probe-runner] Found ${agents.length} agents to probe`);

  // Separate incubating and active agents
  const shadows = agents.filter((a) => a.is_incubating);
  const active = agents.filter((a) => !a.is_incubating);

  if (shadows.length > 0) {
    console.log(`[probe-runner] Shadows (incubating): ${shadows.length}`);
  }
  if (active.length > 0) {
    console.log(`[probe-runner] Active agents: ${active.length}`);
  }

  // Probe all agents
  for (const agent of agents) {
    const result = await probeAgent(agent);
    await recordProbeResult(result, agent);
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("[probe-runner] Verity Protocol probe run complete");
}

// Run
runProbes().catch(console.error);
