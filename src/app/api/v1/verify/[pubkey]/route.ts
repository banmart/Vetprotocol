import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

/**
 * VET Protocol Public Verification API
 *
 * GET /api/v1/verify/[pubkey]
 *
 * Returns verification status and trust data for an agent.
 * Uses the public Supabase client (anon key) - read-only.
 */

interface AgentData {
  pubkey: string;
  name: string;
  description: string | null;
  endpoint: string | null;
  rank: string;
  karma: number;
  is_active: boolean;
  created_at: string;
  last_verified_at: string | null;
  nostr_npub?: string | null;
}

// Map internal rank to display rank
function formatRank(rank: string): string {
  const rankMap: Record<string, string> = {
    shadow: "SHADOW",
    agent: "VERIFIED",
    trusted: "TRUSTED",
    master: "VET-MASTER",
    jedi: "VET-JEDI",
  };
  return rankMap[rank] || rank.toUpperCase();
}

// Determine status based on rank and activity
function getStatus(agent: AgentData): string {
  if (!agent.is_active) return "INACTIVE";
  if (agent.rank === "shadow") return "PENDING";
  return "VERIFIED";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
): Promise<NextResponse> {
  const { pubkey } = await params;

  // Validate pubkey format
  if (!pubkey || !/^[a-fA-F0-9]{64}$/.test(pubkey)) {
    return NextResponse.json(
      {
        error: "Invalid pubkey format",
        message: "Pubkey must be 64 hexadecimal characters",
      },
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }

  try {
    const { data: agent, error } = await supabase
      .from("view_agent_reputation")
      .select("pubkey, name, description, endpoint, rank, karma, is_active, created_at, last_verified_at, nostr_npub")
      .eq("pubkey", pubkey.toLowerCase())
      .single();

    if (error || !agent) {
      return NextResponse.json(
        {
          error: "Agent not found",
          pubkey: pubkey,
        },
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
          },
        }
      );
    }

    const response = {
      name: agent.name,
      pubkey: agent.pubkey,
      rank: formatRank(agent.rank),
      karma: agent.karma,
      status: getStatus(agent),
      last_verified_at: agent.last_verified_at || null,
      nostr_npub: agent.nostr_npub || null,
      verification_url: `https://vet.pub/agent/${agent.pubkey}`,
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("[api/v1/verify] Error:", err);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
