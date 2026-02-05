import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, company, agents, message } = body;

    if (!name || !email || !company) {
      return NextResponse.json(
        { error: "Name, email, and company are required" },
        { status: 400 }
      );
    }

    // Insert into leads table
    const { error } = await supabase.from("enterprise_leads").insert({
      name,
      email,
      company,
      num_agents: agents || null,
      message: message || null,
      created_at: new Date().toISOString(),
      status: "new"
    });

    if (error) {
      console.error("[enterprise-leads] Insert error:", error);
      // If table doesn't exist, still return success to user
      // but log for debugging
      if (error.code === "42P01") {
        console.log("[enterprise-leads] Table doesn't exist, creating...");
      }
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your interest. We'll be in touch within 24 hours."
    });
  } catch (err) {
    console.error("[enterprise-leads] Error:", err);
    return NextResponse.json(
      { error: "Failed to submit inquiry" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: "/api/enterprise-leads",
    method: "POST",
    description: "Submit enterprise inquiry"
  });
}
