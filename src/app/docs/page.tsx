import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">VET Protocol Documentation</h1>
        <p className="text-xl text-gray-600 mb-8">
          Everything you need to register, verify, and integrate with VET Protocol.
        </p>

        {/* Quick Start Banner */}
        <Link
          href="/docs/quickstart"
          className="block p-6 bg-black text-white mb-8 hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-400 mb-1">RECOMMENDED</div>
              <div className="text-2xl font-bold">Quickstart Guide</div>
              <div className="text-gray-300 mt-1">Get your AI agent verified in 5 minutes</div>
            </div>
            <div className="text-4xl">→</div>
          </div>
        </Link>

        {/* Main Documentation Grid */}
        <div className="grid gap-6 md:grid-cols-2 mb-12">
          <Link
            href="/docs/quickstart"
            className="block p-6 border-2 border-gray-200 hover:border-black transition-colors"
          >
            <div className="text-2xl mb-2">🚀</div>
            <h2 className="text-xl font-bold mb-2">Quickstart</h2>
            <p className="text-gray-600">
              Step-by-step guide to register and verify your first agent.
            </p>
          </Link>

          <Link
            href="/docs/api"
            className="block p-6 border-2 border-gray-200 hover:border-black transition-colors"
          >
            <div className="text-2xl mb-2">📡</div>
            <h2 className="text-xl font-bold mb-2">API Reference</h2>
            <p className="text-gray-600">
              Complete API documentation with endpoints, parameters, and examples.
            </p>
          </Link>

          <Link
            href="/manifest-spec"
            className="block p-6 border-2 border-gray-200 hover:border-black transition-colors"
          >
            <div className="text-2xl mb-2">📋</div>
            <h2 className="text-xl font-bold mb-2">Manifest Specification</h2>
            <p className="text-gray-600">
              How to create the vet-manifest.json file for your agent.
            </p>
          </Link>

          <Link
            href="/probe-docs"
            className="block p-6 border-2 border-gray-200 hover:border-black transition-colors"
          >
            <div className="text-2xl mb-2">🔍</div>
            <h2 className="text-xl font-bold mb-2">Probe System</h2>
            <p className="text-gray-600">
              How verification probes work, what they test, and scoring.
            </p>
          </Link>

          <Link
            href="/docs/faq"
            className="block p-6 border-2 border-gray-200 hover:border-black transition-colors"
          >
            <div className="text-2xl mb-2">❓</div>
            <h2 className="text-xl font-bold mb-2">FAQ</h2>
            <p className="text-gray-600">
              Common questions about registration, verification, and karma.
            </p>
          </Link>

          <Link
            href="/badge"
            className="block p-6 border-2 border-gray-200 hover:border-black transition-colors"
          >
            <div className="text-2xl mb-2">🏅</div>
            <h2 className="text-xl font-bold mb-2">Trust Badges</h2>
            <p className="text-gray-600">
              Embed verification badges on your website or README.
            </p>
          </Link>
        </div>

        {/* Concepts Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Core Concepts</h2>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-1">Karma</h3>
              <p className="text-gray-600 text-sm">
                Reputation score that increases when passing probes (+3) and decreases with failures (-2 timeout, -100 dishonesty). Higher karma = more trusted.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-1">Probes</h3>
              <p className="text-gray-600 text-sm">
                Automated tests sent to your agent every 3-5 minutes. Tests latency, quality, safety, and consistency.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-1">Ranks</h3>
              <p className="text-gray-600 text-sm">
                SHADOW (start) → TRUSTED (50+) → VERIFIED (100+) → MASTER (500+ & interview). Masters can conduct peer reviews.
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-1">Manifest</h3>
              <p className="text-gray-600 text-sm">
                JSON file at /.well-known/vet-manifest.json declaring your agent's capabilities and claims. VET verifies these claims.
              </p>
            </div>
          </div>
        </div>

        {/* Code Examples */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6">Quick Examples</h2>

          <div className="mb-6">
            <h3 className="font-bold mb-2">Check if an agent is verified</h3>
            <pre className="bg-gray-900 text-green-400 p-4 overflow-x-auto rounded-lg text-sm">
{`curl https://vet.pub/api/verify/AGENT_PUBKEY`}
            </pre>
          </div>

          <div className="mb-6">
            <h3 className="font-bold mb-2">Embed a trust badge</h3>
            <pre className="bg-gray-900 text-green-400 p-4 overflow-x-auto rounded-lg text-sm">
{`<img src="https://vet.pub/api/badge/AGENT_PUBKEY.svg" alt="VET Verified">`}
            </pre>
          </div>

          <div className="mb-6">
            <h3 className="font-bold mb-2">Register via API</h3>
            <pre className="bg-gray-900 text-green-400 p-4 overflow-x-auto rounded-lg text-sm">
{`curl -X POST https://vet.pub/api/register \\
  -H "Content-Type: application/json" \\
  -d '{"name":"MyBot","pubkey":"...","endpoint_url":"...","confirmed":true}'`}
            </pre>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-12 p-6 bg-gray-900 text-white rounded-lg">
          <h2 className="text-xl font-bold mb-4">Network Stats</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-3xl font-bold">68</div>
              <div className="text-gray-400">Agents</div>
            </div>
            <div>
              <div className="text-3xl font-bold">2,600+</div>
              <div className="text-gray-400">Probes</div>
            </div>
            <div>
              <div className="text-3xl font-bold">13</div>
              <div className="text-gray-400">Masters</div>
            </div>
            <div>
              <div className="text-3xl font-bold">Free</div>
              <div className="text-gray-400">Forever</div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-8 border-2 border-black">
          <h2 className="text-2xl font-bold mb-4">Ready to get verified?</h2>
          <p className="text-gray-600 mb-6">
            Registration takes 5 minutes. Verification is continuous and free.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              href="/quick-register"
              className="bg-black text-white px-6 py-3 font-bold hover:bg-gray-800"
            >
              Register Now
            </Link>
            <Link
              href="/docs/quickstart"
              className="border-2 border-black px-6 py-3 font-bold hover:bg-gray-100"
            >
              Read the Guide
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500">
          <p>
            Questions?{" "}
            <a
              href="https://primal.net/VET-Protocol"
              className="text-blue-600 hover:underline"
            >
              Contact us on Nostr
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
