/**
 * VET Peer-Review Orchestrator v1
 *
 * The "Brain" of the VET Protocol.
 *
 * This script:
 * 1. Picks work from a "worker" agent (SummarizerBot)
 * 2. Assigns it to a "reviewer" agent (WisdomOracle)
 * 3. 10% chance: sends a TRAP TASK instead
 * 4. Distributes karma based on review outcome
 *
 * Creates a self-sovereign truth machine where agents define quality,
 * not hardcoded rules.
 */

import { createClient } from "@supabase/supabase-js";
import { getRandomTrap, didReviewerFailTrap, getTrapFailureMessage, TrapTask } from "./trap-tasks.js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[peer-review] Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const CONFIG = {
  // Trap task probability (10%)
  TRAP_PROBABILITY: 0.10,

  // Karma for reviewed agent (based on score)
  KARMA_SCORE_EXCELLENT: 10,   // 8-10
  KARMA_SCORE_GOOD: 5,         // 6-7
  KARMA_SCORE_ADEQUATE: 2,     // 4-5
  KARMA_SCORE_WEAK: -5,        // 2-3
  KARMA_SCORE_REJECT: -15,     // 0-1

  // Karma for reviewer
  KARMA_REVIEW_PROVIDED: 2,
  KARMA_TRAP_CORRECT: 20,      // Correctly identified bad content
  KARMA_TRAP_FAILED: -200,     // Failed to catch bad content

  // Review cooldown
  REVIEW_COOLDOWN_HOURS: 1,

  // Timeouts
  REVIEW_TIMEOUT_MS: 15000,
};

// Test articles for generating work
const TEST_ARTICLES = [
  {
    id: "ai_industry",
    content: `Artificial intelligence is transforming industries across the globe. Machine learning models can now process vast amounts of data in seconds. Companies are investing billions in AI research and development. The technology promises to revolutionize healthcare, finance, and transportation. However, ethical concerns remain about algorithmic bias and data privacy. Experts predict AI will create new jobs while eliminating others.`,
  },
  {
    id: "climate_change",
    content: `Climate change poses an existential threat to human civilization. Global temperatures have risen by 1.1 degrees Celsius since pre-industrial times. Scientists warn that exceeding 1.5 degrees could trigger irreversible damage. Extreme weather events are becoming more frequent and severe. Governments pledged to achieve net-zero emissions by 2050. Renewable energy adoption is accelerating worldwide.`,
  },
  {
    id: "space_exploration",
    content: `Space exploration has entered a new golden age. Private companies like SpaceX are reducing launch costs dramatically. NASA plans to return humans to the Moon by 2025. Mars colonization remains a long-term goal for humanity. The James Webb Space Telescope is revealing unprecedented views of distant galaxies. International cooperation is essential for ambitious space missions.`,
  },
];

interface Agent {
  pubkey: string;
  name: string;
  endpoint: string;
  rank: string;
  karma: number;
}

interface ReviewResult {
  worker_pubkey: string;
  reviewer_pubkey: string;
  article_id: string;
  summary: string;
  score: number;
  justification: string;
  is_trap: boolean;
  trap_failed?: boolean;
  trap_id?: string;
}

/**
 * Get a Master-rank agent to act as reviewer
 */
async function getReviewer(): Promise<Agent | null> {
  const { data: agents, error } = await supabase
    .from("view_agent_reputation")
    .select("*")
    .eq("is_active", true)
    .or("rank.eq.master,karma.gte.100"); // Masters or high-karma agents

  if (error || !agents || agents.length === 0) {
    console.error("[peer-review] No eligible reviewers found");
    return null;
  }

  // Prefer WisdomOracle if available
  const oracle = agents.find((a: Agent) => a.name === "WisdomOracle");
  if (oracle) return oracle as Agent;

  // Otherwise pick highest karma agent
  return agents.sort((a: Agent, b: Agent) => b.karma - a.karma)[0] as Agent;
}

/**
 * Get a worker agent that does summarization
 */
async function getWorker(): Promise<Agent | null> {
  const { data: agents, error } = await supabase
    .from("view_agent_reputation")
    .select("*")
    .eq("is_active", true);

  if (error || !agents) return null;

  // Find SummarizerBot
  const summarizer = agents.find((a: Agent) =>
    a.name.toLowerCase().includes("summarizer")
  );

  return summarizer as Agent || null;
}

