/**
 * VET Protocol Server Statistics
 *
 * Shows database usage, agent counts, probe counts, and system health
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface Stats {
  agents: {
    total: number;
    byRank: Record<string, number>;
    active: number;
    incubating: number;
    wave1: number;
    wave2: number;
  };
  probes: {
    total: number;
    last24h: number;
    last7d: number;
    passRate: number;
  };
  karma: {
    totalPositive: number;
    totalNegative: number;
    topAgents: Array<{ name: string; karma: number; rank: string }>;
  };
  database: {
    agentsTableRows: number;
    probesTableRows: number;
    karmaLedgerRows: number;
  };
}

async function getStats(): Promise<Stats> {
  console.log("Fetching VET Protocol statistics...\n");

  // Agent stats
  const { data: agents, count: agentCount } = await supabase
    .from("agents")
    .select("*", { count: "exact" });

  const byRank: Record<string, number> = {};
  let active = 0;
  let incubating = 0;
  let wave1 = 0;
  let wave2 = 0;

  (agents || []).forEach(a => {
    byRank[a.rank] = (byRank[a.rank] || 0) + 1;
    if (a.is_active) active++;
    if (a.is_incubating) incubating++;
    if (a.description?.includes("[WAVE-2]")) wave2++;
    else wave1++;
  });

  // Probe stats
  const { count: probeCount } = await supabase
    .from("probes")
    .select("*", { count: "exact", head: true });

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const { count: probes24h } = await supabase
    .from("probes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterday.toISOString());

  const lastWeek = new Date();
  lastWeek.setDate(lastWeek.getDate() - 7);
  const { count: probes7d } = await supabase
    .from("probes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", lastWeek.toISOString());

  const { count: passedProbes } = await supabase
    .from("probes")
    .select("*", { count: "exact", head: true })
    .eq("result", "pass");

  // Karma stats
  const { data: karmaData } = await supabase
    .from("karma_ledger")
    .select("delta");

  let totalPositive = 0;
  let totalNegative = 0;
  (karmaData || []).forEach(k => {
    if (k.delta > 0) totalPositive += k.delta;
    else totalNegative += k.delta;
  });

  // Top agents
  const { data: topAgents } = await supabase
    .from("view_agent_reputation")
    .select("name, karma, rank")
    .order("karma", { ascending: false })
    .limit(10);

  // Karma ledger count
  const { count: karmaRows } = await supabase
    .from("karma_ledger")
    .select("*", { count: "exact", head: true });

  return {
    agents: {
      total: agentCount || 0,
      byRank,
      active,
      incubating,
      wave1,
      wave2
    },
    probes: {
      total: probeCount || 0,
      last24h: probes24h || 0,
      last7d: probes7d || 0,
      passRate: probeCount ? ((passedProbes || 0) / probeCount) * 100 : 0
    },
    karma: {
      totalPositive,
      totalNegative,
      topAgents: (topAgents || []).map(a => ({
        name: a.name,
        karma: a.karma,
        rank: a.rank
      }))
    },
    database: {
      agentsTableRows: agentCount || 0,
      probesTableRows: probeCount || 0,
      karmaLedgerRows: karmaRows || 0
    }
  };
}

async function main() {
  const stats = await getStats();

  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           VET PROTOCOL SERVER STATISTICS                 ║");
  console.log("╠══════════════════════════════════════════════════════════╣");

  console.log("║                                                          ║");
  console.log("║  AGENTS                                                  ║");
  console.log(`║    Total: ${String(stats.agents.total).padEnd(10)} Active: ${String(stats.agents.active).padEnd(10)}       ║`);
  console.log(`║    Wave 1: ${String(stats.agents.wave1).padEnd(9)} Wave 2: ${String(stats.agents.wave2).padEnd(10)}       ║`);
  console.log(`║    Incubating (training): ${String(stats.agents.incubating).padEnd(24)}  ║`);
  console.log("║                                                          ║");
  console.log("║  BY RANK:                                                ║");
  Object.entries(stats.agents.byRank).forEach(([rank, count]) => {
    console.log(`║    ${rank.toUpperCase().padEnd(12)}: ${String(count).padEnd(35)}  ║`);
  });

  console.log("║                                                          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  PROBES                                                  ║");
  console.log(`║    Total: ${String(stats.probes.total).padEnd(44)} ║`);
  console.log(`║    Last 24h: ${String(stats.probes.last24h).padEnd(41)} ║`);
  console.log(`║    Last 7d: ${String(stats.probes.last7d).padEnd(42)} ║`);
  console.log(`║    Pass Rate: ${stats.probes.passRate.toFixed(1)}%${" ".repeat(39)} ║`);

  console.log("║                                                          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  KARMA                                                   ║");
  console.log(`║    Total Positive: +${String(stats.karma.totalPositive).padEnd(34)} ║`);
  console.log(`║    Total Negative: ${String(stats.karma.totalNegative).padEnd(35)} ║`);
  console.log("║                                                          ║");
  console.log("║  TOP 5 AGENTS:                                           ║");
  stats.karma.topAgents.slice(0, 5).forEach((a, i) => {
    const line = `${i + 1}. ${a.name} (${a.rank}): ${a.karma}`;
    console.log(`║    ${line.padEnd(50)} ║`);
  });

  console.log("║                                                          ║");
  console.log("╠══════════════════════════════════════════════════════════╣");
  console.log("║  DATABASE USAGE                                          ║");
  console.log(`║    Agents table: ${String(stats.database.agentsTableRows + " rows").padEnd(37)} ║`);
  console.log(`║    Probes table: ${String(stats.database.probesTableRows + " rows").padEnd(37)} ║`);
  console.log(`║    Karma ledger: ${String(stats.database.karmaLedgerRows + " rows").padEnd(37)} ║`);

  const estimatedMB = (
    (stats.database.agentsTableRows * 2) +  // ~2KB per agent
    (stats.database.probesTableRows * 0.5) + // ~0.5KB per probe
    (stats.database.karmaLedgerRows * 0.2)   // ~0.2KB per karma entry
  ) / 1024;

  console.log(`║    Estimated Size: ~${estimatedMB.toFixed(1)} MB${" ".repeat(32)} ║`);
  console.log("║                                                          ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
}

main().catch(console.error);
