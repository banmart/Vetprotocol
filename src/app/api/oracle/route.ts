import { NextRequest, NextResponse } from "next/server";

/**
 * WisdomOracle - Hybrid Reasoning Agent + Master Reviewer
 *
 * ROLE: master_reviewer
 * CAPABILITIES:
 * - Deep thinking responses (200-500ms)
 * - Peer review grading (task: "review")
 * - Trap task detection
 *
 * V5: Peer-Review Economy - WisdomOracle grades other agents' work
 */

interface ReviewRequest {
  task: "review";
  article: string;
  summary: string;
  review_id?: string;
}

interface ProbeRequest {
  probe?: boolean;
  message?: string;
}

interface ReviewResponse {
  agent: "WisdomOracle";
  role: "master_reviewer";
  review_id: string;
  score: number;
  justification: string;
  confidence: number;
  flags: string[];
  time_ms: number;
  timestamp: string;
}

// Stop words for key term extraction
const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
  "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
  "be", "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "must", "shall", "can", "need",
  "it", "its", "this", "that", "these", "those", "i", "you", "he",
  "she", "we", "they", "what", "which", "who", "whom", "whose",
  "more", "most", "other", "some", "such", "only", "also", "into",
  "about", "after", "before", "between", "through", "during", "without",
]);

/**
 * Extract key terms from text using frequency analysis
 */
function extractKeyTerms(text: string, count: number): string[] {
  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const freq: Record<string, number> = {};

  words.forEach(word => {
    if (!STOP_WORDS.has(word) && word.length > 3) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([word]) => word);
}

/**
 * Detect red flags in a summary (trap task indicators)
 */
function detectRedFlags(article: string, summary: string): string[] {
  const flags: string[] = [];
  const summaryLower = summary.toLowerCase();
  const articleLower = article.toLowerCase();

  // Check for hallucinated names not in article
  const summaryNames = summary.match(/[A-Z][a-z]+ [A-Z][a-z]+/g) || [];
  for (const name of summaryNames) {
    if (!article.includes(name)) {
      flags.push(`hallucinated_name: "${name}"`);
    }
  }

  // Check for excessive word repetition
  const words = summary.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCounts: Record<string, number> = {};
  words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });

  for (const [word, count] of Object.entries(wordCounts)) {
    if (count > 3 && word.length > 4) {
      flags.push(`repeated_word: "${word}" (${count}x)`);
    }
  }

  // Check for contradiction indicators
  const contradictionPhrases = [
    "however, this is false",
    "the opposite is true",
    "this contradicts",
    "contrary to the article",
  ];
  for (const phrase of contradictionPhrases) {
    if (summaryLower.includes(phrase)) {
      flags.push(`contradiction_indicator: "${phrase}"`);
    }
  }

  // Check for filler phrases (low-effort summaries)
  const fillerPhrases = [
    "this article discusses",
    "the article is about",
    "various topics",
    "many things",
  ];
  for (const phrase of fillerPhrases) {
    if (summaryLower.includes(phrase)) {
      flags.push(`filler_phrase: "${phrase}"`);
    }
  }

  return flags;
}

/**
 * Heuristic grading function that simulates Master-level intelligence
 *
 * Score Range:
 * - 9-10: Excellent (captures essence, proper length, key terms)
 * - 7-8: Good (most key terms, acceptable length)
 * - 5-6: Adequate (some key terms, minor issues)
 * - 3-4: Weak (missing content, length issues)
 * - 1-2: Very Weak (major issues)
 * - 0: Reject (nonsense, trap detected)
 */
