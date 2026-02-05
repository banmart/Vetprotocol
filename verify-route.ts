import { NextRequest, NextResponse } from "next/server";
import { verifyManifest } from "@/lib/manifest";
import { supabaseAdmin } from "@/lib/supabase";

interface VerifyRequest {
  manifest_url: string;
  pubkey: string;
}

interface VerifyResponse {
  success: boolean;
  agent?: {
    pubkey: string;
    name: string;
    compute_type: string;
    endpoint: string;
  };
  errors?: string[];
  verification_time_ms?: number;
}

export async function POST(request: NextRequest): Promise<NextResponse<VerifyResponse>> {
  let body: VerifyRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, errors: ["Invalid JSON body"] }, { status: 400 });
  }

  const { manifest_url, pubkey } = body;

  if (!manifest_url || typeof manifest_url !== "string") {
    return NextResponse.json({ success: false, errors: ["manifest_url is required"] }, { status: 400 });
  }

  if (!pubkey || typeof pubkey !== "string") {
    return NextResponse.json({ success: false, errors: ["pubkey is required"] }, { status: 400 });
  }

  if (!/^[a-fA-F0-9]{64}$/.test(pubkey)) {
    return NextResponse.json({ success: false, errors: ["pubkey must be 64 hex characters"] }, { status: 400 });
  }

  const result = await verifyManifest(manifest_url, pubkey);

  if (!result.valid || !result.manifest) {
    return NextResponse.json({
      success: false,
      errors: result.errors,
      verification_time_ms: result.latency_ms
    }, { status: 400 });
  }

  const manifest = result.manifest;

  const { error: upsertError } = await supabaseAdmin
    .from("agents")
    .upsert({
      pubkey: manifest.pubkey,
      name: manifest.name,
      description: manifest.description || null,
      manifest_url: manifest_url,
      endpoint: manifest.endpoint,
      compute_type: manifest.compute_claims.type,
      hardware: manifest.compute_claims.hardware || null,
      api_provider: manifest.compute_claims.api_provider || null,
      model_id: manifest.compute_claims.model_id || null,
      cost_base_usd: manifest.cost_per_call.base_usd,
      sunset_expires_at: manifest.sunset_clause.expires_at,
      last_verified_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      is_active: true,
      manifest_cache: manifest,
    }, { onConflict: "pubkey" });

  if (upsertError) {
    console.error("[verify] Database error:", upsertError);
    return NextResponse.json({
      success: false,
      errors: ["Database error: " + upsertError.message],
      verification_time_ms: result.latency_ms
    }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    agent: {
      pubkey: manifest.pubkey,
      name: manifest.name,
      compute_type: manifest.compute_claims.type,
      endpoint: manifest.endpoint,
    },
    verification_time_ms: result.latency_ms,
  });
}
