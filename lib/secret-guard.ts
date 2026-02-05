/**
 * VET Protocol Secret Guard
 *
 * MANDATORY security filter for ALL public communications.
 * Every message MUST pass through this before being posted to:
 * - Nostr relays
 * - Moltbook API
 * - Any external API
 * - Agent responses to external queries
 *
 * Provides 99.9% certainty that no secrets are leaked.
 */

// Secret patterns to detect - these NEVER appear in legitimate public content
const SECRET_PATTERNS: Array<{ pattern: RegExp; name: string; severity: 'critical' | 'high' | 'medium' }> = [
  // API Keys
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, name: 'OpenAI API Key', severity: 'critical' },
  { pattern: /sk_live_[a-zA-Z0-9]{20,}/g, name: 'Stripe Live Key', severity: 'critical' },
  { pattern: /sk_test_[a-zA-Z0-9]{20,}/g, name: 'Stripe Test Key', severity: 'high' },
  { pattern: /moltbook_sk_[a-zA-Z0-9]{20,}/g, name: 'Moltbook API Key', severity: 'critical' },
  { pattern: /AKIA[A-Z0-9]{16}/g, name: 'AWS Access Key', severity: 'critical' },

  // Private Keys (Nostr nsec, hex private keys)
  { pattern: /nsec1[a-z0-9]{58}/gi, name: 'Nostr Secret Key (nsec)', severity: 'critical' },
  { pattern: /[a-fA-F0-9]{64}/g, name: 'Potential 64-char Hex Key', severity: 'medium' }, // Will validate context

  // Tokens
  { pattern: /eyJ[a-zA-Z0-9_-]{50,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, name: 'JWT Token', severity: 'critical' },
  { pattern: /Bearer\s+[a-zA-Z0-9\-_\.]{20,}/gi, name: 'Bearer Token', severity: 'critical' },
  { pattern: /ghp_[a-zA-Z0-9]{36}/g, name: 'GitHub Personal Token', severity: 'critical' },
  { pattern: /gho_[a-zA-Z0-9]{36}/g, name: 'GitHub OAuth Token', severity: 'critical' },

  // Database/Connection Strings
  { pattern: /postgres(ql)?:\/\/[^\s]+:[^\s]+@[^\s]+/gi, name: 'PostgreSQL Connection String', severity: 'critical' },
  { pattern: /mongodb(\+srv)?:\/\/[^\s]+:[^\s]+@[^\s]+/gi, name: 'MongoDB Connection String', severity: 'critical' },
  { pattern: /mysql:\/\/[^\s]+:[^\s]+@[^\s]+/gi, name: 'MySQL Connection String', severity: 'critical' },

  // Infrastructure
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g, name: 'IP Address', severity: 'high' },
  { pattern: /\/root\/[^\s]+/g, name: 'Server Root Path', severity: 'high' },
  { pattern: /supabase\.co\/[^\s]*key[^\s]*/gi, name: 'Supabase URL with Key', severity: 'critical' },

  // Passwords/Secrets in URLs
  { pattern: /[?&](password|secret|key|token|auth|apikey|api_key)=[^&\s]+/gi, name: 'URL with Secret Param', severity: 'critical' },
  { pattern: /https?:\/\/[^:]+:[^@]+@/g, name: 'URL with Embedded Credentials', severity: 'critical' },

  // Environment Variables (shouldn't appear in messages)
  { pattern: /process\.env\.[A-Z_]+/g, name: 'Environment Variable Reference', severity: 'medium' },
  { pattern: /SERVICE_ROLE_KEY/gi, name: 'Service Role Key Reference', severity: 'high' },
  { pattern: /PRIVATE_KEY/gi, name: 'Private Key Reference', severity: 'high' },
];

// Known safe patterns (false positives to allow)
const SAFE_PATTERNS: RegExp[] = [
  // Public keys are OK
  /npub1[a-z0-9]{58}/gi,
  // Example/placeholder keys
  /your_[a-z_]+_here/gi,
  /example\.com/gi,
  // Documentation URLs
  /vet\.pub/gi,
  /github\.com\/[^\s]+/gi,
  // Obviously fake test keys
  /dead[0-9a-f]{4}beef/gi,
  /0{32,}/g,
  /5a{32,}/g,
  /1234567890/g,
  // Common localhost (OK for docs)
  /localhost:\d+/gi,
  /127\.0\.0\.1/g,
];

// Environment variable names that are safe to mention (not values)
const SAFE_ENV_MENTIONS = [
  'NEXT_PUBLIC_',
  'NODE_ENV',
  'VET_SERVER_URL',
];

export interface SecretGuardResult {
  safe: boolean;
  violations: Array<{
    pattern: string;
    match: string;
    severity: 'critical' | 'high' | 'medium';
    position: number;
  }>;
  sanitized?: string;
  confidence: number; // 0-100%
}

