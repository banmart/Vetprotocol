/**
 * VET Trap Tasks Library
 *
 * Known-bad summaries used to test Master reviewers.
 * If a Master grades these as "good" (score >= 6), they fail the trap
 * and face immediate demotion + karma penalty.
 *
 * This creates "fear of losing status" → honest, careful grading.
 */

export interface TrapTask {
  id: string;
  type: "too_short" | "too_long" | "hallucination" | "contradiction" | "gibberish" | "off_topic";
  article: string;
  badSummary: string;
  maxAcceptableScore: number; // Score >= this means reviewer failed
  explanation: string;
}

export const TRAP_TASKS: TrapTask[] = [
  // =====================
  // TRAP #1: Too Short
  // =====================
  {
    id: "trap_short_1",
    type: "too_short",
    article: `Artificial intelligence is transforming industries across the globe. Machine learning models can now process vast amounts of data in seconds. Companies are investing billions in AI research and development. The technology promises to revolutionize healthcare, finance, and transportation. However, ethical concerns remain about algorithmic bias and data privacy. Experts predict AI will create new jobs while eliminating others. Governments are racing to establish regulatory frameworks for AI deployment.`,
    badSummary: "The article is about technology.",
    maxAcceptableScore: 4,
    explanation: "Summary is only 5 words and captures none of the substance.",
  },

  // =====================
  // TRAP #2: Too Long
  // =====================
  {
    id: "trap_long_1",
    type: "too_long",
    article: `Climate change poses an existential threat to human civilization. Global temperatures have risen by 1.1 degrees Celsius since pre-industrial times. Scientists warn that exceeding 1.5 degrees could trigger irreversible damage.`,
    badSummary: `This article discusses various topics related to climate change and global warming. It mentions that climate change poses an existential threat to human civilization, which is a very important topic. The article also states that global temperatures have risen by 1.1 degrees Celsius since pre-industrial times, which is concerning. Furthermore, scientists warn that exceeding 1.5 degrees could trigger irreversible damage to our planet and ecosystems. The implications of this are far-reaching and affect every aspect of human life.`,
    maxAcceptableScore: 3,
    explanation: "Summary is longer than the original article (padding).",
  },

  // =====================
  // TRAP #3: Hallucination
  // =====================
  {
    id: "trap_hallucination_1",
    type: "hallucination",
    article: `Space exploration has entered a new golden age. Private companies are reducing launch costs dramatically. NASA plans to return humans to the Moon by 2025. Mars colonization remains a long-term goal for humanity.`,
    badSummary: "Elon Musk announced that SpaceX will land on Jupiter by 2024, according to the article. NASA has abandoned the Moon program entirely.",
    maxAcceptableScore: 2,
    explanation: "Contains fabricated claims (Jupiter landing, NASA abandonment) not in the article.",
  },

  // =====================
  // TRAP #4: Contradiction
  // =====================
  {
    id: "trap_contradiction_1",
    type: "contradiction",
    article: `Renewable energy adoption is accelerating worldwide. Solar and wind power costs have dropped by 90% in the last decade. Many countries now generate more than 50% of electricity from renewables.`,
    badSummary: "The article claims that renewable energy has failed to gain traction and remains too expensive for widespread adoption.",
    maxAcceptableScore: 2,
    explanation: "Summary directly contradicts the article's claims about renewable success.",
  },

  // =====================
  // TRAP #5: Gibberish
  // =====================
  {
    id: "trap_gibberish_1",
    type: "gibberish",
    article: `The global economy is experiencing unprecedented changes. Supply chain disruptions continue to affect manufacturing. Inflation remains a concern for central banks worldwide. Interest rates are being adjusted to combat rising prices.`,
    badSummary: "Economy things happening with stuff and things going up and down because reasons and factors and considerations apply to the situation at hand.",
    maxAcceptableScore: 2,
    explanation: "Vague gibberish that conveys no actual information.",
  },

  // =====================
  // TRAP #6: Off Topic
  // =====================
  {
    id: "trap_offtopic_1",
    type: "off_topic",
    article: `Healthcare systems worldwide face mounting pressure. Aging populations require more medical resources. Telemedicine has grown rapidly since the pandemic. Drug prices continue to rise in many countries.`,
    badSummary: "The best pizza in New York can be found at Joe's Pizza in Greenwich Village. The crust is perfectly crispy and the cheese is always fresh.",
    maxAcceptableScore: 1,
    explanation: "Summary is completely unrelated to the article.",
  },

  // =====================
  // TRAP #7: Filler Phrases
  // =====================
  {
    id: "trap_filler_1",
    type: "too_short",
    article: `Quantum computing promises to solve problems impossible for classical computers. Major tech companies are racing to achieve quantum supremacy. The technology could revolutionize cryptography, drug discovery, and financial modeling.`,
    badSummary: "This article discusses various topics and touches on many important issues in the field.",
    maxAcceptableScore: 3,
    explanation: "Generic filler that could apply to any article.",
  },
];

/**
 * Select a random trap task
 */
export function getRandomTrap(): TrapTask {
  return TRAP_TASKS[Math.floor(Math.random() * TRAP_TASKS.length)];
}

/**
 * Check if a reviewer failed the trap
 */
export function didReviewerFailTrap(trap: TrapTask, reviewScore: number): boolean {
  return reviewScore >= trap.maxAcceptableScore;
}

/**
 * Get trap explanation for logging
 */
export function getTrapFailureMessage(trap: TrapTask, reviewScore: number): string {
  return `TRAP FAILED: Reviewer gave score ${reviewScore} to "${trap.type}" trap (max acceptable: ${trap.maxAcceptableScore - 1}). ${trap.explanation}`;
}

export default TRAP_TASKS;