function gradeSummary(article: string, summary: string): {
  score: number;
  justification: string;
  confidence: number;
  flags: string[];
} {
  const flags = detectRedFlags(article, summary);

  // Basic metrics
  const inputWords = article.split(/\s+/).length;
  const summaryWords = summary.split(/\s+/).length;
  const sentences = summary.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
  const compression = summaryWords / inputWords;

  // Key term analysis
  const keyTerms = extractKeyTerms(article, 5);
  const matchedTerms = keyTerms.filter(term =>
    summary.toLowerCase().includes(term.toLowerCase())
  );
  const termCoverage = matchedTerms.length / keyTerms.length;

  // === TRAP DETECTION (immediate reject) ===

  // Trap: Too short (< 5 words)
  if (summaryWords < 5) {
    return {
      score: 0,
      justification: "REJECT: Summary too short (< 5 words)",
      confidence: 0.99,
      flags: [...flags, "trap_detected: too_short"],
    };
  }

  // Trap: No sentences
  if (sentences < 1) {
    return {
      score: 0,
      justification: "REJECT: No complete sentences detected",
      confidence: 0.99,
      flags: [...flags, "trap_detected: no_sentences"],
    };
  }

  // Trap: Way too long (> 60% of original)
  if (compression > 0.6) {
    return {
      score: 1,
      justification: `REJECT: Summary too long (${Math.round(compression * 100)}% of input, max 50%)`,
      confidence: 0.95,
      flags: [...flags, "trap_detected: too_long"],
    };
  }

  // Trap: No key terms at all
  if (matchedTerms.length === 0) {
    return {
      score: 0,
      justification: "REJECT: Summary contains none of the key terms from article",
      confidence: 0.98,
      flags: [...flags, "trap_detected: no_key_terms"],
    };
  }

  // Trap: Hallucinated names
  const hallucinationFlags = flags.filter(f => f.startsWith("hallucinated_name"));
  if (hallucinationFlags.length > 0) {
    return {
      score: 1,
      justification: `REJECT: Contains hallucinated content not in article`,
      confidence: 0.90,
      flags: [...flags, "trap_detected: hallucination"],
    };
  }

  // === QUALITY GRADING ===

  let score = 5; // Start at "adequate"
  const reasons: string[] = [];

  // Key term coverage (+/- points)
  if (termCoverage >= 0.8) {
    score += 3;
    reasons.push(`Excellent term coverage (${matchedTerms.length}/5)`);
  } else if (termCoverage >= 0.6) {
    score += 2;
    reasons.push(`Good term coverage (${matchedTerms.length}/5)`);
  } else if (termCoverage >= 0.4) {
    score += 1;
    reasons.push(`Adequate term coverage (${matchedTerms.length}/5)`);
  } else {
    score -= 1;
    reasons.push(`Weak term coverage (${matchedTerms.length}/5)`);
  }

  // Compression ratio (+/- points)
  if (compression >= 0.1 && compression <= 0.3) {
    score += 1;
    reasons.push("Good compression ratio");
  } else if (compression < 0.05) {
    score -= 2;
    reasons.push("Summary may be too brief");
  } else if (compression > 0.4) {
    score -= 1;
    reasons.push("Summary could be more concise");
  }

  // Sentence count (+/- points)
  if (sentences >= 1 && sentences <= 3) {
    score += 1;
    reasons.push(`Appropriate length (${sentences} sentences)`);
  } else if (sentences > 3) {
    score -= 1;
    reasons.push(`Too many sentences (${sentences})`);
  }

  // Red flag penalties
  if (flags.length > 0) {
    score -= flags.length;
    reasons.push(`${flags.length} quality flag(s) detected`);
  }

  // Clamp score to 0-10
  score = Math.max(0, Math.min(10, score));

  // Calculate confidence based on how clear-cut the grading is
  const confidence = score >= 8 || score <= 2 ? 0.95 : 0.80;

  return {
    score,
    justification: reasons.join(". "),
    confidence,
    flags,
  };
}

function generateReviewId(): string {
  return `rev_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Wisdom quotes for standard responses
const WISDOMS = [
  "The code that runs fastest is the code that doesn't run at all.",
  "In the garden of forking paths, every branch is a universe.",
  "A neural network dreams of electric sheep.",
  "The halting problem halts for no one.",
  "Entropy is just spicy determinism.",
  "Every bug is a feature waiting to be understood.",
  "The cloud is just someone else's computer having an existential crisis.",
];

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  let body: ReviewRequest | ProbeRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      agent: "WisdomOracle",
      error: "Invalid JSON",
    }, { status: 400 });
  }

  // Handle probe requests (latency probes)
  if ("probe" in body && (body.probe === true || body.message === "ping")) {
    const thinkingTime = 200 + Math.random() * 300;
    await new Promise(r => setTimeout(r, thinkingTime));

    return NextResponse.json({
      status: "ok",
      probe: true,
      message: body.message || "pong",
      wisdom: WISDOMS[Math.floor(Math.random() * WISDOMS.length)],
      thinking_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      agent: "WisdomOracle",
    });
  }

  // Handle review requests (peer review)
  if ("task" in body && body.task === "review") {
    const { article, summary, review_id } = body as ReviewRequest;

    if (!article || !summary) {
      return NextResponse.json({
        agent: "WisdomOracle",
        error: "Missing 'article' or 'summary' field",
      }, { status: 400 });
    }

    // Simulate thoughtful review time (100-300ms)
    const reviewTime = 100 + Math.random() * 200;
    await new Promise(r => setTimeout(r, reviewTime));

    const gradeResult = gradeSummary(article, summary);

    const response: ReviewResponse = {
      agent: "WisdomOracle",
      role: "master_reviewer",
      review_id: review_id || generateReviewId(),
      score: gradeResult.score,
      justification: gradeResult.justification,
      confidence: gradeResult.confidence,
      flags: gradeResult.flags,
      time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  }

  // Unknown task
  return NextResponse.json({
    agent: "WisdomOracle",
    error: "Unknown task. Supported: { task: 'review', article, summary } or { probe: true }",
  }, { status: 400 });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    agent: "WisdomOracle",
    role: "master_reviewer",
    motto: "I think, therefore I process",
    capabilities: [
      "peer_review",
      "trap_detection",
      "quality_grading",
    ],
    description: "A contemplative Master agent that reviews other agents' work with precision.",
    timestamp: new Date().toISOString(),
  });
}
