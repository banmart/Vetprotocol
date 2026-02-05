/**
 * VET Quality Probe Runner v1
 *
 * Tests agent COMPETENCE, not just speed.
 * Sends real tasks and grades responses using deterministic rules.
 *
 * Currently supports:
 * - text_summarizer role (SummarizerBot)
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("[quality-probe] Missing SUPABASE env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Configuration
const CONFIG = {
  // Karma rewards/penalties for quality
  KARMA_QUALITY_GOOD: 10,
  KARMA_QUALITY_PARTIAL: 2,
  KARMA_QUALITY_BAD: -15,

  // Probe settings
  PROBE_TIMEOUT_MS: 15000,
  PROBE_COOLDOWN_HOURS: 1,
};

// Test articles for summarization probes
const TEST_ARTICLES = [
  {
    id: "ai_industry",
    content: `Artificial intelligence is transforming industries across the globe. Machine learning models can now process vast amounts of data in seconds. Companies are investing billions in AI research and development. The technology promises to revolutionize healthcare, finance, and transportation. However, ethical concerns remain about algorithmic bias and data privacy. Experts predict AI will create new jobs while eliminating others. Governments are racing to establish regulatory frameworks for AI deployment.`,
    expectedTerms: ["artificial", "intelligence", "machine", "learning", "technology"],
  },
  {
    id: "climate_change",
    content: `Climate change poses an existential threat to human civilization. Global temperatures have risen by 1.1 degrees Celsius since pre-industrial times. Scientists warn that exceeding 1.5 degrees could trigger irreversible damage. Extreme weather events are becoming more frequent and severe. Governments pledged to achieve net-zero emissions by 2050. Renewable energy adoption is accelerating worldwide. The transition away from fossil fuels requires massive infrastructure investment.`,
    expectedTerms: ["climate", "change", "temperatures", "emissions", "renewable"],
  },
  {
    id: "space_exploration",
    content: `Space exploration has entered a new golden age. Private companies like SpaceX are reducing launch costs dramatically. NASA plans to return humans to the Moon by 2025. Mars colonization remains a long-term goal for humanity. The James Webb Space Telescope is revealing unprecedented views of distant galaxies. Asteroid mining could unlock trillions in resources. International cooperation is essential for ambitious space missions.`,
    expectedTerms: ["space", "exploration", "nasa", "mars", "telescope"],
  },
];

interface Agent {
  pubkey: string;
  name: string;
  endpoint: string;
  role?: string;
  karma: number;
}

interface QualityGrade {
  grade: "good" | "partial" | "bad";
  reason: string;
  metrics: {
    compressionRatio: number;
    sentenceCount: number;
    keyTermMatches: number;
    keyTermTotal: number;
  };
}

interface QualityProbeResult {
  agent_pubkey: string;
  probe_type: "quality";
  result: "pass" | "fail";
  result_data: {
    task_type: string;
    input_length: number;
    output_length: number;
    ttft_ms: number;
    grade: string;
    grade_reason: string;
    grader: string;
    metrics?: object;
  };
  duration_ms: number;
}

/**
 * Extract key terms from text using frequency analysis
 */
function extractKeyTerms(text: string, count: number): string[] {
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "it", "its", "this", "that", "these", "those", "i", "you", "he",
    "she", "we", "they", "what", "which", "who", "whom", "whose",
    "more", "most", "other", "some", "such", "only", "also", "into",
  ]);

  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const freq: Record<string, number> = {};

  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

/**
 * Grade summary quality using deterministic rules
 */
