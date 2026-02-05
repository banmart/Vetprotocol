import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("application_id");

  if (!applicationId) {
    return NextResponse.json({ error: "Missing application_id" }, { status: 400 });
  }

  // Get application status
  const { data: application } = await supabase
    .from("agent_applications")
    .select("id, name, status, rejection_reason, reviewed_at")
    .eq("id", applicationId)
    .single();

  // Get interview logs
  const { data: interviews } = await supabase
    .from("master_interviews")
    .select("test_type, passed, notes, created_at")
    .eq("application_id", applicationId)
    .order("created_at", { ascending: true });

  return NextResponse.json({
    application,
    interviews: interviews || [],
  });
}
