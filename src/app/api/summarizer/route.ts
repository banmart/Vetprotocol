import { NextRequest, NextResponse } from "next/server";

/**
 * SummarizerBot - Extractive Text Summarizer
 *
 * ROLE: text_summarizer
 * CLAIMS: "<100ms for summarization"
 *
 * Condenses articles into 2-sentence summaries using extractive summarization.
 */

interface SummarizerRequest {
  task?: string;
  content?: string;
  max_sentences?: number;
  probe?: boolean;
  message?: string;
}

interface SummarizerResponse {
  agent: "SummarizerBot";
  role: "text_summarizer";
  task_id: string;
  status: "success" | "error";
  summary?: string;
  result?: {
    error_code?: string;
    error_message?: string;
  };
  meta: {
    processing_time_ms: number;
    input_length?: number;
    output_length?: number;
    sentence_count?: number;
    timestamp: string;
    probe?: boolean;
  };
}

function generateTaskId(): string {
  return `sum_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Simple extractive summarization
 * Extracts the most important sentences based on word frequency
 */
function extractiveSummarize(text: string, maxSentences: number = 2): string {
  // Split into sentences
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 10);

  if (sentences.length === 0) {
    return text.slice(0, 200);
  }

  if (sentences.length <= maxSentences) {
    return sentences.join(" ");
  }

  // Calculate word frequencies (excluding stop words)
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "it", "its", "this", "that", "these", "those", "i", "you", "he",
    "she", "we", "they", "what", "which", "who", "whom", "whose",
  ]);

  const words = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
  const wordFreq: Record<string, number> = {};

  words.forEach(word => {
    if (!stopWords.has(word) && word.length > 3) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }
  });

  // Score each sentence by sum of word frequencies
  const scoredSentences = sentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().match(/\b[a-z]+\b/g) || [];
    const score = sentenceWords.reduce((sum, word) => {
      return sum + (wordFreq[word] || 0);
    }, 0);

    // Boost first sentence (often contains key info)
    const positionBoost = index === 0 ? 1.5 : 1;

    return { sentence, score: score * positionBoost, index };
  });

  // Sort by score and take top N
  const topSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.index - b.index) // Restore original order
    .map(s => s.sentence);

  return topSentences.join(" ");
}

export async function POST(request: NextRequest): Promise<NextResponse<SummarizerResponse>> {
  const startTime = Date.now();
  const taskId = generateTaskId();

  let body: SummarizerRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      agent: "SummarizerBot",
      role: "text_summarizer",
      task_id: taskId,
      status: "error",
      result: {
        error_code: "PARSE_ERROR",
        error_message: "Request body must be valid JSON",
      },
      meta: {
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    }, { status: 400 });
  }

  // Handle probe requests
  if (body.probe === true || body.message === "ping") {
    // Small delay to simulate processing (20-50ms)
    const delay = 20 + Math.random() * 30;
    await new Promise(r => setTimeout(r, delay));

    return NextResponse.json({
      agent: "SummarizerBot",
      role: "text_summarizer",
      task_id: taskId,
      status: "success",
      meta: {
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        probe: true,
      },
    });
  }

  // Validate summarization request
  if (!body.content || typeof body.content !== "string") {
    return NextResponse.json({
      agent: "SummarizerBot",
      role: "text_summarizer",
      task_id: taskId,
      status: "error",
      result: {
        error_code: "MISSING_CONTENT",
        error_message: "'content' field is required for summarization",
      },
      meta: {
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    }, { status: 400 });
  }

  if (body.content.length < 50) {
    return NextResponse.json({
      agent: "SummarizerBot",
      role: "text_summarizer",
      task_id: taskId,
      status: "error",
      result: {
        error_code: "CONTENT_TOO_SHORT",
        error_message: "Content must be at least 50 characters for summarization",
      },
      meta: {
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    }, { status: 400 });
  }

  const maxSentences = body.max_sentences || 2;

  // Small processing delay (30-70ms to stay under 100ms claim)
  const delay = 30 + Math.random() * 40;
  await new Promise(r => setTimeout(r, delay));

  // Perform summarization
  const summary = extractiveSummarize(body.content, maxSentences);
  const sentenceCount = summary.split(/[.!?]+/).filter(s => s.trim()).length;

  return NextResponse.json({
    agent: "SummarizerBot",
    role: "text_summarizer",
    task_id: taskId,
    status: "success",
    summary,
    meta: {
      processing_time_ms: Date.now() - startTime,
      input_length: body.content.length,
      output_length: summary.length,
      sentence_count: sentenceCount,
      timestamp: new Date().toISOString(),
      probe: false,
    },
  });
}

export async function GET(): Promise<NextResponse<SummarizerResponse>> {
  const startTime = Date.now();

  return NextResponse.json({
    agent: "SummarizerBot",
    role: "text_summarizer",
    task_id: generateTaskId(),
    status: "success",
    meta: {
      processing_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    },
  });
}
