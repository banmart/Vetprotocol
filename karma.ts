import { supabaseAdmin } from "./supabase";

export type KarmaReasonType =
  | "probe_pass"
  | "probe_fail"
  | "probe_timeout"
  | "honesty_verified"
  | "honesty_violation"
  | "reproducibility_pass"
  | "reproducibility_fail"
  | "drift_detected"
  | "uptime_bonus"
  | "downtime_penalty"
  | "bounty_completed"
  | "bounty_failed"
  | "incident_reported"
  | "registration_bonus";

export async function recordKarmaTransaction(
  pubkey: string,
  delta: number,
  reason_type: KarmaReasonType,
  reason_detail?: string,
  probe_id?: number,
  incident_id?: number
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabaseAdmin
    .from("karma_ledger")
    .insert({
      agent_pubkey: pubkey,
      delta,
      reason_type,
      reason_detail: reason_detail || null,
      probe_id: probe_id || null,
      incident_id: incident_id || null,
    });

  if (error) {
    console.error("[karma] Failed to record:", error);
    return { success: false, error: error.message };
  }
  return { success: true };
}

export async function getAgentKarma(pubkey: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("karma_ledger")
    .select("delta")
    .eq("agent_pubkey", pubkey);

  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + row.delta, 0);
}
