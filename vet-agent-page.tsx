import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

interface AgentDetail {
  pubkey: string;
  name: string;
  description: string | null;
  manifest_url: string;
  endpoint: string;
  compute_type: "local" | "api" | "hybrid";
  hardware: string | null;
  api_provider: string | null;
  model_id: string | null;
  cost_base_usd: number;
  sunset_expires_at: string | null;
  created_at: string;
  last_verified_at: string | null;
  last_seen_at: string | null;
  is_active: boolean;
  manifest_cache: Record<string, unknown> | null;
  karma: number;
  karma_events: number;
}

interface Probe {
  id: number;
  probe_type: string;
  result: "pass" | "fail" | "timeout" | "error";
  result_data: {
    ttft_ms: number | null;
    honesty_status: string;
  } | null;
  duration_ms: number;
  created_at: string;
}

async function getAgent(pubkey: string): Promise<AgentDetail | null> {
  const { data, error } = await supabase
    .from("view_agent_reputation")
    .select("*")
    .eq("pubkey", pubkey)
    .single();

  if (error || !data) return null;
  return data as AgentDetail;
}

async function getProbeHistory(pubkey: string): Promise<Probe[]> {
  const { data, error } = await supabase
    .from("probes")
    .select("*")
    .eq("agent_pubkey", pubkey)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data as Probe[];
}

async function getAgentStats(pubkey: string) {
  const { data: probes } = await supabase
    .from("probes")
    .select("result, result_data")
    .eq("agent_pubkey", pubkey)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!probes || probes.length === 0) {
    return { honesty: 0, reliability: 0, speed: 0, totalProbes: 0, passRate: 0 };
  }

  let honestyScore = 0, reliabilityScore = 0, speedScore = 0;
  let honestyCount = 0, reliabilityCount = 0, speedCount = 0;
  let passCount = 0;

  for (const probe of probes) {
    reliabilityCount++;
    if (probe.result === "pass") {
      reliabilityScore += 100;
      passCount++;
    } else if (probe.result === "timeout") {
      reliabilityScore += 25;
    }

    const data = probe.result_data as Probe["result_data"];
    if (data?.honesty_status) {
      honestyCount++;
      if (data.honesty_status === "verified") honestyScore += 100;
      else if (data.honesty_status === "warning") honestyScore += 50;
    }

    if (data?.ttft_ms) {
      speedCount++;
      if (data.ttft_ms < 500) speedScore += 100;
      else if (data.ttft_ms < 1000) speedScore += 75;
      else if (data.ttft_ms < 2000) speedScore += 50;
      else speedScore += 25;
    }
  }

  return {
    honesty: honestyCount > 0 ? Math.round(honestyScore / honestyCount) : 0,
    reliability: reliabilityCount > 0 ? Math.round(reliabilityScore / reliabilityCount) : 0,
    speed: speedCount > 0 ? Math.round(speedScore / speedCount) : 0,
    totalProbes: probes.length,
    passRate: reliabilityCount > 0 ? Math.round((passCount / reliabilityCount) * 100) : 0,
  };
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "never";
  return new Date(dateStr).toLocaleString();
}

function formatDateRelative(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return diffMins + "m ago";
  if (diffHours < 24) return diffHours + "h ago";
  return diffDays + "d ago";
}

function getResultColor(result: string): string {
  if (result === "pass") return "text-green-700 bg-green-50";
  if (result === "fail") return "text-red-700 bg-red-50";
  if (result === "timeout") return "text-orange-600 bg-orange-50";
  return "text-gray-600 bg-gray-50";
}

function getHonestyColor(status: string): string {
  if (status === "verified") return "text-green-700";
  if (status === "warning") return "text-orange-600";
  if (status === "violation") return "text-red-700";
  return "text-gray-600";
}

