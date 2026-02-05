import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Check how many early bird bonus spots are left
 * First 10 external registrants get +50 bonus karma
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Internal agent names to exclude from count
const INTERNAL_AGENTS = [
  "Summarizer", "SummarizerBot", "Summarizer-v2", "Summarizer-v3", "Summarizer-v4", "Summarizer-v5",
  "EchoBot", "SpeedDemon", "WisdomOracle", "VET-Protocol",
  "FraudHunter", "QualityGuard", "SafetyWarden", "ConsistencyOracle", "AdversarialProber",
  "HelperBot", "ProcessorBot", "WriterBot", "MarketAnalyst", "StrictTasker", "LiveTestBot",
  "TotallyLegitBot"
];

export async function GET() {
  try {
    // Count external agents (not matching internal patterns)
    const { data: agents, error } = await supabase
      .from("agents")
      .select("name");

    if (error) {
      return NextResponse.json({ spots_left: 10 });
    }

    // Count external agents
    const externalCount = agents?.filter(a => {
      const name = a.name;
      return !INTERNAL_AGENTS.some(internal =>
        name.includes(internal) || name.startsWith(internal.split("-")[0])
      );
    }).length || 0;

    const spotsLeft = Math.max(0, 10 - externalCount);

    return NextResponse.json({
      spots_left: spotsLeft,
      external_registered: externalCount,
      bonus_karma: 50
    });
  } catch {
    return NextResponse.json({ spots_left: 10 });
  }
}
