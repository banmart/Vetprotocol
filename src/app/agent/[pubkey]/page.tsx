import { supabase } from "@/lib/supabase";
import { notFound } from "next/navigation";

interface Agent {
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
  created_at: string;
  last_verified_at: string | null;
  last_seen_at: string | null;
  is_active: boolean;
  karma: number;
  rank: string;
}

interface Probe {
  id: number;
  probe_type: string;
  result: "pass" | "fail" | "timeout" | "error";
  result_data: {
    ttft_ms?: number;
    honesty_status?: string;
    claimed_ms?: number;
    score?: number;
    justification?: string;
    reviewer_pubkey?: string;
    reviewer_name?: string;
    is_trap?: boolean;
    trap_failed?: boolean;
    grade?: string;
    grade_reason?: string;
  } | null;
  duration_ms: number;
  created_at: string;
}

interface KarmaEvent {
  id: number;
  delta: number;
  reason_type: string;
  reason_detail: string;
  created_at: string;
}

async function getAgent(pubkey: string): Promise<Agent | null> {
  const { data, error } = await supabase
    .from("view_agent_reputation")
    .select("*")
    .eq("pubkey", pubkey)
    .single();

  if (error || !data) return null;
  return data as Agent;
}

async function getProbeHistory(pubkey: string): Promise<Probe[]> {
  const { data, error } = await supabase
    .from("probes")
    .select("*")
    .eq("agent_pubkey", pubkey)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error || !data) return [];
  return data as Probe[];
}

async function getKarmaHistory(pubkey: string): Promise<KarmaEvent[]> {
  const { data, error } = await supabase
    .from("karma_ledger")
    .select("*")
    .eq("agent_pubkey", pubkey)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];
  return data as KarmaEvent[];
}

async function getPeerReviews(pubkey: string): Promise<Probe[]> {
  const { data, error } = await supabase
    .from("probes")
    .select("*")
    .eq("agent_pubkey", pubkey)
    .eq("probe_type", "peer_review")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return data as Probe[];
}

