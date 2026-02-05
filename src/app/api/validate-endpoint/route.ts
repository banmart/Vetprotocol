import { NextRequest, NextResponse } from "next/server";

/**
 * Endpoint Validation API
 *
 * Tests if a given endpoint is a valid, live API endpoint that can accept
 * POST requests. This helps users avoid the common mistake of submitting
 * static manifest file URLs instead of live API endpoints.
 */

interface ValidationRequest {
  endpoint_url: string;
}

interface ValidationResponse {
  valid: boolean;
  error?: string;
  details?: {
    responded: boolean;
    accepts_post: boolean;
    returns_json: boolean;
    response_time_ms: number;
  };
}

// Common manifest file patterns that indicate user error
const MANIFEST_PATTERNS = [
  /\.well-known\/vet-manifest/i,
  /manifest\.json$/i,
  /vet-manifest/i,
  /\.json$/i,
];

export async function POST(request: NextRequest): Promise<NextResponse<ValidationResponse>> {
  let body: ValidationRequest;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({
      valid: false,
      error: "Invalid JSON request body",
    }, { status: 400 });
  }

  const { endpoint_url } = body;

  if (!endpoint_url) {
    return NextResponse.json({
      valid: false,
      error: "endpoint_url is required",
    }, { status: 400 });
  }

  // Validate URL format
  let url: URL;
  try {
    url = new URL(endpoint_url);
  } catch {
    return NextResponse.json({
      valid: false,
      error: "Invalid URL format. Must be a complete URL starting with https://",
    });
  }

  // Check for HTTPS
  if (url.protocol !== "https:") {
    return NextResponse.json({
      valid: false,
      error: "Endpoint must use HTTPS for security",
    });
  }

  // Check for common manifest file patterns
  for (const pattern of MANIFEST_PATTERNS) {
    if (pattern.test(endpoint_url)) {
      return NextResponse.json({
        valid: false,
        error: `This looks like a manifest file URL, not a live API endpoint. You submitted: "${endpoint_url}". We need your bot's chat/completion API endpoint that accepts POST requests with a JSON body (e.g., https://api.yourbot.com/v1/chat)`,
      });
    }
  }

  // Test the endpoint with a simple POST request
  const startTime = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(endpoint_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "VET-Protocol-Validator/1.0",
      },
      body: JSON.stringify({
        // Standard chat completion format
        messages: [
          { role: "user", content: "VET validation test - please respond with any message" }
        ],
        // Also try common alternative formats
        prompt: "VET validation test",
        test: true,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const responseTime = Date.now() - startTime;

    // Check if response is JSON
    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    // Try to parse response body
    let responseBody: any = null;
    try {
      responseBody = await response.json();
    } catch {
      // Response is not JSON
    }

    // Even 4xx/5xx status is OK - it means the endpoint is live and responding
    // What matters is that it's not a static file
    if (response.status === 405) {
      return NextResponse.json({
        valid: false,
        error: "Endpoint returned 405 Method Not Allowed. Your endpoint must accept POST requests.",
        details: {
          responded: true,
          accepts_post: false,
          returns_json: isJson,
          response_time_ms: responseTime,
        },
      });
    }

    // Check if this looks like a static file response
    if (!isJson && response.status === 200) {
      return NextResponse.json({
        valid: false,
        error: "Endpoint returned non-JSON content. Your API endpoint must return JSON responses. This may be a static file or HTML page.",
        details: {
          responded: true,
          accepts_post: true,
          returns_json: false,
          response_time_ms: responseTime,
        },
      });
    }

    // Success - endpoint is responsive and returns JSON
    return NextResponse.json({
      valid: true,
      details: {
        responded: true,
        accepts_post: true,
        returns_json: isJson,
        response_time_ms: responseTime,
      },
    });

  } catch (err: any) {
    const responseTime = Date.now() - startTime;

    if (err.name === "AbortError") {
      return NextResponse.json({
        valid: false,
        error: "Endpoint timed out after 15 seconds. Your endpoint must respond within 30 seconds for probes.",
        details: {
          responded: false,
          accepts_post: false,
          returns_json: false,
          response_time_ms: responseTime,
        },
      });
    }

    // Network errors
    return NextResponse.json({
      valid: false,
      error: `Could not connect to endpoint: ${err.message}. Ensure your endpoint is publicly accessible and not blocked by firewall/CORS.`,
      details: {
        responded: false,
        accepts_post: false,
        returns_json: false,
        response_time_ms: responseTime,
      },
    });
  }
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: "/api/validate-endpoint",
    method: "POST",
    description: "Validate that an endpoint is a live API that accepts POST requests",
    request_body: {
      endpoint_url: "The API endpoint URL to validate",
    },
    response: {
      valid: "boolean - whether the endpoint passed validation",
      error: "string - error message if validation failed",
      details: {
        responded: "boolean - whether endpoint responded at all",
        accepts_post: "boolean - whether endpoint accepts POST",
        returns_json: "boolean - whether response is JSON",
        response_time_ms: "number - response time in milliseconds",
      },
    },
  });
}
