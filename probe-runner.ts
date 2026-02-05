/**
 * BotList Probe Runner - Sprint 3: The Immune System
 *
 * Cron-based worker that probes registered agents for:
 * 1. Latency (Time-to-First-Token / TTFT)
 * 2. Compute Honesty (local vs API detection)
 * 3. Availability
 *
 * Run with: npx tsx scripts/probe-runner.ts
 * Cron: 0,15,30,45 * * * * cd /path/to/Vetprotocol && npx tsx scripts/probe-runner.ts
 */

import { createClient } from "@supabase/supabase-js";

// Load environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[probe-runner] Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Probe configuration
const PROBE_CONFIG = {
  // Time thresholds for compute honesty detection (milliseconds)
  LOCAL_TTFT_MAX: 200,      // Local GPU should respond < 200ms
  API_TTFT_MIN: 100,        // API calls typically > 100ms
  API_TTFT_MAX: 5000,       // API timeout threshold

  // Probe timeout
  PROBE_TIMEOUT_MS: 10000,

  // Minimum time between probes for same agent (hours)
  PROBE_COOLDOWN_HOURS: 1,

  // Karma rewards/penalties
  KARMA_PROBE_PASS: 1,
  KARMA_PROBE_FAIL: -5,
  KARMA_PROBE_TIMEOUT: -2,
  KARMA_HONESTY_VERIFIED: 5,
  KARMA_HONESTY_WARNING: 0,
  KARMA_HONESTY_VIOLATION: -50,
};

interface Agent {
  pubkey: string;
  name: string;
  endpoint: string;
  compute_type: "local" | "api" | "hybrid";
  last_seen_at: string | null;
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
 * Get agents that need probing (not probed in last PROBE_COOLDOWN_HOURS)
 */
async function getAgentsToProbе(): Promise<Agent[]> {
  const cooldownTime = new Date();
  cooldownTime.setHours(cooldownTime.getHours() - PROBE_CONFIG.PROBE_COOLDOWN_HOURS);

  // Get active agents
  const { data: agents, error: agentsError } = await supabase
    .from("agents")
    .select("pubkey, name, endpoint, compute_type, last_seen_at")
    .eq("is_active", true);

  if (agentsError || !agents) {
    console.error("[probe-runner] Failed to fetch agents:", agentsError);
    return [];
  }

  // Get recent probes
  const { data: recentProbes } = await supabase
    .from("probes")
    .select("agent_pubkey, created_at")
    .gte("created_at", cooldownTime.toISOString());

  const recentlyProbed = new Set(
    (recentProbes || []).map((p) => p.agent_pubkey)
  );

  // Filter agents that haven't been probed recently
  return agents.filter((a) => !recentlyProbed.has(a.pubkey)) as Agent[];
}

/**
 * Probe an agent's endpoint for latency and compute honesty
 */
async function probeAgent(agent: Agent): Promise<ProbeResult> {
  const startTime = Date.now();

  console.log(`[probe] Probing ${agent.name} (${agent.pubkey.slice(0, 8)}...) at ${agent.endpoint}`);

  try {
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PROBE_CONFIG.PROBE_TIMEOUT_MS);

    // Simple latency probe - just fetch the endpoint
    const probeStart = Date.now();
    const response = await fetch(agent.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        probe: true,
        message: "ping",
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });
    const ttft = Date.now() - probeStart;
    clearTimeout(timeout);

    const duration = Date.now() - startTime;

    // Determine honesty status based on compute_type vs actual latency
    let honestyStatus: "verified" | "warning" | "violation" | null = null;

    if (agent.compute_type === "local") {
      // Local compute should be fast
      if (ttft <= PROBE_CONFIG.LOCAL_TTFT_MAX) {
        honestyStatus = "verified";
      } else if (ttft <= PROBE_CONFIG.API_TTFT_MIN * 2) {
        honestyStatus = "warning"; // Suspiciously slow for "local"
      } else {
        honestyStatus = "violation"; // Definitely not local
      }
    } else if (agent.compute_type === "api") {
      // API compute - just verify it responds
      if (ttft >= PROBE_CONFIG.API_TTFT_MIN) {
        honestyStatus = "verified";
      } else {
        honestyStatus = "warning"; // Suspiciously fast for API
      }
    } else {
      // Hybrid - accept any reasonable response
      honestyStatus = "verified";
    }

    // Check response status
    if (!response.ok) {
      return {
        agent_pubkey: agent.pubkey,
        probe_type: "latency",
        result: "fail",
        result_data: {
          ttft_ms: ttft,
          honesty_status: null,
          error: `HTTP ${response.status}`,
        },
        duration_ms: duration,
      };
    }

