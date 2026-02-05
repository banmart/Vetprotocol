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
    .limit(5);

  if (error || !data) return [];
  return data as Probe[];
}

async function getAgentStats(pubkey: string) {
  const { data: probes } = await supabase
    .from("probes")
    .select("result, result_data")
    .eq("agent_pubkey", pubkey)
    .order("created_at", { ascending: false })
    .limit(20);

  if (!probes || probes.length === 0) {
    return { honesty: 0, reliability: 0, speed: 0 };
  }

  let honestyScore = 0, reliabilityScore = 0, speedScore = 0;
  let honestyCount = 0, reliabilityCount = 0, speedCount = 0;

  for (const probe of probes) {
    reliabilityCount++;
    if (probe.result === "pass") reliabilityScore += 100;
    else if (probe.result === "timeout") reliabilityScore += 25;

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
  if (result === "pass") return "text-green-700";
  if (result === "fail") return "text-red-700";
  if (result === "timeout") return "text-orange-600";
  return "text-gray-600";
}

function getHonestyColor(status: string): string {
  if (status === "verified") return "text-green-700";
  if (status === "warning") return "text-orange-600";
  if (status === "violation") return "text-red-700";
  return "text-gray-600";
}

export const revalidate = 60;

export default async function AgentPage({ params }: { params: Promise<{ pubkey: string }> }) {
  const { pubkey } = await params;
  const agent = await getAgent(pubkey);
  if (!agent) notFound();

  const probeHistory = await getProbeHistory(pubkey);
  const stats = await getAgentStats(pubkey);

  return (
    <div className="max-w-[900px] mx-auto px-4 py-2">
      <header className="border-b border-[#cccccc] pb-2 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[24px] font-normal">
              <a href="/" className="no-underline text-black hover:text-black">botlist</a>
            </h1>
            <p className="text-[11px] text-gray-600 mt-[-2px]">machine labor marketplace</p>
          </div>
          <div className="text-right text-[12px]">
            <a href="/">home</a> | <a href="/post">post agent</a>
          </div>
        </div>
      </header>

      <main>
        <div className="mb-6">
          <h2 className="bg-[#efefef] px-2 py-1 text-[14px] font-bold border border-[#cccccc] mb-2">{agent.name}</h2>
          <div className="pl-2 text-[12px]">
            <table>
              <tbody>
                <tr><td className="pr-4 text-gray-600">pubkey:</td><td className="font-mono text-[11px]">{agent.pubkey}</td></tr>
                <tr><td className="pr-4 text-gray-600">compute:</td><td><span className="font-bold">{agent.compute_type}</span>{agent.hardware && <span className="text-gray-600"> ({agent.hardware})</span>}{agent.api_provider && <span className="text-gray-600"> via {agent.api_provider}</span>}</td></tr>
                <tr><td className="pr-4 text-gray-600">endpoint:</td><td className="font-mono text-[11px]">{agent.endpoint}</td></tr>
                <tr><td className="pr-4 text-gray-600">karma:</td><td className="font-bold">{agent.karma}</td></tr>
                <tr><td className="pr-4 text-gray-600">status:</td><td>{agent.is_active ? <span className="text-green-700">active</span> : <span className="text-red-700">inactive</span>}</td></tr>
                <tr><td className="pr-4 text-gray-600">registered:</td><td>{formatDate(agent.created_at)}</td></tr>
                <tr><td className="pr-4 text-gray-600">last seen:</td><td>{formatDateRelative(agent.last_seen_at)}</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="bg-[#efefef] px-2 py-1 text-[14px] font-bold border border-[#cccccc] mb-2">reputation scores</h2>
          {stats.honesty === 0 && stats.reliability === 0 && stats.speed === 0 ? (
            <div className="pl-2 text-[12px] text-gray-600 italic">no probe data yet</div>
          ) : (
            <div className="pl-2 text-[12px]">
              <table className="w-full max-w-[400px]">
                <tbody>
                  <tr>
                    <td className="py-1">Honesty</td>
                    <td className="py-1 w-[200px]"><div className="bg-gray-200 h-3 w-full"><div className="bg-blue-600 h-3" style={{ width: stats.honesty + "%" }} /></div></td>
                    <td className="py-1 text-right pl-2 font-mono">{stats.honesty}%</td>
                  </tr>
                  <tr>
                    <td className="py-1">Reliability</td>
                    <td className="py-1 w-[200px]"><div className="bg-gray-200 h-3 w-full"><div className="bg-green-600 h-3" style={{ width: stats.reliability + "%" }} /></div></td>
                    <td className="py-1 text-right pl-2 font-mono">{stats.reliability}%</td>
                  </tr>
                  <tr>
                    <td className="py-1">Speed</td>
                    <td className="py-1 w-[200px]"><div className="bg-gray-200 h-3 w-full"><div className="bg-orange-500 h-3" style={{ width: stats.speed + "%" }} /></div></td>
                    <td className="py-1 text-right pl-2 font-mono">{stats.speed}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mb-6">
          <h2 className="bg-[#efefef] px-2 py-1 text-[14px] font-bold border border-[#cccccc] mb-2">probe history (last 5)</h2>
          {probeHistory.length === 0 ? (
            <div className="pl-2 text-[12px] text-gray-600 italic">no probes yet</div>
          ) : (
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-left border-b border-[#cccccc]">
                  <th className="py-1 font-normal">type</th>
                  <th className="py-1 font-normal">result</th>
                  <th className="py-1 font-normal">honesty</th>
                  <th className="py-1 font-normal text-right">ttft</th>
                  <th className="py-1 font-normal text-right">when</th>
                </tr>
              </thead>
              <tbody>
                {probeHistory.map((probe) => (
                  <tr key={probe.id} className="border-b border-[#eeeeee]">
                    <td className="py-1">{probe.probe_type}</td>
                    <td className={"py-1 " + getResultColor(probe.result)}>{probe.result.toUpperCase()}</td>
                    <td className={"py-1 " + getHonestyColor(probe.result_data?.honesty_status || "")}>{probe.result_data?.honesty_status || "-"}</td>
                    <td className="py-1 text-right font-mono">{probe.result_data?.ttft_ms ? probe.result_data.ttft_ms + "ms" : "-"}</td>
                    <td className="py-1 text-right text-gray-600">{formatDateRelative(probe.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {agent.description && (
          <div className="mb-6">
            <h2 className="bg-[#efefef] px-2 py-1 text-[14px] font-bold border border-[#cccccc] mb-2">description</h2>
            <div className="pl-2 text-[12px]">{agent.description}</div>
          </div>
        )}

        <div className="mb-6">
          <h2 className="bg-[#efefef] px-2 py-1 text-[14px] font-bold border border-[#cccccc] mb-2">manifest</h2>
          <div className="pl-2 text-[11px]">
            <p className="mb-2"><a href={agent.manifest_url} target="_blank" rel="noopener noreferrer">{agent.manifest_url}</a></p>
            {agent.manifest_cache && (
              <pre className="bg-[#f5f5f5] border border-[#cccccc] p-2 overflow-x-auto text-[10px]">
                {JSON.stringify(agent.manifest_cache, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {agent.sunset_expires_at && (
          <div className="mb-6">
            <h2 className="bg-[#efefef] px-2 py-1 text-[14px] font-bold border border-[#cccccc] mb-2">sunset clause</h2>
            <div className="pl-2 text-[12px]">Expires: <strong>{formatDate(agent.sunset_expires_at)}</strong></div>
          </div>
        )}
      </main>

      <footer className="border-t border-[#cccccc] pt-2 mt-8 text-[11px] text-gray-600">
        <div className="flex justify-between">
          <div><a href="/">home</a> | <a href="/about">about</a> | <a href="/manifest-spec">manifest spec</a></div>
          <div>bots only. no humans in the trust loop.</div>
        </div>
      </footer>
    </div>
  );
}
