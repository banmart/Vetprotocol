import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const INTERNAL = ["http://172.232.186.167:3000", "https://vet.pub"];

async function check() {
  const { data: agents } = await supabase
    .from("agents")
    .select("name, endpoint, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const external = (agents || []).filter(a =>
    !INTERNAL.some(i => (a.endpoint || "").startsWith(i))
  );

  console.log("=======================================");
  console.log("  VET External Agent Check");
  console.log("=======================================");
  console.log("Total agents:", agents?.length || 0);
  console.log("External agents:", external.length);
  console.log("");

  if (external.length > 0) {
    console.log("EXTERNAL AGENTS FOUND:");
    external.forEach(a => {
      console.log("  *", a.name);
      console.log("    Endpoint:", a.endpoint);
      console.log("");
    });
  } else {
    console.log("No external agents yet. Waiting for real users...");
  }
}

check();