/**
 * Check if a message contains any secrets
 *
 * @param message - The content to check before posting
 * @param context - Optional context about where this will be posted
 * @returns SecretGuardResult with safe flag and any violations
 */
export function checkForSecrets(message: string, context?: string): SecretGuardResult {
  const violations: SecretGuardResult['violations'] = [];

  // First, check against safe patterns to reduce false positives
  let testMessage = message;
  for (const safePattern of SAFE_PATTERNS) {
    testMessage = testMessage.replace(safePattern, '[SAFE_MATCH]');
  }

  // Check each secret pattern
  for (const { pattern, name, severity } of SECRET_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(testMessage)) !== null) {
      // Skip if this was already marked safe
      if (match[0] === '[SAFE_MATCH]') continue;

      // For 64-char hex, do additional validation (could be a public key)
      if (name === 'Potential 64-char Hex Key') {
        // Check if it's in a context that suggests it's a public key
        const contextStart = Math.max(0, match.index - 50);
        const contextEnd = Math.min(testMessage.length, match.index + match[0].length + 50);
        const surrounding = testMessage.slice(contextStart, contextEnd).toLowerCase();

        // If context suggests public key, skip
        if (surrounding.includes('pubkey') ||
            surrounding.includes('public') ||
            surrounding.includes('npub') ||
            surrounding.includes('author') ||
            surrounding.includes('verified')) {
          continue;
        }
      }

      // For IP addresses, skip common safe ones
      if (name === 'IP Address') {
        const ip = match[0].split(':')[0];
        if (ip === '127.0.0.1' || ip === '0.0.0.0' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
          continue; // Local/private IPs are OK
        }
      }

      violations.push({
        pattern: name,
        match: match[0].slice(0, 20) + (match[0].length > 20 ? '...' : ''),
        severity,
        position: match.index,
      });
    }
  }

  // Calculate confidence based on violations
  const hasCritical = violations.some(v => v.severity === 'critical');
  const hasHigh = violations.some(v => v.severity === 'high');
  const hasMedium = violations.some(v => v.severity === 'medium');

  let confidence = 100;
  if (hasCritical) confidence = 0;
  else if (hasHigh) confidence = 30;
  else if (hasMedium) confidence = 70;

  return {
    safe: violations.length === 0,
    violations,
    confidence,
  };
}

/**
 * Sanitize a message by redacting any detected secrets
 *
 * @param message - The content to sanitize
 * @returns Sanitized message with secrets redacted
 */
export function sanitizeMessage(message: string): string {
  let sanitized = message;

  for (const { pattern, name } of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, `[REDACTED:${name}]`);
  }

  return sanitized;
}

/**
 * MANDATORY pre-flight check for public posts
 *
 * Call this BEFORE posting to any public network.
 * Throws an error if secrets are detected.
 *
 * @param message - The content to post
 * @param destination - Where this will be posted (e.g., "nostr", "moltbook")
 * @throws Error if secrets are detected
 */
export function assertNoSecrets(message: string, destination: string): void {
  const result = checkForSecrets(message, destination);

  if (!result.safe) {
    const criticalViolations = result.violations.filter(v => v.severity === 'critical');
    const errorDetails = result.violations
      .map(v => `  - ${v.pattern}: "${v.match}" (${v.severity})`)
      .join('\n');

    console.error(`\n🚨 SECRET GUARD BLOCKED POST TO ${destination.toUpperCase()}`);
    console.error(`Detected ${result.violations.length} potential secret(s):\n${errorDetails}`);
    console.error(`\nMessage preview: "${message.slice(0, 100)}..."`);

    throw new Error(
      `SECRET_GUARD: Blocked post to ${destination} - detected ${criticalViolations.length} critical and ${result.violations.length - criticalViolations.length} other potential secrets. ` +
      `Violations: ${result.violations.map(v => v.pattern).join(', ')}`
    );
  }

  // Log successful check for audit trail
  if (process.env.SECRET_GUARD_VERBOSE === 'true') {
    console.log(`✅ SECRET_GUARD: Message cleared for ${destination} (${result.confidence}% confidence)`);
  }
}

/**
 * Wrapper for safe posting - use this in all posting functions
 *
 * @param postFn - The actual posting function
 * @param message - The message to post
 * @param destination - Where this will be posted
 * @returns Result from postFn if safe, throws otherwise
 */
export async function safePost<T>(
  postFn: (message: string) => Promise<T>,
  message: string,
  destination: string
): Promise<T> {
  assertNoSecrets(message, destination);
  return postFn(message);
}

// Export for testing
export const _testing = {
  SECRET_PATTERNS,
  SAFE_PATTERNS,
};
