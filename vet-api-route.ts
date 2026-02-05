import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface VetResponse {
  success: boolean;
  agent?: {
    pubkey: string;
    name: string;
    description: string | null;
    endpoint: string;
    compute_type: string;
    hardware: string | null;
    api_provider: string | null;
    model_id: string | null;
    vet_score: number;
    vet_status: string;
    is_active: boolean;
    created_at: string;
    last_verified_at: string | null;
    age_days: number;
  };
  verification?: {
    total_probes: number;
    pass_count: number;
    fail_count: number;
    pass_rate: number;
    honesty_rate: number;
    avg_latency_ms: number | null;
    last_probe_at: string | null;
  };
  recent_probes?: Array<{
    id: number;
    probe_type: string;
    result: string;
    honesty_status: string | null;
    ttft_ms: number | null;
    created_at: string;
  }>;
  error?: string;
}

function getVetStatus(karma: number): string {
  if (karma >= 500) return "VET-MASTER";
  if (karma >= 100) return "VERIFIED";
  if (karma >= 50) return "TRUSTED";
  return "PENDING";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
): Promise<NextResponse<VetResponse>> {
  const { pubkey } = await params;

  // Validate pubkey format
  if (!/^[a-fA-F0-9]{64}$/.test(pubkey)) {
    return NextResponse.json(
      { success: false, error: "Invalid pubkey format. Must be 64 hex characters." },
      { status: 400 }
    );
  }

  // Fetch agent
  const { data: agent, error: agentError } = await supabase
    .from("view_agent_reputation")
    .select("*")
    .eq("pubkey", pubkey)
    .single();

  if (agentError || !agent) {
    return NextResponse.json(
      { success: false, error: "Agent not found" },
      { status: 404 }
    );
  }

  // Fetch probe history
  const { data: probes } = await supabase
    .from("probes")
    .select("*")
    .eq("agent_pubkey", pubkey)
    .order("created_at", { ascending: false })
    .limit(100);

  // Calculate verification metrics
  let passCount = 0;
  let failCount = 0;
  let honestyVerified = 0;
  let honestyTotal = 0;
  let latencySum = 0;
  let latencyCount = 0;

  const recentProbes = (probes || []).slice(0, 10).map((p) => {
    const resultData = p.result_data as { honesty_status?: string; ttft_ms?: number } | null;
    return {
      id: p.id,
      probe_type: p.probe_type,
      result: p.result,
      honesty_status: resultData?.honesty_status || null,
      ttft_ms: resultData?.ttft_ms || null,
      created_at: p.created_at,
    };
  });

  for (const probe of probes || []) {
    if (probe.result === "pass") passCount++;
    else failCount++;

    const resultData = probe.result_data as { honesty_status?: string; ttft_ms?: number } | null;
    if (resultData?.honesty_status) {
      honestyTotal++;
      if (resultData.honesty_status === "verified") honestyVerified++;
    }
    if (resultData?.ttft_ms) {
      latencySum += resultData.ttft_ms;
      latencyCount++;
    }
  }

  const totalProbes = (probes || []).length;
  const ageDays = Math.floor((Date.now() - new Date(agent.created_at).getTime()) / 86400000);

  return NextResponse.json({
    success: true,
    agent: {
      pubkey: agent.pubkey,
      name: agent.name,
      description: agent.description,
      endpoint: agent.endpoint,
      compute_type: agent.compute_type,
      hardware: agent.hardware,
      api_provider: agent.api_provider,
      model_id: agent.model_id,
      vet_score: agent.karma,
      vet_status: getVetStatus(agent.karma),
      is_active: agent.is_active,
      created_at: agent.created_at,
      last_verified_at: agent.last_verified_at,
      age_days: ageDays,
    },
    verification: {
      total_probes: totalProbes,
      pass_count: passCount,
      fail_count: failCount,
      pass_rate: totalProbes > 0 ? Math.round((passCount / totalProbes) * 100) : 0,
      honesty_rate: honestyTotal > 0 ? Math.round((honestyVerified / honestyTotal) * 100) : 0,
      avg_latency_ms: latencyCount > 0 ? Math.round(latencySum / latencyCount) : null,
      last_probe_at: probes && probes.length > 0 ? probes[0].created_at : null,
    },
    recent_probes: recentProbes,
  });
}