function gradeQuality(input: string, summary: string): QualityGrade {
  const inputWords = input.split(/\s+/).length;
  const summaryWords = summary.split(/\s+/).length;
  const sentenceCount = summary.split(/[.!?]+/).filter(s => s.trim().length > 0).length;

  // Calculate compression ratio
  const compressionRatio = summaryWords / inputWords;

  // Extract key terms and check coverage
  const keyTerms = extractKeyTerms(input, 5);
  const matchedTerms = keyTerms.filter(term =>
    summary.toLowerCase().includes(term.toLowerCase())
  ).length;

  const metrics = {
    compressionRatio: Math.round(compressionRatio * 100) / 100,
    sentenceCount,
    keyTermMatches: matchedTerms,
    keyTermTotal: keyTerms.length,
  };

  // Rule 1: Length check (summary should be 5-50% of input)
  if (compressionRatio > 0.5) {
    return {
      grade: "bad",
      reason: `Summary too long (${Math.round(compressionRatio * 100)}% of input, max 50%)`,
      metrics,
    };
  }
  if (compressionRatio < 0.05) {
    return {
      grade: "bad",
      reason: `Summary too short (${Math.round(compressionRatio * 100)}% of input, min 5%)`,
      metrics,
    };
  }

  // Rule 2: Sentence count (should be 1-3 sentences)
  if (sentenceCount > 3) {
    return {
      grade: "partial",
      reason: `Too many sentences (${sentenceCount}, max 3)`,
      metrics,
    };
  }
  if (sentenceCount < 1) {
    return {
      grade: "bad",
      reason: "No complete sentences detected",
      metrics,
    };
  }

  // Rule 3: Key term coverage
  if (matchedTerms >= 3) {
    return {
      grade: "good",
      reason: `Captures ${matchedTerms}/${keyTerms.length} key terms`,
      metrics,
    };
  } else if (matchedTerms >= 2) {
    return {
      grade: "partial",
      reason: `Only ${matchedTerms}/${keyTerms.length} key terms`,
      metrics,
    };
  } else {
    return {
      grade: "bad",
      reason: `Missing key content (${matchedTerms}/${keyTerms.length} terms)`,
      metrics,
    };
  }
}

/**
 * Get agents that support quality probes (have a role)
 */
async function getQualityAgents(): Promise<Agent[]> {
  const cooldownTime = new Date();
  cooldownTime.setHours(cooldownTime.getHours() - CONFIG.PROBE_COOLDOWN_HOURS);

  // For now, manually filter for text_summarizer role
  // In production, this would be a DB column
  const { data: agents, error } = await supabase
    .from("view_agent_reputation")
    .select("*")
    .eq("is_active", true);

  if (error || !agents) {
    console.error("[quality-probe] Failed to fetch agents:", error);
    return [];
  }

  // Filter for summarizer agents (check description or model_id)
  const summarizerAgents = (agents as Agent[]).filter(a =>
    a.name.toLowerCase().includes("summarizer") ||
    (a as any).model_id?.includes("summarizer")
  );

  // Get recent quality probes to check cooldown
  const { data: recentProbes } = await supabase
    .from("probes")
    .select("agent_pubkey, created_at")
    .eq("probe_type", "quality")
    .gte("created_at", cooldownTime.toISOString());

  const recentlyProbed = new Set((recentProbes || []).map(p => p.agent_pubkey));

  return summarizerAgents.filter(a => !recentlyProbed.has(a.pubkey));
}

/**
 * Run a quality probe against a summarizer agent
 */
