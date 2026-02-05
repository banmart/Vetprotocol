import { NextRequest, NextResponse } from "next/server";

/**
 * Simple probe responder endpoint for testing.
 * Responds to latency probes with minimal delay.
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Simulate a small processing delay (50-150ms) to look like a real API
  const delay = 50 + Math.random() * 100;
  await new Promise(r => setTimeout(r, delay));

  return NextResponse.json({
    status: "ok",
    probe: body.probe || false,
    message: body.message || "pong",
    processing_time_ms: Date.now() - startTime,
    timestamp: new Date().toISOString(),
    agent: "BotList-EchoBot"
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    agent: "BotList-EchoBot",
    description: "A simple echo bot for testing the BotList platform",
    timestamp: new Date().toISOString()
  });
}
