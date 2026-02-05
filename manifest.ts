import * as ed from "@noble/ed25519";
import { sha512 } from "@noble/hashes/sha2.js";
import { canonicalize } from "json-canonicalize";
import { BotManifest, ManifestVerificationResult } from "@/types/bot-manifest";

// Configure sha512 for ed25519 (required in v2+)
ed.hashes.sha512 = (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));
ed.hashes.sha512Async = async (...m: Uint8Array[]) => sha512(ed.etc.concatBytes(...m));

/**
 * Fetch and verify a bot.json manifest from a remote URL.
 */
export async function verifyManifest(
  manifestUrl: string,
  claimedPubkey: string
): Promise<ManifestVerificationResult> {
  const startTime = Date.now();
  const errors: string[] = [];

  // Enforce HTTPS in production
  const isDev = process.env.NODE_ENV === "development";
  if (!isDev && !manifestUrl.startsWith("https://")) {
    return {
      valid: false,
      errors: ["HTTPS required for manifest URLs in production"],
      fetched_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
    };
  }

  // Fetch the manifest
  let manifestText: string;
  try {
    const response = await fetch(manifestUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        valid: false,
        errors: ["Failed to fetch manifest: HTTP " + response.status],
        fetched_at: new Date().toISOString(),
        latency_ms: Date.now() - startTime,
      };
    }

    manifestText = await response.text();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Unknown error";
    return {
      valid: false,
      errors: ["Failed to fetch manifest: " + errMsg],
      fetched_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
    };
  }

  // Parse JSON
  let manifest: BotManifest;
  try {
    manifest = JSON.parse(manifestText);
  } catch {
    return {
      valid: false,
      errors: ["Invalid JSON in manifest"],
      fetched_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
    };
  }

  // Validate required fields
  const requiredFields = [
    "manifest_version",
    "pubkey",
    "name",
    "endpoint",
    "capabilities",
    "compute_claims",
    "cost_per_call",
    "sunset_clause",
    "signature",
  ];

  for (const field of requiredFields) {
    if (!(field in manifest)) {
      errors.push("Missing required field: " + field);
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      errors,
      fetched_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
    };
  }

  // Verify pubkey matches claimed pubkey
  if (manifest.pubkey !== claimedPubkey) {
    return {
      valid: false,
      errors: [
        "Pubkey mismatch: manifest contains " +
          manifest.pubkey +
          ", but claimed " +
          claimedPubkey,
      ],
      fetched_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
    };
  }

  // Verify Ed25519 signature using RFC 8785 canonicalization
  const signatureValid = await verifyManifestSignature(manifest);
  if (!signatureValid) {
    return {
      valid: false,
      errors: ["Invalid signature: agent does not own the claimed private key"],
      fetched_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
    };
  }

  // Validate compute_claims structure
  if (!manifest.compute_claims?.type) {
    errors.push("compute_claims.type is required");
  } else if (!["local", "api", "hybrid"].includes(manifest.compute_claims.type)) {
    errors.push("compute_claims.type must be local, api, or hybrid");
  }

  // Validate sunset_clause
  if (!manifest.sunset_clause?.expires_at) {
    errors.push("sunset_clause.expires_at is required");
  } else {
    const expiresAt = new Date(manifest.sunset_clause.expires_at);
    if (expiresAt < new Date()) {
      errors.push("Manifest has expired (sunset_clause.expires_at is in the past)");
    }
  }

  if (errors.length > 0) {
    return {
      valid: false,
      manifest,
      errors,
      fetched_at: new Date().toISOString(),
      latency_ms: Date.now() - startTime,
    };
  }

  return {
    valid: true,
    manifest,
    errors: [],
    fetched_at: new Date().toISOString(),
    latency_ms: Date.now() - startTime,
  };
}

/**
 * Verify the Ed25519 signature of a manifest using RFC 8785 (JCS) canonicalization.
 */
async function verifyManifestSignature(manifest: BotManifest): Promise<boolean> {
  try {
    // Extract signature and create manifest without it
    const { signature, ...manifestWithoutSig } = manifest;

    // RFC 8785 canonicalization (JCS - JSON Canonicalization Scheme)
    const canonicalMessage = canonicalize(manifestWithoutSig);
    const messageBytes = new TextEncoder().encode(canonicalMessage);

    // Decode hex pubkey and signature
    const pubkeyBytes = hexToBytes(manifest.pubkey);
    const signatureBytes = hexToBytes(signature);

    // Verify Ed25519 signature
    return ed.verify(signatureBytes, messageBytes, pubkeyBytes);
  } catch (err) {
    console.error("[manifest] Signature verification error:", err);
    return false;
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}