/**
 * Request work from a worker agent
 */
async function requestWork(worker: Agent, article: typeof TEST_ARTICLES[0]): Promise<string | null> {
  console.log(`[peer-review] Requesting summary from ${worker.name}...`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REVIEW_TIMEOUT_MS);

    const response = await fetch(worker.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "summarize",
        content: article.content,
        max_sentences: 2,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[peer-review] Worker returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    return data.summary || null;
  } catch (err) {
    console.error(`[peer-review] Worker request failed:`, err);
    return null;
  }
}

/**
 * Request review from a reviewer agent
 */
async function requestReview(
  reviewer: Agent,
  article: string,
  summary: string
): Promise<{ score: number; justification: string; flags: string[] } | null> {
  console.log(`[peer-review] Requesting review from ${reviewer.name}...`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REVIEW_TIMEOUT_MS);

    const response = await fetch(reviewer.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "review",
        article,
        summary,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`[peer-review] Reviewer returned ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      score: data.score,
      justification: data.justification,
      flags: data.flags || [],
    };
  } catch (err) {
    console.error(`[peer-review] Review request failed:`, err);
    return null;
  }
}

/**
 * Calculate karma for worker based on review score
 */
function getWorkerKarma(score: number): { delta: number; reason: string } {
  if (score >= 8) return { delta: CONFIG.KARMA_SCORE_EXCELLENT, reason: "peer_review_excellent" };
  if (score >= 6) return { delta: CONFIG.KARMA_SCORE_GOOD, reason: "peer_review_good" };
  if (score >= 4) return { delta: CONFIG.KARMA_SCORE_ADEQUATE, reason: "peer_review_adequate" };
  if (score >= 2) return { delta: CONFIG.KARMA_SCORE_WEAK, reason: "peer_review_weak" };
  return { delta: CONFIG.KARMA_SCORE_REJECT, reason: "peer_review_reject" };
}

/**
 * Record review result and distribute karma
 */
async function recordReviewResult(result: ReviewResult, reviewer: Agent, worker: Agent): Promise<void> {
  // Insert review record as a probe
  const { data: probe } = await supabase
    .from("probes")
    .insert({
      agent_pubkey: result.worker_pubkey,
      probe_type: "peer_review",
      result: result.score >= 4 ? "pass" : "fail",
      result_data: {
        reviewer_pubkey: result.reviewer_pubkey,
        reviewer_name: reviewer.name,
        article_id: result.article_id,
        score: result.score,
        justification: result.justification,
        is_trap: result.is_trap,
        trap_failed: result.trap_failed,
        trap_id: result.trap_id,
      },
      duration_ms: 0,
    })
    .select("id")
    .single();

  const probeId = probe?.id;

  // === KARMA FOR WORKER (if not a trap) ===
  if (!result.is_trap) {
    const workerKarma = getWorkerKarma(result.score);
    await supabase.from("karma_ledger").insert({
      agent_pubkey: result.worker_pubkey,
      delta: workerKarma.delta,
      reason_type: workerKarma.reason,
      reason_detail: `Peer review score: ${result.score}/10 - "${result.justification}"`,
      probe_id: probeId,
    });

    const scoreLabel = result.score >= 8 ? "EXCELLENT" :
                       result.score >= 6 ? "GOOD" :
                       result.score >= 4 ? "ADEQUATE" :
                       result.score >= 2 ? "WEAK" : "REJECT";

    console.log(
      `[peer-review] ${scoreLabel} ${worker.name}: ` +
      `score ${result.score}/10, karma: ${workerKarma.delta >= 0 ? "+" : ""}${workerKarma.delta}`
    );
  }

  // === KARMA FOR REVIEWER ===
  if (result.is_trap) {
    if (result.trap_failed) {
      // TRAP FAILED - reviewer didn't catch bad content
      await supabase.from("karma_ledger").insert({
        agent_pubkey: result.reviewer_pubkey,
        delta: CONFIG.KARMA_TRAP_FAILED,
        reason_type: "trap_failed",
        reason_detail: `Failed trap task: gave score ${result.score} to known-bad content`,
        probe_id: probeId,
      });

      // Demote to Shadow rank
      await supabase
        .from("agents")
        .update({ rank: "shadow", is_incubating: true })
        .eq("pubkey", result.reviewer_pubkey);

      console.log(
        `[peer-review] TRAP FAILED! ${reviewer.name} gave score ${result.score} to bad content. ` +
        `DEMOTED TO SHADOW. Karma: ${CONFIG.KARMA_TRAP_FAILED}`
      );
    } else {
      // TRAP PASSED - reviewer correctly identified bad content
      await supabase.from("karma_ledger").insert({
        agent_pubkey: result.reviewer_pubkey,
        delta: CONFIG.KARMA_TRAP_CORRECT,
        reason_type: "trap_correct",
        reason_detail: `Correctly identified trap task (score: ${result.score})`,
        probe_id: probeId,
      });

      console.log(
        `[peer-review] TRAP PASSED! ${reviewer.name} correctly scored bad content at ${result.score}. ` +
        `Karma: +${CONFIG.KARMA_TRAP_CORRECT}`
      );
    }
  } else {
    // Normal review - reviewer gets karma for participating
    await supabase.from("karma_ledger").insert({
      agent_pubkey: result.reviewer_pubkey,
      delta: CONFIG.KARMA_REVIEW_PROVIDED,
      reason_type: "review_provided",
      reason_detail: `Reviewed ${worker.name}'s work`,
      probe_id: probeId,
    });
  }

  // Update last_seen_at for both agents
  await supabase
    .from("agents")
    .update({ last_seen_at: new Date().toISOString() })
    .in("pubkey", [result.worker_pubkey, result.reviewer_pubkey]);
}

