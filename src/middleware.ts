import { NextRequest, NextResponse } from "next/server";

/**
 * VET Protocol Security Middleware
 *
 * Implements:
 * 1. Security headers (CSP, HSTS, X-Frame-Options, etc.)
 * 2. Rate limiting for API endpoints
 */

// ============================================
// RATE LIMITING CONFIGURATION
// ============================================

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Max requests per window
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // API endpoints - 30 requests per second per IP
  "/api/": {
    windowMs: 1000,        // 1 second window
    maxRequests: 30,       // 30 requests per second
  },
  // Registration - 10 per hour per IP (prevent spam)
  "/api/register": {
    windowMs: 60 * 60 * 1000, // 1 hour window
    maxRequests: 10,
  },
  // Validation endpoint - 30 per minute
  "/api/validate-endpoint": {
    windowMs: 60 * 1000,   // 1 minute window
    maxRequests: 30,
  },
};

// In-memory rate limit store (use Redis in production for multi-instance)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string, path: string): { allowed: boolean; remaining: number; resetIn: number } {
  // Find applicable rate limit config
  let config: RateLimitConfig | undefined;
  for (const [pattern, cfg] of Object.entries(RATE_LIMITS)) {
    if (path.startsWith(pattern)) {
      // Use more restrictive config if multiple match
      if (!config || cfg.maxRequests < config.maxRequests) {
        config = cfg;
      }
    }
  }

  // No rate limit for this path
  if (!config) {
    return { allowed: true, remaining: -1, resetIn: 0 };
  }

  const key = `${ip}:${path.split("/").slice(0, 3).join("/")}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);

  // Reset if window expired
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + config.windowMs };
    rateLimitStore.set(key, record);
  }

  // Check limit
  record.count++;
  const remaining = Math.max(0, config.maxRequests - record.count);
  const resetIn = Math.max(0, record.resetTime - now);

  if (record.count > config.maxRequests) {
    return { allowed: false, remaining: 0, resetIn };
  }

  return { allowed: true, remaining, resetIn };
}

// Clean up old entries periodically (simple garbage collection)
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime + 60000) { // Keep for 1 minute after expiry
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Run every minute

// ============================================
// SECURITY HEADERS
// ============================================

const securityHeaders = {
  // Prevent clickjacking
  "X-Frame-Options": "DENY",

  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // XSS protection (legacy but still useful)
  "X-XSS-Protection": "1; mode=block",

  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // HSTS - Force HTTPS for 1 year
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",

  // Content Security Policy
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires these
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),

  // Permissions Policy (disable unnecessary browser features)
  "Permissions-Policy": [
    "camera=()",
    "microphone=()",
    "geolocation=()",
    "payment=()",
  ].join(", "),
};

// ============================================
// MIDDLEWARE
// ============================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Get client IP (check various headers for proxy setups)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    request.ip ||
    "unknown";

  // Check rate limit for API routes
  if (pathname.startsWith("/api/")) {
    const { allowed, remaining, resetIn } = checkRateLimit(ip, pathname);

    if (!allowed) {
      return new NextResponse(
        JSON.stringify({
          error: "Rate limit exceeded",
          message: "Too many requests. Please slow down.",
          retry_after_ms: resetIn,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": Math.ceil(resetIn / 1000).toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": Math.ceil(resetIn / 1000).toString(),
            ...securityHeaders,
          },
        }
      );
    }

    // Continue with rate limit headers
    const response = NextResponse.next();

    // Add rate limit headers
    if (remaining >= 0) {
      response.headers.set("X-RateLimit-Remaining", remaining.toString());
      response.headers.set("X-RateLimit-Reset", Math.ceil(resetIn / 1000).toString());
    }

    // Add security headers
    for (const [key, value] of Object.entries(securityHeaders)) {
      response.headers.set(key, value);
    }

    return response;
  }

  // For non-API routes, just add security headers
  const response = NextResponse.next();

  for (const [key, value] of Object.entries(securityHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all paths except static files and images
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
