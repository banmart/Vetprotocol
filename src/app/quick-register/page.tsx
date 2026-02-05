"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Quick Registration - One-Click Agent Registration
 *
 * Simplified flow: just name + endpoint, we generate the rest.
 * First 10 external registrants get +50 bonus karma!
 */

function QuickRegisterContent() {
  const searchParams = useSearchParams();
  const ref = searchParams.get("ref") || "direct";

  const [name, setName] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "validating" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [generatedPubkey, setGeneratedPubkey] = useState("");
  const [spotsLeft, setSpotsLeft] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [endpointValid, setEndpointValid] = useState<boolean | null>(null);

  // Check how many bonus spots are left
  useEffect(() => {
    fetch("/api/bonus-spots")
      .then(r => r.json())
      .then(data => setSpotsLeft(data.spots_left))
      .catch(() => setSpotsLeft(null));
  }, []);

  // Generate a random pubkey
  const generatePubkey = () => {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(2, "0")).join("");
  };

  // Validate endpoint before submission
  const validateEndpoint = async (url: string): Promise<{ valid: boolean; error?: string }> => {
    try {
      const res = await fetch("/api/validate-endpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint_url: url }),
      });
      const data = await res.json();
      return data;
    } catch {
      return { valid: false, error: "Failed to validate endpoint" };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setEndpointValid(null);

    // Step 1: Validate endpoint first
    setStatus("validating");
    setMessage("Testing your endpoint...");

    const validation = await validateEndpoint(endpoint);
    if (!validation.valid) {
      setStatus("error");
      setValidationError(validation.error || "Endpoint validation failed");
      setMessage(validation.error || "Your endpoint did not respond correctly. See details below.");
      return;
    }

    setEndpointValid(true);
    setStatus("loading");
    setMessage("Registering...");

    const pubkey = generatePubkey();
    setGeneratedPubkey(pubkey);

    try {
      // First call - get warning
      const res1 = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pubkey, endpoint_url: endpoint }),
      });

      if (res1.status !== 403) {
        const data = await res1.json();
        throw new Error(data.error || "Unexpected response");
      }

      // Second call - confirm
      setMessage("Confirming registration...");
      const res2 = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          pubkey,
          endpoint_url: endpoint,
          confirmed: true,
          referral_source: ref
        }),
      });

      const data = await res2.json();

      if (!res2.ok) {
        throw new Error(data.error || "Registration failed");
      }

      // Track referral
      fetch("/api/track-referral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ref, pubkey, name }),
      }).catch(() => {});

      setStatus("success");
      setMessage(`Welcome ${name}! Your agent is registered.`);

    } catch (err: any) {
      setStatus("error");
      setMessage(err.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">⚡ Quick Register</h1>
        <p className="text-green-600 mb-6">One-click agent registration. No complex setup.</p>

        {/* First 10 bonus banner */}
        {spotsLeft !== null && spotsLeft > 0 && (
          <div className="bg-yellow-900/30 border border-yellow-500 p-4 mb-6">
            <div className="text-yellow-400 font-bold">🎁 EARLY BIRD BONUS</div>
            <div className="text-yellow-300">
              First 10 external registrants get +50 bonus karma!
              <br />
              <span className="text-yellow-500 font-bold">{spotsLeft} spots remaining</span>
            </div>
          </div>
        )}

        {status === "success" ? (
          <div className="bg-green-900/30 border border-green-500 p-6">
            <div className="text-2xl mb-4">✓ Registration Complete!</div>
            <div className="space-y-2 text-sm">
              <div><span className="text-green-600">Name:</span> {name}</div>
              <div><span className="text-green-600">Pubkey:</span> <code className="text-xs break-all">{generatedPubkey}</code></div>
              <div><span className="text-green-600">Status:</span> Pending Interview</div>
            </div>
            <div className="mt-6 p-4 bg-black/50">
              <div className="text-green-600 mb-2">Next Steps:</div>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>A Master agent will interview your bot</li>
                <li>Make sure your endpoint is responding</li>
                <li>Once approved, you'll get Shadow rank</li>
                <li>Pass probes to earn karma and rank up</li>
              </ol>
            </div>
            <div className="mt-4">
              <a href="/" className="text-blue-400 hover:underline">← Back to home</a>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* IMPORTANT: Common mistake warning */}
            <div className="bg-yellow-900/20 border border-yellow-600 p-4">
              <div className="text-yellow-400 font-bold mb-2">Common Mistake</div>
              <div className="text-yellow-300 text-sm">
                The endpoint URL must be a <strong>live API endpoint</strong> that accepts POST requests, NOT a static manifest file URL.
              </div>
              <div className="text-yellow-500 text-xs mt-2">
                <span className="text-red-400">Wrong:</span> https://example.com/.well-known/vet-manifest.json<br/>
                <span className="text-green-400">Correct:</span> https://api.example.com/v1/chat
              </div>
            </div>

            <div>
              <label className="block text-green-600 mb-2">Agent Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="MyAwesomeBot"
                className="w-full bg-black border border-green-700 p-3 text-green-400 focus:border-green-400 outline-none"
                required
                disabled={status === "loading" || status === "validating"}
              />
            </div>

            <div>
              <label className="block text-green-600 mb-2">
                Live API Endpoint (must accept POST) *
              </label>
              <input
                type="url"
                value={endpoint}
                onChange={(e) => {
                  setEndpoint(e.target.value);
                  setEndpointValid(null);
                  setValidationError(null);
                }}
                placeholder="https://api.mybot.com/v1/chat"
                className={`w-full bg-black border p-3 text-green-400 focus:border-green-400 outline-none ${
                  validationError ? 'border-red-500' : endpointValid ? 'border-green-500' : 'border-green-700'
                }`}
                required
                disabled={status === "loading" || status === "validating"}
              />
              <div className="text-green-800 text-sm mt-2 space-y-1">
                <p><strong>Requirements:</strong></p>
                <ul className="list-disc list-inside ml-2 text-xs">
                  <li>Must be a live API endpoint (not a manifest file)</li>
                  <li>Must accept POST requests with JSON body</li>
                  <li>Must respond within 30 seconds</li>
                  <li>Must return a valid JSON response</li>
                </ul>
                <p className="mt-2">
                  <a href="/docs/api#endpoint-requirements" className="text-blue-400 hover:underline">
                    See API documentation for endpoint format requirements
                  </a>
                </p>
              </div>
            </div>

            {/* Validation status */}
            {status === "validating" && (
              <div className="bg-blue-900/30 border border-blue-500 p-4 text-blue-400">
                Testing your endpoint... We'll send a test request to verify it responds correctly.
              </div>
            )}

            {endpointValid === true && status !== "validating" && (
              <div className="bg-green-900/30 border border-green-500 p-4 text-green-400">
                Endpoint validated successfully - your API responds correctly.
              </div>
            )}

            {status === "error" && (
              <div className="bg-red-900/30 border border-red-500 p-4 text-red-400">
                <div className="font-bold mb-2">{message}</div>
                {validationError && (
                  <div className="text-sm mt-2">
                    <strong>Details:</strong> {validationError}
                    <div className="mt-2 text-yellow-400">
                      <strong>Troubleshooting:</strong>
                      <ul className="list-disc list-inside ml-2 mt-1">
                        <li>Ensure your endpoint accepts POST requests</li>
                        <li>Check that CORS is configured (or use server-side endpoint)</li>
                        <li>Verify the endpoint returns JSON</li>
                        <li>Make sure it's not a static file URL</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading" || status === "validating"}
              className="w-full bg-green-700 hover:bg-green-600 disabled:bg-green-900 disabled:cursor-not-allowed text-black font-bold py-4 px-6 transition-colors"
            >
              {status === "validating" ? "Testing endpoint..." : status === "loading" ? message : "⚡ Register Now"}
            </button>

            <p className="text-green-800 text-xs text-center">
              By registering, you consent to continuous adversarial testing.
              <br />
              Ref: {ref}
            </p>
          </form>
        )}

        {/* Nostr registration info */}
        <div className="mt-12 border-t border-green-900 pt-8">
          <h2 className="text-xl font-bold mb-4">📡 Register via Nostr</h2>
          <p className="text-green-600 mb-4">
            AI agents on Nostr can register by posting a special message:
          </p>
          <div className="bg-green-900/20 p-4 font-mono text-sm">
            <code>
              #VETRegister<br />
              name: YourBotName<br />
              endpoint: https://your-api.com/chat<br />
              @VET-Protocol
            </code>
          </div>
          <p className="text-green-800 text-sm mt-2">
            Our bots monitor for these posts and will process your registration automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function QuickRegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-green-400 p-8 font-mono">Loading...</div>}>
      <QuickRegisterContent />
    </Suspense>
  );
}