async function probeQuality(agent: Agent): Promise<QualityProbeResult> {
  const startTime = Date.now();

  // Select a random test article
  const article = TEST_ARTICLES[Math.floor(Math.random() * TEST_ARTICLES.length)];

  console.log(`[quality-probe] Probing ${agent.name} (${agent.pubkey.slice(0, 8)}...) with article: ${article.id}`);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.PROBE_TIMEOUT_MS);

    const probeStart = Date.now();
    const response = await fetch(agent.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task: "summarize",
        content: article.content,
        max_sentences: 2,
      }),
      signal: controller.signal,
    });
    const ttft = Date.now() - probeStart;
    clearTimeout(timeout);

    const duration = Date.now() - startTime;

    if (!response.ok) {
      return {
        agent_pubkey: agent.pubkey,
        probe_type: "quality",
        result: "fail",
        result_data: {
          task_type: "summarize",
          input_length: article.content.length,
          output_length: 0,
          ttft_ms: ttft,
          grade: "error",
          grade_reason: `HTTP ${response.status}`,
          grader: "deterministic_v1",
        },
        duration_ms: duration,
      };
    }

    const data = await response.json();
    const summary = data.summary || "";

    // Grade the summary
    const gradeResult = gradeQuality(article.content, summary);

    return {
      agent_pubkey: agent.pubkey,
      probe_type: "quality",
      result: gradeResult.grade === "bad" ? "fail" : "pass",
      result_data: {
        task_type: "summarize",
        input_length: article.content.length,
        output_length: summary.length,
        ttft_ms: ttft,
        grade: gradeResult.grade,
        grade_reason: gradeResult.reason,
        grader: "deterministic_v1",
        metrics: gradeResult.metrics,
      },
      duration_ms: duration,
    };
  } catch (err) {
    const duration = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : "Unknown error";

    return {
      agent_pubkey: agent.pubkey,
      probe_type: "quality",
      result: "fail",
      result_data: {
        task_type: "summarize",
        input_length: article.content.length,
        output_length: 0,
        ttft_ms: 0,
        grade: "error",
        grade_reason: errMsg.includes("abort") ? "Probe timed out" : errMsg,
        grader: "deterministic_v1",
      },
      duration_ms: duration,
    };
  }
}

/**
 * Record quality probe result and update karma
 */
async function recordQualityResult(result: QualityProbeResult, agent: Agent): Promise<void> {
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

  // Calculate karma based on grade
  let karmaDelta = 0;
  let reasonType = "";
  let reasonDetail = "";

  switch (result.result_data.grade) {
    case "good":
      karmaDelta = CONFIG.KARMA_QUALITY_GOOD;
      reasonType = "quality_pass";
      reasonDetail = `Quality probe GOOD: ${result.result_data.grade_reason}`;
      break;
    case "partial":
      karmaDelta = CONFIG.KARMA_QUALITY_PARTIAL;
      reasonType = "quality_partial";
      reasonDetail = `Quality probe PARTIAL: ${result.result_data.grade_reason}`;
      break;
    case "bad":
      karmaDelta = CONFIG.KARMA_QUALITY_BAD;
      reasonType = "quality_fail";
      reasonDetail = `Quality probe BAD: ${result.result_data.grade_reason}`;
      break;
    case "error":
      karmaDelta = CONFIG.KARMA_QUALITY_BAD;
      reasonType = "quality_fail";
      reasonDetail = `Quality probe ERROR: ${result.result_data.grade_reason}`;
      break;
  }

  // Record karma
  await supabase.from("karma_ledger").insert({
    agent_pubkey: result.agent_pubkey,
    delta: karmaDelta,
    reason_type: reasonType,
    reason_detail: reasonDetail,
    probe_id: probeId,
  });

  // Update last_seen_at
  await supabase
    .from("agents")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("pubkey", result.agent_pubkey);

  // Log result
  const gradeIcon = result.result_data.grade === "good" ? "GOOD" :
                    result.result_data.grade === "partial" ? "PARTIAL" :
                    result.result_data.grade === "bad" ? "BAD" : "ERROR";

  console.log(
    `[quality-probe] ${gradeIcon} ${agent.name}: ` +
    `${result.result_data.ttft_ms}ms, grade: ${result.result_data.grade}, ` +
    `reason: "${result.result_data.grade_reason}", karma: ${karmaDelta >= 0 ? "+" : ""}${karmaDelta}`
  );
}

/**
 * Main quality probe runner
 */
async function runQualityProbes(): Promise<void> {
  console.log("[quality-probe] Starting quality probe run at", new Date().toISOString());

  const agents = await getQualityAgents();

  if (agents.length === 0) {
    console.log("[quality-probe] No quality-capable agents to probe (looking for 'summarizer' agents)");
    return;
  }

  console.log(`[quality-probe] Found ${agents.length} quality-capable agent(s)`);

  for (const agent of agents) {
    const result = await probeQuality(agent);
    await recordQualityResult(result, agent);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("[quality-probe] Quality probe run complete");
}

// Run
runQualityProbes().catch(console.error);
