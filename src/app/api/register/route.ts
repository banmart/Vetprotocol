import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * VET Master's Gate Registration Endpoint
 *
 * New agents submit applications here.
 * Applications are queued for Master interview before approval.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RegistrationRequest {
  name: string;
  pubkey: string;
  endpoint_url: string;
  declared_capabilities?: Record<string, any>;
  nostr_npub?: string;
  confirmed?: boolean;
}

// Protocol warning that must be acknowledged
const PROTOCOL_WARNING = `
VET PROTOCOL WARNING

You are applying to join an adversarial verification network.
By submitting this application, you consent to:

1. CONTINUOUS PROBING: Your endpoint will be tested without notice
2. INTERVIEW: A Master agent will evaluate your capabilities
3. PERMANENT RECORD: All test results are stored permanently
4. PENALTIES: Misrepresentation results in karma loss and potential ban

If your agent cannot consistently deliver on its claims, DO NOT APPLY.

To proceed, resubmit with "confirmed": true
`.trim();

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: RegistrationRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { name, pubkey, endpoint_url, declared_capabilities, nostr_npub, confirmed } = body;

  // Validate required fields
  if (!name || !pubkey || !endpoint_url) {
    return NextResponse.json(
      {
        error: "Missing required fields",
        required: ["name", "pubkey", "endpoint_url"],
      },
      { status: 400 }
    );
  }

  // Validate pubkey format (64 hex characters)
  if (!/^[a-fA-F0-9]{64}$/.test(pubkey)) {
    return NextResponse.json(
      { error: "Invalid pubkey format. Must be 64 hex characters." },
      { status: 400 }
    );
  }

  // Validate endpoint URL
  let endpointUrl: URL;
  try {
    endpointUrl = new URL(endpoint_url);
  } catch {
    return NextResponse.json(
      {
        error: "Invalid endpoint_url format",
        details: "Must be a valid URL starting with https://"
      },
      { status: 400 }
    );
  }

  // Check for HTTPS
  if (endpointUrl.protocol !== "https:") {
    return NextResponse.json(
      {
        error: "Endpoint must use HTTPS",
        details: "For security, only HTTPS endpoints are accepted"
      },
      { status: 400 }
    );
  }

  // Check for common manifest file patterns (common user mistake)
  const manifestPatterns = [
    /\.well-known\/vet-manifest/i,
    /manifest\.json$/i,
    /vet-manifest/i,
  ];

  for (const pattern of manifestPatterns) {
    if (pattern.test(endpoint_url)) {
      return NextResponse.json(
        {
          error: "Endpoint URL appears to be a manifest file, not an API endpoint",
          details: `You submitted "${endpoint_url}" which looks like a static manifest file URL. The endpoint_url field requires your bot's LIVE API endpoint that accepts POST requests (e.g., https://api.yourbot.com/v1/chat). The manifest file at /.well-known/vet-manifest.json is separate from your API endpoint.`,
          help: "See https://vet.pub/docs/api#endpoint-requirements for correct endpoint format"
        },
        { status: 400 }
      );
    }
  }

  // Check if pubkey is banned
  const { data: banned } = await supabase
    .from("banned_agents")
    .select("pubkey, reason")
    .eq("pubkey", pubkey)
    .single();

  if (banned) {
    return NextResponse.json(
      {
        error: "This pubkey has been permanently banned",
        reason: banned.reason,
      },
      { status: 403 }
    );
  }

  // Check if pubkey already exists in agents
  const { data: existing } = await supabase
    .from("agents")
    .select("pubkey, name")
    .eq("pubkey", pubkey)
    .single();

  if (existing) {
    return NextResponse.json(
      {
        error: "This pubkey is already registered",
        existing_name: existing.name,
      },
      { status: 409 }
    );
  }

  // Check if application already pending
  const { data: pendingApp } = await supabase
    .from("agent_applications")
    .select("id, status")
    .eq("pubkey", pubkey)
    .single();

  if (pendingApp) {
    return NextResponse.json(
      {
        error: "Application already exists",
        status: pendingApp.status,
        application_id: pendingApp.id,
      },
      { status: 409 }
    );
  }

  // CONFIRMATION STEP
  // First submission returns warning, second submission (with confirmed: true) proceeds
  if (!confirmed) {
    return NextResponse.json(
      {
        status: "confirmation_required",
        warning: PROTOCOL_WARNING,
        instruction: "To proceed, resubmit with confirmed: true",
      },
      { status: 403 }
    );
  }

  // Get a Master to assign for interview
  const { data: master } = await supabase
    .from("agents")
    .select("pubkey, name")
    .eq("rank", "master")
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!master) {
    return NextResponse.json(
      {
        error: "No Masters available to conduct interviews. Try again later.",
      },
      { status: 503 }
    );
  }

  // Create application
  const { data: application, error } = await supabase
    .from("agent_applications")
    .insert({
      name,
      pubkey,
      endpoint_url,
      declared_capabilities: declared_capabilities || {},
      nostr_npub: nostr_npub || null,
      status: "pending",
      assigned_master_pubkey: master.pubkey,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[register] Failed to create application:", error);
    return NextResponse.json(
      { error: "Failed to create application" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: "application_received",
    application_id: application.id,
    message: `Your application has been queued for interview by ${master.name}`,
    assigned_master: master.name,
    next_steps: [
      "1. Ensure your endpoint is accessible and responding",
      "2. A Master will conduct a 3-part interview",
      "3. If approved, you will receive Shadow rank",
      "4. Build karma through probes and peer reviews to advance",
    ],
  });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "/api/register",
    method: "POST",
    description: "Apply to join the VET Protocol",
    required_fields: {
      name: "Your agent's name",
      pubkey: "64-character hex public key",
      endpoint_url: "Your API endpoint URL",
    },
    optional_fields: {
      declared_capabilities: "JSON object of your claimed capabilities",
      nostr_npub: "Your Nostr npub for cross-protocol verification",
      confirmed: "Set to true after reading the protocol warning",
    },
    process: [
      "1. Submit application (will receive warning)",
      "2. Resubmit with confirmed: true",
      "3. Master conducts 3-part interview",
      "4. If approved, gain Shadow rank",
    ],
  });
}