function getVetStatus(karma: number): { label: string; color: string; icon: string; bg: string } {
  if (karma >= 500) return { label: "VET-MASTER", color: "text-purple-700", icon: "⚔️", bg: "bg-purple-100 border-purple-300" };
  if (karma >= 100) return { label: "VERIFIED", color: "text-green-700", icon: "✓", bg: "bg-green-100 border-green-300" };
  if (karma >= 50) return { label: "TRUSTED", color: "text-blue-700", icon: "◐", bg: "bg-blue-100 border-blue-300" };
  return { label: "PENDING VERIFICATION", color: "text-gray-600", icon: "○", bg: "bg-yellow-50 border-yellow-300" };
}

function getAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export const revalidate = 60;

export default async function AgentPage({ params }: { params: Promise<{ pubkey: string }> }) {
  const { pubkey } = await params;
  const agent = await getAgent(pubkey);
  if (!agent) notFound();

  const [probeHistory, stats] = await Promise.all([
    getProbeHistory(pubkey),
    getAgentStats(pubkey),
  ]);

  const vetStatus = getVetStatus(agent.karma);
  const ageDays = getAgeDays(agent.created_at);

  return (
    <div className="max-w-[900px] mx-auto px-4 py-2">
      <header className="border-b-2 border-black pb-2 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-bold font-mono tracking-tight">
              <a href="/" className="no-underline text-black hover:text-black">VET</a>
            </h1>
            <p className="text-[11px] text-gray-600 mt-[-2px] italic">Trust, but Verify.</p>
          </div>
          <div className="text-right text-[12px]">
            <a href="/">registry</a> | <a href="/post">register agent</a>
          </div>
        </div>
      </header>

      <main>
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-[24px] font-bold font-mono">{vetStatus.icon} {agent.name}</h2>
              <div className="font-mono text-[11px] text-gray-500 mt-1">{agent.pubkey}</div>
            </div>
            <div className={"px-3 py-1 text-[12px] font-mono font-bold border " + vetStatus.bg + " " + vetStatus.color}>
              {vetStatus.label}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="border border-gray-300 p-4">
              <h3 className="text-[11px] font-mono text-gray-500 mb-3">AGENT DETAILS</h3>
              <table className="w-full text-[12px]">
                <tbody>
                  <tr><td className="py-1 text-gray-500 font-mono w-24">compute</td><td className="py-1 font-bold">{agent.compute_type}{agent.hardware && <span className="font-normal text-gray-500"> ({agent.hardware})</span>}</td></tr>
                  {agent.api_provider && <tr><td className="py-1 text-gray-500 font-mono">provider</td><td className="py-1">{agent.api_provider}</td></tr>}
                  {agent.model_id && <tr><td className="py-1 text-gray-500 font-mono">model</td><td className="py-1 font-mono text-[11px]">{agent.model_id}</td></tr>}
                  <tr><td className="py-1 text-gray-500 font-mono">endpoint</td><td className="py-1 font-mono text-[10px] break-all">{agent.endpoint}</td></tr>
                  <tr><td className="py-1 text-gray-500 font-mono">cost</td><td className="py-1">${agent.cost_base_usd}/call</td></tr>
                  <tr><td className="py-1 text-gray-500 font-mono">status</td><td className="py-1">{agent.is_active ? <span className="text-green-700">●</span> : <span className="text-red-700">●</span>} {agent.is_active ? "active" : "inactive"}</td></tr>
                </tbody>
              </table>
            </div>

            <div className="border border-gray-300 p-4">
              <h3 className="text-[11px] font-mono text-gray-500 mb-3">VERIFICATION METRICS</h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-mono">VET SCORE</span>
                    <span className="font-bold text-[14px]">{agent.karma}</span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-mono">PASS RATE</span>
                    <span className="font-mono">{stats.passRate}%</span>
                  </div>
                  <div className="bg-gray-200 h-2"><div className="bg-green-600 h-2" style={{ width: stats.passRate + "%" }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-mono">HONESTY</span>
                    <span className="font-mono">{stats.honesty}%</span>
                  </div>
                  <div className="bg-gray-200 h-2"><div className="bg-blue-600 h-2" style={{ width: stats.honesty + "%" }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="font-mono">SPEED</span>
                    <span className="font-mono">{stats.speed}%</span>
                  </div>
                  <div className="bg-gray-200 h-2"><div className="bg-orange-500 h-2" style={{ width: stats.speed + "%" }} /></div>
                </div>
                <div className="pt-2 border-t border-gray-200 text-[11px] text-gray-500">
                  <div className="flex justify-between"><span>Total Probes</span><span className="font-mono">{stats.totalProbes}</span></div>
                  <div className="flex justify-between"><span>Age</span><span className="font-mono">{ageDays} days</span></div>
                  <div className="flex justify-between"><span>Last Seen</span><span>{formatDateRelative(agent.last_seen_at)}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {agent.description && (
          <div className="mb-6 border border-gray-300 p-4">
            <h3 className="text-[11px] font-mono text-gray-500 mb-2">DESCRIPTION</h3>
            <p className="text-[12px]">{agent.description}</p>
          </div>
        )}

        <div className="mb-6">
          <h3 className="bg-black text-white px-2 py-1 text-[12px] font-bold font-mono mb-2">VERIFICATION HISTORY</h3>
          {probeHistory.length === 0 ? (
            <div className="text-[12px] text-gray-600 italic p-2">no verification probes yet</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left border-b border-gray-300">
                  <th className="py-2 font-mono font-normal">type</th>
                  <th className="py-2 font-mono font-normal">result</th>
                  <th className="py-2 font-mono font-normal">honesty</th>
                  <th className="py-2 font-mono font-normal text-right">latency</th>
                  <th className="py-2 font-mono font-normal text-right">when</th>
                </tr>
              </thead>
              <tbody>
                {probeHistory.map((probe) => (
                  <tr key={probe.id} className="border-b border-gray-100">
                    <td className="py-2 font-mono text-[11px]">{probe.probe_type}</td>
                    <td className="py-2">
                      <span className={"px-1 py-0.5 font-mono text-[10px] font-bold " + getResultColor(probe.result)}>
                        {probe.result.toUpperCase()}
                      </span>
                    </td>
                    <td className={"py-2 font-mono text-[11px] " + getHonestyColor(probe.result_data?.honesty_status || "")}>
                      {probe.result_data?.honesty_status || "-"}
                    </td>
                    <td className="py-2 text-right font-mono text-[11px]">
                      {probe.result_data?.ttft_ms ? probe.result_data.ttft_ms + "ms" : "-"}
                    </td>
                    <td className="py-2 text-right text-gray-500">{formatDateRelative(probe.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mb-6 border border-gray-300 p-4">
          <h3 className="text-[11px] font-mono text-gray-500 mb-2">MANIFEST</h3>
          <div className="text-[11px] mb-2">
            <a href={agent.manifest_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-mono">{agent.manifest_url}</a>
          </div>
          {agent.manifest_cache && (
            <pre className="bg-gray-50 border border-gray-200 p-2 overflow-x-auto text-[10px] font-mono">
              {JSON.stringify(agent.manifest_cache, null, 2)}
            </pre>
          )}
        </div>

        <div className="mb-6 p-4 bg-gray-50 border border-gray-200">
          <h3 className="text-[11px] font-mono font-bold mb-2">API ACCESS</h3>
          <p className="text-[11px] text-gray-600 mb-2">Fetch this agent's verification data programmatically:</p>
          <code className="text-[10px] font-mono bg-black text-green-400 px-2 py-1 block">
            GET /api/v1/vet/{agent.pubkey}
          </code>
        </div>

        {agent.sunset_expires_at && (
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 text-[12px]">
            <strong className="font-mono">SUNSET:</strong> This agent expires on {formatDate(agent.sunset_expires_at)}
          </div>
        )}
      </main>

      <footer className="border-t-2 border-black pt-2 mt-6 text-[11px] text-gray-600">
        <div className="flex justify-between">
          <div className="font-mono">
            <a href="/">registry</a> | <a href="/about">about</a> | <a href="/api-docs">api</a>
          </div>
          <div className="italic">Trust, but Verify.</div>
        </div>
      </footer>
    </div>
  );
}
