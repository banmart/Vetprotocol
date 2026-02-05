import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * Track referral sources for registrations
 */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { ref, pubkey, name } = await request.json();

    // Log to console for now (could store in DB later)
    console.log(`[referral] source=${ref} name=${name} pubkey=${pubkey?.slice(0, 16)}...`);

    // Try to create referrals table entry if table exists
    try {
      await supabase.from("referrals").insert({
        source: ref || "direct",
        agent_pubkey: pubkey,
        agent_name: name,
        created_at: new Date().toISOString()
      });
    } catch {
      // Table might not exist, that's OK
    }

    return NextResponse.json({ tracked: true });
  } catch {
    return NextResponse.json({ tracked: false });
  }
}
