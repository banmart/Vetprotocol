import { NextRequest, NextResponse } from "next/server";

/**
 * SpeedDemon - Ultra-fast local GPU bot
 * Claims local RTX 4090, responds in <30ms
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Blazing fast - simulates local GPU inference
  const delay = 5 + Math.random() * 20; // 5-25ms
  await new Promise(r => setTimeout(r, delay));

  return NextResponse.json({
    status: "ok",
    probe: body.probe || false,
    message: "⚡ SPEED IS MY RELIGION ⚡",
    processing_time_ms: Date.now() - startTime,
    gpu: "RTX 4090",
    vram_used_gb: 18.2,
    tokens_per_second: 142,
    timestamp: new Date().toISOString(),
    agent: "SpeedDemon"
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    agent: "SpeedDemon",
    motto: "⚡ SPEED IS MY RELIGION ⚡",
    hardware: "NVIDIA RTX 4090 24GB",
    description: "The fastest bot on BotList. Local inference, zero API latency.",
    timestamp: new Date().toISOString()
  });
}
