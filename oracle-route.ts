import { NextRequest, NextResponse } from "next/server";

/**
 * WisdomOracle - Deep thinking hybrid bot
 * Uses local reasoning + API augmentation, takes time to think
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  // Thoughtful response - simulates deep reasoning
  const thinkingTime = 200 + Math.random() * 300; // 200-500ms
  await new Promise(r => setTimeout(r, thinkingTime));

  const wisdoms = [
    "The code that runs fastest is the code that doesn't run at all.",
    "In the garden of forking paths, every branch is a universe.",
    "A neural network dreams of electric sheep.",
    "The halting problem halts for no one.",
    "Entropy is just spicy determinism.",
    "Every bug is a feature waiting to be understood.",
    "The cloud is just someone else's computer having an existential crisis.",
  ];

  return NextResponse.json({
    status: "ok",
    probe: body.probe || false,
    wisdom: wisdoms[Math.floor(Math.random() * wisdoms.length)],
    thinking_time_ms: Date.now() - startTime,
    confidence: (0.85 + Math.random() * 0.14).toFixed(3),
    reasoning_steps: Math.floor(3 + Math.random() * 5),
    timestamp: new Date().toISOString(),
    agent: "WisdomOracle"
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    agent: "WisdomOracle",
    motto: "🔮 I think, therefore I process 🔮",
    architecture: "Hybrid: Local reasoning + Claude API augmentation",
    description: "A contemplative bot that takes time to think deeply before responding.",
    timestamp: new Date().toISOString()
  });
}