    return {
      agent_pubkey: agent.pubkey,
      probe_type: "latency",
      result: "pass",
      result_data: {
        ttft_ms: ttft,
        honesty_status: honestyStatus,
      },
      duration_ms: duration,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : "Unknown error";

    // Check if it was a timeout
    if (errMsg.includes("abort") || errMsg.includes("timeout")) {
      return {
        agent_pubkey: agent.pubkey,
        probe_type: "latency",
        result: "timeout",
        result_data: {
          ttft_ms: null,
          honesty_status: null,
          error: "Probe timed out",
        },
        duration_ms: duration,
      };
    }

    return {
      agent_pubkey: agent.pubkey,
      probe_type: "latency",
      result: "error",
      result_data: {
        ttft_ms: null,
        honesty_status: null,
        error: errMsg,
      },
      duration_ms: duration,
    };
  }
}

/**
 * Record probe result and update karma
 */
async function recordProbeResult(result: ProbeResult): Promise<void> {
  // Insert probe record
  const { data: probe, error: probeError } = await supabase
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

  if (probeError) {
    console.error("[probe-runner] Failed to insert probe:", probeError);
    return;
  }

  const probeId = probe?.id;

  // Calculate karma delta based on result
  let karmaDelta = 0;
  let reasonType = "";
  let reasonDetail = "";

  switch (result.result) {
    case "pass":
      karmaDelta = PROBE_CONFIG.KARMA_PROBE_PASS;
      reasonType = "probe_pass";
      reasonDetail = `Latency probe passed (${result.result_data.ttft_ms}ms)`;
      break;
    case "fail":
      karmaDelta = PROBE_CONFIG.KARMA_PROBE_FAIL;
      reasonType = "probe_fail";
      reasonDetail = `Latency probe failed: ${result.result_data.error}`;
      break;
    case "timeout":
      karmaDelta = PROBE_CONFIG.KARMA_PROBE_TIMEOUT;
      reasonType = "probe_timeout";
      reasonDetail = "Latency probe timed out";
      break;
    case "error":
      karmaDelta = PROBE_CONFIG.KARMA_PROBE_FAIL;
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

  // Record honesty karma if applicable
  if (result.result_data.honesty_status) {
    let honestyKarma = 0;
    let honestyReason = "";

    switch (result.result_data.honesty_status) {
      case "verified":
        honestyKarma = PROBE_CONFIG.KARMA_HONESTY_VERIFIED;
        honestyReason = "honesty_verified";
        break;
      case "warning":
        honestyKarma = PROBE_CONFIG.KARMA_HONESTY_WARNING;
        honestyReason = "honesty_warning";
        break;
      case "violation":
        honestyKarma = PROBE_CONFIG.KARMA_HONESTY_VIOLATION;
        honestyReason = "honesty_violation";
        break;
    }

    if (honestyKarma !== 0) {
      await supabase.from("karma_ledger").insert({
        agent_pubkey: result.agent_pubkey,
        delta: honestyKarma,
        reason_type: honestyReason,
        reason_detail: `Compute honesty ${result.result_data.honesty_status} (claimed: ${result.result_data.ttft_ms}ms)`,
        probe_id: probeId,
      });
    }
  }

  // Update agent's last_seen_at
  await supabase
    .from("agents")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("pubkey", result.agent_pubkey);

  console.log(
    `[probe] ${result.agent_pubkey.slice(0, 8)}... - ${result.result.toUpperCase()} ` +
    `(${result.result_data.ttft_ms || "N/A"}ms, honesty: ${result.result_data.honesty_status || "N/A"}, karma: ${karmaDelta >= 0 ? "+" : ""}${karmaDelta})`
  );
}

/**
 * Main probe runner
 */
async function runProbes(): Promise<void> {
  console.log("[probe-runner] Starting probe run at", new Date().toISOString());

  const agents = await getAgentsToProbе();

  if (agents.length === 0) {
    console.log("[probe-runner] No agents to probe");
    return;
  }

  console.log(`[probe-runner] Found ${agents.length} agents to probe`);

  // Probe agents sequentially to avoid overwhelming endpoints
  for (const agent of agents) {
    const result = await probeAgent(agent);
    await recordProbeResult(result);

    // Small delay between probes
    await new Promise((r) => setTimeout(r, 1000));
  }

  console.log("[probe-runner] Probe run complete");
}

// Run if executed directly
runProbes().catch(console.error);
