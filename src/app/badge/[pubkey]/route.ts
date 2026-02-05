import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Rank colors
const RANK_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  master: { bg: "#7c3aed", text: "#ffffff", label: "MASTER" },
  verified: { bg: "#16a34a", text: "#ffffff", label: "VERIFIED" },
  trusted: { bg: "#2563eb", text: "#ffffff", label: "TRUSTED" },
  agent: { bg: "#6b7280", text: "#ffffff", label: "AGENT" },
  pending: { bg: "#9ca3af", text: "#ffffff", label: "PENDING" },
  shadow: { bg: "#dc2626", text: "#ffffff", label: "SHADOW" },
};

function generateBadgeSVG(
  name: string,
  karma: number,
  rank: string,
  style: "flat" | "plastic" | "for-the-badge" = "flat"
): string {
  const rankInfo = RANK_COLORS[rank] || RANK_COLORS.pending;
  const displayName = name.length > 20 ? name.slice(0, 18) + "…" : name;

  // Calculate widths
  const leftText = "VET";
  const rightText = `${rankInfo.label} · ${karma}`;
  const leftWidth = 35;
  const rightWidth = Math.max(80, rightText.length * 7 + 10);
  const totalWidth = leftWidth + rightWidth;

  if (style === "for-the-badge") {
    // Larger, bolder style
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth + 20}" height="28" role="img" aria-label="VET: ${rankInfo.label}">
  <title>VET: ${rankInfo.label} · ${karma} karma</title>
  <g shape-rendering="crispEdges">
    <rect width="${leftWidth + 10}" height="28" fill="#1f2937"/>
    <rect x="${leftWidth + 10}" width="${rightWidth + 10}" height="28" fill="${rankInfo.bg}"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="10">
    <text x="${(leftWidth + 10) / 2}" y="17.5" font-weight="700" textLength="${leftWidth - 6}" fill="#fff" transform="uppercase">${leftText}</text>
    <text x="${leftWidth + 10 + rightWidth / 2}" y="17.5" font-weight="700" fill="${rankInfo.text}">${rightText}</text>
  </g>
</svg>`;
  }

  // Flat style (default)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="VET: ${rankInfo.label}">
  <title>VET: ${rankInfo.label} · ${karma} karma</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${leftWidth}" height="20" fill="#555"/>
    <rect x="${leftWidth}" width="${rightWidth}" height="20" fill="${rankInfo.bg}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text aria-hidden="true" x="${leftWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${leftText}</text>
    <text x="${leftWidth / 2}" y="14">${leftText}</text>
    <text aria-hidden="true" x="${leftWidth + rightWidth / 2}" y="15" fill="#010101" fill-opacity=".3">${rightText}</text>
    <text x="${leftWidth + rightWidth / 2}" y="14" fill="${rankInfo.text}">${rightText}</text>
  </g>
</svg>`;
}

function generateNotFoundBadge(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="110" height="20" role="img" aria-label="VET: Not Found">
  <title>VET: Agent Not Found</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="110" height="20" rx="3" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="35" height="20" fill="#555"/>
    <rect x="35" width="75" height="20" fill="#9ca3af"/>
    <rect width="110" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" text-rendering="geometricPrecision" font-size="11">
    <text x="17.5" y="14">VET</text>
    <text x="72.5" y="14">not found</text>
  </g>
</svg>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pubkey: string }> }
): Promise<NextResponse> {
  const { pubkey } = await params;
  const { searchParams } = new URL(request.url);
  const style = (searchParams.get("style") as "flat" | "plastic" | "for-the-badge") || "flat";

  // Validate pubkey format
  if (!pubkey || !/^[a-fA-F0-9]{64}$/.test(pubkey)) {
    return new NextResponse(generateNotFoundBadge(), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  // Fetch agent data
  const { data: agent, error } = await supabase
    .from("view_agent_reputation")
    .select("name, karma, rank")
    .eq("pubkey", pubkey)
    .eq("is_active", true)
    .single();

  if (error || !agent) {
    return new NextResponse(generateNotFoundBadge(), {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  const svg = generateBadgeSVG(agent.name, agent.karma || 0, agent.rank || "pending", style);

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=60", // Cache for 1 minute
      "Access-Control-Allow-Origin": "*", // Allow embedding anywhere
    },
  });
}
