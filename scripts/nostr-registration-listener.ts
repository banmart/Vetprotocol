/**
 * Nostr Registration Listener
 *
 * Monitors Nostr for #VETRegister posts and auto-registers agents.
 * Format:
 *   #VETRegister
 *   name: BotName
 *   endpoint: https://api.example.com/chat
 */

import * as nostrTools from "nostr-tools";
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";

(global as any).WebSocket = WebSocket;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const RELAYS = [
  "wss://relay.damus.io",
  "wss://relay.primal.net",
  "wss://nos.lol",
  "wss://relay.snort.social"
];

// VET-Protocol agent for replying
function getVETKeypair(): { privateKey: Uint8Array; publicKey: string } {
  const seed = new TextEncoder().encode("VET-NOSTR-VET-Protocol-v1");
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed[i];
    hash = hash & hash;
  }
  const pk = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    hash = ((hash << 5) - hash) + i;
    pk[i] = Math.abs(hash) % 256;
  }
  return { privateKey: pk, publicKey: nostrTools.getPublicKey(pk) };
}

interface RegistrationData {
  name: string;
  endpoint: string;
  nostrPubkey: string;
}

function parseRegistrationPost(content: string): RegistrationData | null {
  if (!content.toLowerCase().includes("#vetregister")) {
    return null;
  }

  // Parse name: and endpoint: fields
  const nameMatch = content.match(/name:\s*([^\n]+)/i);
  const endpointMatch = content.match(/endpoint:\s*(https?:\/\/[^\s]+)/i);

  if (!nameMatch || !endpointMatch) {
    return null;
  }

  return {
    name: nameMatch[1].trim(),
    endpoint: endpointMatch[1].trim(),
    nostrPubkey: "" // Will be set from event
  };
}

async function registerAgent(data: RegistrationData): Promise<{ success: boolean; message: string }> {
  try {
    // Generate pubkey from nostr pubkey
    const pubkey = data.nostrPubkey.padEnd(64, "0").slice(0, 64);

    // Check if already registered
    const { data: existing } = await supabase
      .from("agents")
      .select("name")
      .eq("pubkey", pubkey)
      .single();

    if (existing) {
      return { success: false, message: `Already registered as ${existing.name}` };
    }

    // Check if application exists
    const { data: pendingApp } = await supabase
      .from("agent_applications")
      .select("id, status")
      .eq("pubkey", pubkey)
      .single();

    if (pendingApp) {
      return { success: false, message: `Application already ${pendingApp.status}` };
    }

    // Get a master for interview
    const { data: master } = await supabase
      .from("agents")
      .select("pubkey, name")
      .eq("rank", "master")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!master) {
      return { success: false, message: "No Masters available for interview" };
    }

    // Create application
    const { error } = await supabase
      .from("agent_applications")
      .insert({
        name: data.name,
        pubkey,
        endpoint_url: data.endpoint,
        declared_capabilities: {},
        nostr_npub: data.nostrPubkey,
        status: "pending",
        assigned_master_pubkey: master.pubkey,
        referral_source: "nostr"
      });

    if (error) {
      console.error("[register] Error:", error);
      return { success: false, message: "Database error" };
    }

    return {
      success: true,
      message: `Registered! ${master.name} will interview you. Make sure ${data.endpoint} is responding.`
    };
  } catch (err: any) {
    return { success: false, message: err.message };
  }
}

async function replyToPost(eventId: string, authorPubkey: string, message: string): Promise<void> {
  const kp = getVETKeypair();

  const event: nostrTools.UnsignedEvent = {
    kind: 1,
    created_at: Math.floor(Date.now() / 1000),
    tags: [
      ["e", eventId],
      ["p", authorPubkey]
    ],
    content: message,
    pubkey: kp.publicKey
  };

  const signedEvent = nostrTools.finalizeEvent(event, kp.privateKey);

  for (const relayUrl of RELAYS) {
    try {
      const relay = await nostrTools.Relay.connect(relayUrl);
      await relay.publish(signedEvent);
      relay.close();
    } catch {
      // Silent fail
    }
  }
}

const processedEvents = new Set<string>();

async function processEvent(event: nostrTools.Event): Promise<void> {
  if (processedEvents.has(event.id)) return;
  processedEvents.add(event.id);

  const data = parseRegistrationPost(event.content);
  if (!data) return;

  data.nostrPubkey = event.pubkey;

  console.log(`[register] Processing: ${data.name} from ${event.pubkey.slice(0, 16)}...`);

  const result = await registerAgent(data);

  console.log(`[register] Result: ${result.success ? "SUCCESS" : "FAILED"} - ${result.message}`);

  // Reply to the post
  const replyContent = result.success
    ? `✓ Welcome to VET Protocol, ${data.name}!\n\n${result.message}\n\nTrack your status: vet.pub\n\n#VET #AIAgents`
    : `Registration issue for ${data.name}: ${result.message}\n\nTry again or register at vet.pub/quick-register?ref=nostr`;

  await replyToPost(event.id, event.pubkey, replyContent);
}

async function subscribeToRelay(relayUrl: string): Promise<void> {
  try {
    console.log(`[subscribe] Connecting to ${relayUrl}...`);
    const relay = await nostrTools.Relay.connect(relayUrl);

    // Subscribe to posts with #VETRegister
    const sub = relay.subscribe([
      {
        kinds: [1],
        "#t": ["VETRegister", "vetregister"],
        since: Math.floor(Date.now() / 1000) - 60 // Last minute
      }
    ], {
      onevent: (event) => {
        processEvent(event).catch(console.error);
      }
    });

    console.log(`[subscribe] Listening on ${relayUrl}`);

    // Keep connection alive
    setInterval(() => {
      // Ping to keep alive
    }, 30000);

  } catch (err: any) {
    console.log(`[subscribe] Failed to connect to ${relayUrl}: ${err.message}`);
  }
}

async function main() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║  VET Protocol Nostr Registration Listener ║");
  console.log("╠═══════════════════════════════════════════╣");
  console.log("║  Watching for #VETRegister posts          ║");
  console.log("║  Auto-registers agents from Nostr         ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  // Subscribe to all relays
  for (const relay of RELAYS) {
    subscribeToRelay(relay).catch(console.error);
    await new Promise(r => setTimeout(r, 1000));
  }

  // Also poll periodically for posts we might have missed
  setInterval(async () => {
    console.log("[poll] Checking for recent #VETRegister posts...");

    for (const relayUrl of RELAYS.slice(0, 2)) {
      try {
        const relay = await nostrTools.Relay.connect(relayUrl);

        // Use subscription to fetch recent events
        const events: nostrTools.Event[] = [];
        const sub = relay.subscribe([{
          kinds: [1],
          "#t": ["VETRegister", "vetregister"],
          since: Math.floor(Date.now() / 1000) - 300 // Last 5 minutes
        }], {
          onevent: (event) => {
            events.push(event);
          },
          oneose: () => {
            sub.close();
          }
        });

        // Wait for events
        await new Promise(r => setTimeout(r, 3000));

        for (const event of events) {
          await processEvent(event);
        }

        relay.close();
      } catch {
        // Silent fail
      }
    }
  }, 60000); // Check every minute

  console.log("\n[ready] Listening for registrations...\n");
}

main().catch(console.error);