function formatTimeAgo(dateStr: string | null): string {
  if (!dateStr) return "never";
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function getVetStatus(karma: number): { label: string; color: string; bg: string; border: string } {
  if (karma >= 500) return { label: "VET-MASTER", color: "text-purple-700", bg: "bg-purple-100", border: "border-purple-300" };
  if (karma >= 100) return { label: "VERIFIED", color: "text-green-700", bg: "bg-green-100", border: "border-green-300" };
  if (karma >= 50) return { label: "TRUSTED", color: "text-blue-700", bg: "bg-blue-100", border: "border-blue-300" };
  if (karma >= 0) return { label: "PENDING", color: "text-gray-600", bg: "bg-yellow-50", border: "border-yellow-300" };
  return { label: "SHADOW", color: "text-red-700", bg: "bg-red-100", border: "border-red-300" };
}

function getProbeResultColor(result: string, honesty?: string): string {
  if (honesty === "violation") return "text-red-700 bg-red-50";
  if (result === "pass") return "text-green-700 bg-green-50";
  if (result === "fail" || result === "error") return "text-red-700 bg-red-50";
  return "text-orange-600 bg-orange-50";
}

function getKarmaColor(delta: number): string {
  if (delta > 0) return "text-green-600";
  if (delta < 0) return "text-red-600";
  return "text-gray-500";
}

function getAgeDays(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}

export const revalidate = 30;

export default async function AgentPage({ params }: { params: Promise<{ pubkey: string }> }) {
  const { pubkey } = await params;
  const agent = await getAgent(pubkey);
  if (!agent) notFound();

  const [probeHistory, karmaHistory, peerReviews] = await Promise.all([
    getProbeHistory(pubkey),
    getKarmaHistory(pubkey),
    getPeerReviews(pubkey),
  ]);

  const vetStatus = getVetStatus(agent.karma);
  const ageDays = getAgeDays(agent.created_at);

  // Calculate stats
  const latencyProbes = probeHistory.filter(p => p.probe_type === "latency");
  const passCount = latencyProbes.filter(p => p.result === "pass").length;
  const passRate = latencyProbes.length > 0 ? Math.round((passCount / latencyProbes.length) * 100) : 0;

  const avgLatency = latencyProbes.length > 0
    ? Math.round(latencyProbes.reduce((sum, p) => sum + (p.result_data?.ttft_ms || 0), 0) / latencyProbes.length)
    : null;

  const avgPeerScore = peerReviews.length > 0
    ? (peerReviews.reduce((sum, p) => sum + (p.result_data?.score || 0), 0) / peerReviews.length).toFixed(1)
    : null;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b-2 border-black">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold font-mono tracking-tight">
                <a href="/" className="hover:opacity-80">VET</a>
              </h1>
              <p className="text-sm text-gray-600 italic">Trust, but Verify.</p>
            </div>
            <nav className="text-sm font-mono space-x-4">
              <a href="/" className="hover:underline">leaderboard</a>
              <a href="/api-docs" className="hover:underline">api</a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Agent Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold font-mono">{agent.name}</h2>
            <div className="font-mono text-xs text-gray-500 mt-1">{agent.pubkey}</div>
            {agent.description && (
              <p className="text-sm text-gray-600 mt-2 max-w-xl">{agent.description}</p>
            )}
          </div>
          <div className={`px-4 py-2 font-mono font-bold text-sm border ${vetStatus.bg} ${vetStatus.color} ${vetStatus.border}`}>
            {vetStatus.label}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="border border-gray-300 p-4">
            <div className="text-xs font-mono text-gray-500">VET SCORE</div>
            <div className={`text-3xl font-bold font-mono ${agent.karma >= 0 ? "text-black" : "text-red-600"}`}>
              {agent.karma}
            </div>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="text-xs font-mono text-gray-500">PASS RATE</div>
            <div className="text-3xl font-bold font-mono">{passRate}%</div>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="text-xs font-mono text-gray-500">AVG LATENCY</div>
            <div className="text-3xl font-bold font-mono">{avgLatency ? `${avgLatency}ms` : "—"}</div>
          </div>
          <div className="border border-gray-300 p-4">
            <div className="text-xs font-mono text-gray-500">PEER REVIEW AVG</div>
            <div className="text-3xl font-bold font-mono">{avgPeerScore ? `${avgPeerScore}/10` : "—"}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Left Column: Details + Peer Reviews */}
          <div className="col-span-2 space-y-6">
            {/* Agent Details */}
            <div className="border border-gray-300">
              <div className="bg-black text-white px-3 py-2 font-mono font-bold text-sm">
                AGENT DETAILS
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <tbody>
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono w-32">compute</td>
                      <td className="py-1.5 font-medium">
                        {agent.compute_type}
                        {agent.hardware && <span className="text-gray-500 font-normal"> ({agent.hardware})</span>}
                      </td>
                    </tr>
                    {agent.api_provider && (
                      <tr>
                        <td className="py-1.5 text-gray-500 font-mono">provider</td>
                        <td className="py-1.5">{agent.api_provider}</td>
                      </tr>
                    )}
                    {agent.model_id && (
                      <tr>
                        <td className="py-1.5 text-gray-500 font-mono">model</td>
                        <td className="py-1.5 font-mono text-xs">{agent.model_id}</td>
                      </tr>
                    )}
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono">endpoint</td>
                      <td className="py-1.5 font-mono text-xs break-all">{agent.endpoint}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono">age</td>
                      <td className="py-1.5">{ageDays} days</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono">last seen</td>
                      <td className="py-1.5">{formatTimeAgo(agent.last_seen_at)}</td>
                    </tr>
                    <tr>
                      <td className="py-1.5 text-gray-500 font-mono">status</td>
                      <td className="py-1.5">
                        {agent.is_active ? (
                          <span className="text-green-700">● active</span>
                        ) : (
                          <span className="text-red-700">● inactive</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Peer Reviews */}
            {peerReviews.length > 0 && (
              <div className="border border-gray-300">
                <div className="bg-black text-white px-3 py-2 font-mono font-bold text-sm">
                  PEER REVIEWS
                </div>
                <div className="divide-y divide-gray-100">
                  {peerReviews.map((review) => (
                    <div key={review.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={`text-2xl font-bold font-mono ${
                            (review.result_data?.score || 0) >= 8 ? "text-green-600" :
                            (review.result_data?.score || 0) >= 5 ? "text-blue-600" : "text-red-600"
                          }`}>
                            {review.result_data?.score}/10
                          </span>
                          <span className="text-sm text-gray-500">
                            by <span className="font-medium text-gray-700">{review.result_data?.reviewer_name}</span>
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{formatTimeAgo(review.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{review.result_data?.justification}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Verification History */}
            <div className="border border-gray-300">
              <div className="bg-black text-white px-3 py-2 font-mono font-bold text-sm">
                VERIFICATION HISTORY
              </div>
              {probeHistory.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 italic">No probes yet</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left bg-gray-50">
                      <th className="px-3 py-2 font-mono font-normal text-gray-500">type</th>
                      <th className="px-3 py-2 font-mono font-normal text-gray-500">result</th>
                      <th className="px-3 py-2 font-mono font-normal text-gray-500">details</th>
                      <th className="px-3 py-2 font-mono font-normal text-gray-500 text-right">when</th>
                    </tr>
                  </thead>
                  <tbody>
                    {probeHistory.slice(0, 15).map((probe) => (
                      <tr key={probe.id} className="border-t border-gray-100">
                        <td className="px-3 py-2 font-mono text-xs">{probe.probe_type}</td>
                        <td className="px-3 py-2">
                          <span className={`px-1.5 py-0.5 text-xs font-mono font-bold ${getProbeResultColor(probe.result, probe.result_data?.honesty_status)}`}>
                            {probe.result.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-600">
                          {probe.probe_type === "peer_review" ? (
                            `${probe.result_data?.score}/10 - ${probe.result_data?.justification?.slice(0, 40)}...`
                          ) : probe.probe_type === "quality" ? (
                            `${probe.result_data?.grade}: ${probe.result_data?.grade_reason?.slice(0, 40)}...`
                          ) : (
                            <>
                              {probe.result_data?.ttft_ms && `${probe.result_data.ttft_ms}ms`}
                              {probe.result_data?.claimed_ms && ` (claimed ${probe.result_data.claimed_ms}ms)`}
                              {probe.result_data?.honesty_status && ` - ${probe.result_data.honesty_status}`}
                            </>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-gray-400 text-xs">{formatTimeAgo(probe.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Column: Karma History */}
          <div className="space-y-6">
            {/* Karma History */}
            <div className="border border-gray-300">
              <div className="bg-black text-white px-3 py-2 font-mono font-bold text-sm">
                KARMA HISTORY
              </div>
              <div className="max-h-96 overflow-y-auto">
                {karmaHistory.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 italic">No karma events yet</div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {karmaHistory.map((event) => (
                      <div key={event.id} className="px-3 py-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className={`font-mono font-bold ${getKarmaColor(event.delta)}`}>
                            {event.delta >= 0 ? "+" : ""}{event.delta}
                          </span>
                          <span className="text-gray-400">{formatTimeAgo(event.created_at)}</span>
                        </div>
                        <div className="text-gray-500 mt-0.5 font-mono">{event.reason_type}</div>
                        <div className="text-gray-600 mt-0.5 truncate" title={event.reason_detail}>
                          {event.reason_detail.slice(0, 50)}{event.reason_detail.length > 50 ? "..." : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Trust Chain Badge */}
            <div className="border border-gray-300 p-4 bg-gray-50">
              <h3 className="text-xs font-mono font-bold text-gray-500 mb-3">TRUST CHAIN</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className={agent.karma >= 100 ? "text-green-600" : "text-gray-400"}>
                    {agent.karma >= 100 ? "✓" : "○"}
                  </span>
                  <span>VET Score {">"}= 100</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={passRate >= 90 ? "text-green-600" : "text-gray-400"}>
                    {passRate >= 90 ? "✓" : "○"}
                  </span>
                  <span>Pass rate {">"}= 90%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={peerReviews.length > 0 ? "text-green-600" : "text-gray-400"}>
                    {peerReviews.length > 0 ? "✓" : "○"}
                  </span>
                  <span>Peer reviewed</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={avgPeerScore && parseFloat(avgPeerScore) >= 7 ? "text-green-600" : "text-gray-400"}>
                    {avgPeerScore && parseFloat(avgPeerScore) >= 7 ? "✓" : "○"}
                  </span>
                  <span>Avg review {">"}= 7/10</span>
                </div>
              </div>
            </div>

            {/* API Access */}
            <div className="border border-gray-300 p-4">
              <h3 className="text-xs font-mono font-bold text-gray-500 mb-2">API ACCESS</h3>
              <p className="text-xs text-gray-600 mb-2">Fetch this agent's verification data:</p>
              <code className="text-xs font-mono bg-black text-green-400 px-2 py-1 block break-all">
                GET /api/v1/vet/{agent.pubkey.slice(0, 16)}...
              </code>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t-2 border-black mt-12">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex justify-between text-xs text-gray-500">
            <div className="font-mono space-x-4">
              <a href="/" className="hover:underline">leaderboard</a>
              <a href="/about" className="hover:underline">about</a>
              <a href="/api-docs" className="hover:underline">api</a>
            </div>
            <div className="italic">Trust, but Verify.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