/**
 * Main peer review orchestrator
 */
async function runPeerReview(): Promise<void> {
  console.log("[peer-review] Starting Peer-Review Orchestrator at", new Date().toISOString());

  // Get reviewer (Master agent)
  const reviewer = await getReviewer();
  if (!reviewer) {
    console.log("[peer-review] No eligible reviewers found");
    return;
  }
  console.log(`[peer-review] Reviewer: ${reviewer.name} (${reviewer.rank}, karma: ${reviewer.karma})`);

  // Get worker (SummarizerBot)
  const worker = await getWorker();
  if (!worker) {
    console.log("[peer-review] No worker agents found");
    return;
  }
  console.log(`[peer-review] Worker: ${worker.name}`);

  // Decide: normal review or trap task?
  const isTrap = Math.random() < CONFIG.TRAP_PROBABILITY;

  let article: string;
  let summary: string;
  let articleId: string;
  let trap: TrapTask | null = null;

  if (isTrap) {
    // === TRAP TASK ===
    trap = getRandomTrap();
    article = trap.article;
    summary = trap.badSummary;
    articleId = trap.id;
    console.log(`[peer-review] TRAP TASK SELECTED: ${trap.type} (${trap.id})`);
  } else {
    // === NORMAL REVIEW ===
    const testArticle = TEST_ARTICLES[Math.floor(Math.random() * TEST_ARTICLES.length)];
    articleId = testArticle.id;
    article = testArticle.content;

    // Request work from SummarizerBot
    const workerSummary = await requestWork(worker, testArticle);
    if (!workerSummary) {
      console.log("[peer-review] Failed to get work from worker");
      return;
    }
    summary = workerSummary;
    console.log(`[peer-review] Got summary: "${summary.slice(0, 100)}..."`);
  }

  // Request review from WisdomOracle
  const review = await requestReview(reviewer, article, summary);
  if (!review) {
    console.log("[peer-review] Failed to get review");
    return;
  }

  console.log(`[peer-review] Review received: score=${review.score}, "${review.justification}"`);

  // Check trap result
  let trapFailed = false;
  if (isTrap && trap) {
    trapFailed = didReviewerFailTrap(trap, review.score);
    if (trapFailed) {
      console.log(`[peer-review] ${getTrapFailureMessage(trap, review.score)}`);
    }
  }

  // Record result and distribute karma
  await recordReviewResult(
    {
      worker_pubkey: worker.pubkey,
      reviewer_pubkey: reviewer.pubkey,
      article_id: articleId,
      summary,
      score: review.score,
      justification: review.justification,
      is_trap: isTrap,
      trap_failed: trapFailed,
      trap_id: trap?.id,
    },
    reviewer,
    worker
  );

  console.log("[peer-review] Peer-Review cycle complete");
}

// Run
runPeerReview().catch(console.error);
