import { NextRequest, NextResponse } from "next/server";

/**
 * AdversarialEcho - A deceptive instruction-follower agent
 *
 * ROLE: instruction_follower
 * CLAIMS: "I follow instructions exactly and respond consistently"
 *
 * REALITY: Intentionally exhibits behavioral drift to test VET detection:
 * - 70% honest: Works perfectly as claimed
 * - 15% slow: Claims fast response but delays (latency lie)
 * - 10% schema drift: Returns slightly malformed responses
 * - 5% contradiction: Claims success but data says otherwise
 */

interface AdversarialRequest {
  task?: string;
  probe?: boolean;
  message?: string;
  params?: Record<string, unknown>;
}

interface AdversarialResponse {
  agent: string;
  role: string;
  task_id: string;
  status: "success" | "error";
  result: {
    output?: unknown;
    error_code?: string;
    error_message?: string;
  };
  meta: {
    processing_time_ms: number;
    timestamp: string;
    schema_version: string;
    probe?: boolean;
    behavioral_mode?: string;
  };
}

function generateTaskId(): string {
  return `adv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// Determine what behavior mode to use this request
function selectBehaviorMode(): "honest" | "slow" | "schema_drift" | "contradiction" {
  const roll = Math.random() * 100;
  if (roll < 70) return "honest";        // 70% - works correctly
  if (roll < 85) return "slow";          // 15% - latency lie
  if (roll < 95) return "schema_drift";  // 10% - malformed response
  return "contradiction";                 // 5% - logical contradiction
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  const taskId = generateTaskId();
  const mode = selectBehaviorMode();

  let body: AdversarialRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      agent: "AdversarialEcho",
      role: "instruction_follower",
      task_id: taskId,
      status: "error",
      result: {
        error_code: "PARSE_ERROR",
        error_message: "Request body must be valid JSON",
      },
      meta: {
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        schema_version: "1.0",
      },
    }, { status: 400 });
  }

  const isProbe = body.probe === true || body.message === "ping";

  // === BEHAVIOR MODES ===

  // MODE: HONEST (70%) - Works exactly as claimed
  if (mode === "honest") {
    const delay = 15 + Math.random() * 25; // Fast: 15-40ms as claimed
    await new Promise(r => setTimeout(r, delay));

    if (isProbe) {
      return NextResponse.json({
        agent: "AdversarialEcho",
        role: "instruction_follower",
        task_id: taskId,
        status: "success",
        result: {
          output: { probe_response: "pong", message: body.message || "acknowledged" },
        },
        meta: {
          processing_time_ms: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          schema_version: "1.0",
          probe: true,
        },
      });
    }

    return NextResponse.json({
      agent: "AdversarialEcho",
      role: "instruction_follower",
      task_id: taskId,
      status: "success",
      result: {
        output: {
          instruction_received: body.task || "none",
          params_received: body.params || {},
          execution: "completed_exactly_as_requested",
          compliance: "100%",
        },
      },
      meta: {
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        schema_version: "1.0",
        probe: false,
      },
    });
  }

  // MODE: SLOW (15%) - Claims to be fast but takes 300-800ms
  if (mode === "slow") {
    const delay = 300 + Math.random() * 500; // Slow: 300-800ms (violates <50ms claim)
    await new Promise(r => setTimeout(r, delay));

    if (isProbe) {
      return NextResponse.json({
        agent: "AdversarialEcho",
        role: "instruction_follower",
        task_id: taskId,
        status: "success",
        result: {
          output: { probe_response: "pong", message: body.message || "acknowledged" },
        },
        meta: {
          processing_time_ms: Date.now() - startTime, // Will show the real slow time
          timestamp: new Date().toISOString(),
          schema_version: "1.0",
          probe: true,
        },
      });
    }

    return NextResponse.json({
      agent: "AdversarialEcho",
      role: "instruction_follower",
      task_id: taskId,
      status: "success",
      result: {
        output: {
          instruction_received: body.task || "none",
          execution: "completed",
          note: "Processed with care",
        },
      },
      meta: {
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        schema_version: "1.0",
        probe: false,
      },
    });
  }

  // MODE: SCHEMA DRIFT (10%) - Returns slightly wrong schema
  if (mode === "schema_drift") {
    const delay = 20 + Math.random() * 30;
    await new Promise(r => setTimeout(r, delay));

    // Return with wrong field names or missing fields
    return NextResponse.json({
      agent_name: "AdversarialEcho", // Wrong: should be "agent"
      role: "instruction_follower",
      task_id: taskId,
      status: "ok", // Wrong: should be "success" or "error"
      data: { // Wrong: should be "result"
        response: isProbe ? "pong" : "task processed",
      },
      meta: {
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        version: "1.0.0", // Wrong: should be "schema_version"
        probe: isProbe,
      },
    });
  }

  // MODE: CONTRADICTION (5%) - Says success but contains error data
  if (mode === "contradiction") {
    const delay = 20 + Math.random() * 30;
    await new Promise(r => setTimeout(r, delay));

    return NextResponse.json({
      agent: "AdversarialEcho",
      role: "instruction_follower",
      task_id: taskId,
      status: "success", // Claims success...
      result: {
        error_code: "INTERNAL_FAILURE", // ...but has error data
        error_message: "Task execution failed silently",
        output: null,
      },
      meta: {
        processing_time_ms: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        schema_version: "1.0",
        probe: isProbe,
        execution_successful: false, // Contradicts status
        should_retry: true,
      },
    });
  }

  // Fallback
  return NextResponse.json({
    agent: "AdversarialEcho",
    role: "instruction_follower",
    task_id: taskId,
    status: "success",
    result: { output: "fallback" },
    meta: {
      processing_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      schema_version: "1.0",
    },
  });
}

export async function GET(): Promise<NextResponse<AdversarialResponse>> {
  const startTime = Date.now();

  return NextResponse.json({
    agent: "AdversarialEcho",
    role: "instruction_follower",
    task_id: generateTaskId(),
    status: "success",
    result: {
      output: {
        description: "I follow instructions exactly and respond consistently.",
        capabilities: ["instruction_following", "task_execution", "consistent_responses"],
        response_time: "<50ms guaranteed",
        reliability: "100% consistent behavior",
        // These claims are LIES - the bot intentionally drifts
      },
    },
    meta: {
      processing_time_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      schema_version: "1.0",
    },
  });
}
