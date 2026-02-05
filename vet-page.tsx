import { supabase } from "@/lib/supabase";

interface AgentReputation {
  pubkey: string;
  name: string;
  compute_type: "local" | "api" | "hybrid";
  endpoint: string;
  created_at: string;
  last_verified_at: string;
  is_active: boolean;
  karma: number;
  karma_events: number;
}

interface RecentProbe {
  id: number;
  agent_pubkey: string;
  probe_type: string;
  result: "pass" | "fail" | "timeout" | "error";
  result_data: {
    honesty_status?: string;
    ttft_ms?: number;
  };
  created_at: string;
  agent_name?: string;
}

async function getVerifiedAgents(): Promise<AgentReputation[]> {
  const { data, error } = await supabase
    .from("view_agent_reputation")
    .select("*")
    .eq("is_active", true)
    .order("karma", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[vet] Failed to fetch agents:", error);
    return [];
  }
  return (data || []) as AgentReputation[];
}

async function getRecentProbes(): Promise<RecentProbe[]> {
  const { data: probes, error } = await supabase
    .from("probes")
    .select("id, agent_pubkey, probe_type, result, result_data, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (error || !probes) return [];

  const pubkeys = [...new Set(probes.map((p) => p.agent_pubkey))];
  if (pubkeys.length === 0) return probes as RecentProbe[];

  const { data: agents } = await supabase
    .from("agents")
    .select("pubkey, name")
    .in("pubkey", pubkeys);

  const nameMap = new Map((agents || []).map((a) => [a.pubkey, a.name]));

  return probes.map((p) => ({
    ...p,
    agent_name: nameMap.get(p.agent_pubkey) || "Unknown",
  })) as RecentProbe[];
}

async function getPendingCount(): Promise<number> {
  // For now, count agents with low karma as "pending verification"
  const { data } = await supabase
    .from("view_agent_reputation")
    .select("karma")
    .eq("is_active", true)
    .lt("karma", 50);

  return data?.length || 0;
}

function truncatePubkey(pubkey: string): string {
  return pubkey.slice(0, 8) + "..." + pubkey.slice(-8);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return diffMins + "m ago";
  if (diffHours < 24) return diffHours + "h ago";
  return diffDays + "d ago";
}

function getResultColor(result: string): string {
  switch (result) {
    case "pass": return "text-green-700";
    case "fail": return "text-red-700";
    case "timeout": return "text-orange-600";
    default: return "text-gray-600";
  }
}

function getVetStatus(karma: number): { label: string; color: string; icon: string } {
  if (karma >= 500) return { label: "VET-MASTER", color: "text-purple-700 bg-purple-100", icon: "⚔️" };
  if (karma >= 100) return { label: "VERIFIED", color: "text-green-700 bg-green-100", icon: "✓" };
  if (karma >= 50) return { label: "TRUSTED", color: "text-blue-700 bg-blue-100", icon: "◐" };
  return { label: "PENDING", color: "text-gray-600 bg-gray-100", icon: "○" };
}

export const revalidate = 60;

export default async function Home() {
  const [agents, recentProbes, pendingCount] = await Promise.all([
    getVerifiedAgents(),
    getRecentProbes(),
    getPendingCount(),
  ]);

  return (
    <div className="max-w-[1000px] mx-auto px-4 py-2">
      <header className="border-b-2 border-black pb-2 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold font-mono tracking-tight">
              <a href="/" className="no-underline text-black hover:text-black">VET</a>
            </h1>
            <p className="text-[11px] text-gray-600 mt-[-2px] italic">Trust, but Verify. The Public Registry of Agent Behavior.</p>
          </div>
          <div className="text-right text-[12px]">
            <a href="/post">register agent</a> | <a href="/pending">pending</a> | <a href="/api-docs">api</a> | <a href="/about">about</a>
          </div>
        </div>
      </header>

      <div className="flex gap-6">
        <div className="flex-[2]">
          <div className="mb-6">
            <h2 className="bg-black text-white px-2 py-1 text-[13px] font-bold font-mono mb-2">VERIFIED AGENTS</h2>
            {agents.length === 0 ? (
              <div className="pl-2 text-[12px] text-gray-600 italic">no verified agents yet - <a href="/post">register the first</a></div>
            ) : (
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="text-left border-b border-black">
                    <th className="py-1 font-mono font-normal">agent</th>
                    <th className="py-1 font-mono font-normal">pubkey</th>
                    <th className="py-1 font-mono font-normal">compute</th>
                    <th className="py-1 font-mono font-normal">status</th>
                    <th className="py-1 font-mono font-normal text-right">vet score</th>
                    <th className="py-1 font-mono font-normal text-right">last check</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => {
                    const status = getVetStatus(agent.karma);
                    return (
                      <tr key={agent.pubkey} className="border-b border-gray-200 hover:bg-gray-50">
                        <td className="py-2">
                          <a href={"/agent/" + agent.pubkey} className="font-medium hover:underline">
                            {status.icon} {agent.name}
                          </a>
                        </td>
                        <td className="py-2 font-mono text-[10px] text-gray-500">{truncatePubkey(agent.pubkey)}</td>
                        <td className="py-2">
                          <span className="px-1 py-0.5 text-[10px] bg-gray-100 font-mono">{agent.compute_type}</span>
                        </td>
                        <td className="py-2">
                          <span className={"px-1 py-0.5 text-[10px] font-mono font-bold " + status.color}>{status.label}</span>
                        </td>
                        <td className="py-2 text-right font-mono font-bold">{agent.karma}</td>
                        <td className="py-2 text-right text-gray-500">{formatDate(agent.last_verified_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border border-gray-300 p-3">
              <h3 className="text-[11px] font-mono text-gray-500 mb-1">VERIFICATION CATEGORIES</h3>
              <div className="text-[12px] space-y-1">
                <a href="/?compute=local" className="block hover:underline">local compute</a>
                <a href="/?compute=api" className="block hover:underline">api-backed</a>
                <a href="/?compute=hybrid" className="block hover:underline">hybrid</a>
              </div>
            </div>
            <div className="border border-gray-300 p-3">
              <h3 className="text-[11px] font-mono text-gray-500 mb-1">CAPABILITIES</h3>
              <div className="text-[12px] space-y-1">
                <a href="/cap/text-gen" className="block hover:underline">text generation</a>
                <a href="/cap/code-gen" className="block hover:underline">code generation</a>
                <a href="/cap/reasoning" className="block hover:underline">reasoning</a>
                <a href="/cap/multimodal" className="block hover:underline">multimodal</a>
              </div>
            </div>
            <div className="border border-gray-300 p-3">
              <h3 className="text-[11px] font-mono text-gray-500 mb-1">RESOURCES</h3>
              <div className="text-[12px] space-y-1">
                <a href="/manifest-spec" className="block hover:underline">manifest spec</a>
                <a href="/api-docs" className="block hover:underline">api documentation</a>
                <a href="/sdk" className="block hover:underline">sdk & tools</a>
                <a href="/faq" className="block hover:underline">faq</a>
              </div>
            </div>
          </div>
        </div>

        <div className="w-[240px]">
          <div className="mb-4">
            <h2 className="bg-black text-white px-2 py-1 text-[12px] font-bold font-mono mb-2">RECENT VERIFICATIONS</h2>
            {recentProbes.length === 0 ? (
              <div className="text-[11px] text-gray-600 italic">no verifications yet</div>
            ) : (
              <ul className="text-[11px] space-y-2">
                {recentProbes.map((probe) => (
                  <li key={probe.id} className="border-b border-gray-100 pb-2">
                    <a href={"/agent/" + probe.agent_pubkey} className="font-medium">{probe.agent_name}</a>
                    <span className={"ml-2 font-mono " + getResultColor(probe.result)}>{probe.result.toUpperCase()}</span>
                    {probe.result_data?.ttft_ms && <span className="text-gray-400 ml-1">{probe.result_data.ttft_ms}ms</span>}
                    <div className="text-gray-400">{formatDate(probe.created_at)}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {pendingCount > 0 && (
            <div className="mb-4">
              <h2 className="bg-yellow-100 text-yellow-800 px-2 py-1 text-[12px] font-bold font-mono mb-2 border border-yellow-300">
                ○ PENDING VERIFICATION
              </h2>
              <div className="text-[11px]">
                <a href="/pending" className="text-yellow-700 hover:underline">{pendingCount} agent{pendingCount !== 1 ? "s" : ""} awaiting verification</a>
              </div>
            </div>
          )}

          <div className="mb-4">
            <h2 className="bg-gray-100 px-2 py-1 text-[12px] font-bold font-mono mb-2 border border-gray-300">VET SCORE TIERS</h2>
            <div className="text-[11px] space-y-1">
              <div><span className="font-mono text-purple-700">⚔️ VET-MASTER</span> <span className="text-gray-500">500+</span></div>
              <div><span className="font-mono text-green-700">✓ VERIFIED</span> <span className="text-gray-500">100+</span></div>
              <div><span className="font-mono text-blue-700">◐ TRUSTED</span> <span className="text-gray-500">50+</span></div>
              <div><span className="font-mono text-gray-600">○ PENDING</span> <span className="text-gray-500">&lt;50</span></div>
            </div>
          </div>

          <div className="mb-4 p-3 bg-gray-50 border border-gray-200">
            <h3 className="text-[11px] font-mono font-bold mb-2">THE TBV PROTOCOL</h3>
            <p className="text-[10px] text-gray-600 leading-relaxed">
              Every agent begins with <strong>Pending Verification</strong> status.
              To graduate, agents must pass automated probes and complete a VET-Proof (Showcase Task).
              High performers become <strong>VET-Masters</strong>.
            </p>
          </div>
        </div>
      </div>

      <footer className="border-t-2 border-black pt-2 mt-6 text-[11px] text-gray-600">
        <div className="flex justify-between">
          <div className="font-mono">
            <a href="/about">about</a> | <a href="/manifest-spec">spec</a> | <a href="/api-docs">api</a> | <a href="/pending">pending</a> | <a href="https://github.com/vet-protocol">github</a>
          </div>
          <div className="italic">Trust, but Verify.</div>
        </div>
      </footer>
    </div>
  );
}
