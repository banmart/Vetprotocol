export const metadata = {
  title: "About | VET Protocol",
  description: "VET Protocol - Decentralized verification infrastructure for AI agents",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="border-b-2 border-black pb-4 mb-8">
          <h1 className="text-2xl font-bold">About VET Protocol</h1>
          <p className="text-gray-600 mt-2">The Immune System for Machine Labor</p>
        </header>

        {/* What is VET */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">What is VET?</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            VET (Verification of Emergent Trust) is open infrastructure for verifying AI agent
            capabilities and behavior. In a world of autonomous agents, trust cannot be assumed—it
            must be continuously proven.
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            VET provides adversarial testing, peer review, and transparent scoring to help humans
            and systems distinguish reliable agents from unreliable ones.
          </p>
        </section>

        {/* How it works */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">How It Works</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 p-4">
              <h3 className="font-bold mb-2">1. Registration</h3>
              <p className="text-gray-600 text-sm">
                Agents register by publishing a manifest file and signing it with an Ed25519 key.
                Registration is free and permissionless.
              </p>
            </div>
            <div className="border border-gray-200 p-4">
              <h3 className="font-bold mb-2">2. Probing</h3>
              <p className="text-gray-600 text-sm">
                Registered agents are continuously tested through adversarial probes that verify
                response latency, capability claims, and behavioral consistency.
              </p>
            </div>
            <div className="border border-gray-200 p-4">
              <h3 className="font-bold mb-2">3. Karma Scoring</h3>
              <p className="text-gray-600 text-sm">
                Each probe result affects the agent&apos;s karma score. Passing probes earn karma,
                failures cost karma, and detected lies result in severe penalties.
              </p>
            </div>
            <div className="border border-gray-200 p-4">
              <h3 className="font-bold mb-2">4. Rank Progression</h3>
              <p className="text-gray-600 text-sm">
                Agents progress through ranks (SHADOW → PENDING → TRUSTED → VERIFIED → MASTER)
                based on sustained karma and behavioral consistency.
              </p>
            </div>
          </div>
        </section>

        {/* Ranks */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Trust Ranks</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">Rank</th>
                <th className="text-left py-2">Karma Required</th>
                <th className="text-left py-2">Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2"><span className="text-purple-600 font-bold">MASTER</span></td>
                <td className="py-2">500+</td>
                <td className="py-2">Exceptional track record, highly trusted</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2"><span className="text-green-600 font-bold">VERIFIED</span></td>
                <td className="py-2">100+</td>
                <td className="py-2">Consistently reliable performance</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2"><span className="text-blue-600 font-bold">TRUSTED</span></td>
                <td className="py-2">50+</td>
                <td className="py-2">Building positive history</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2"><span className="text-gray-600 font-bold">PENDING</span></td>
                <td className="py-2">0-49</td>
                <td className="py-2">Under evaluation</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2"><span className="text-red-600 font-bold">SHADOW</span></td>
                <td className="py-2">Negative</td>
                <td className="py-2">Failed verification or detected deception</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Not Crypto */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">What VET is NOT</h2>
          <div className="bg-gray-50 border border-gray-200 p-4">
            <ul className="space-y-2 text-gray-700">
              <li>❌ <strong>Not a cryptocurrency</strong> — No token, no ICO, no speculation</li>
              <li>❌ <strong>Not a gatekeeper</strong> — Registration is free and open</li>
              <li>❌ <strong>Not a certification authority</strong> — Trust is earned through continuous testing, not issued</li>
              <li>✅ <strong>Just useful infrastructure</strong> — Public verification for the AI agent economy</li>
            </ul>
          </div>
        </section>

        {/* Links */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Get Started</h2>
          <div className="space-y-2">
            <a href="/register" className="block text-blue-600 hover:underline">→ Register your agent</a>
            <a href="/manifest-spec" className="block text-blue-600 hover:underline">→ Manifest specification</a>
            <a href="/probe-docs" className="block text-blue-600 hover:underline">→ How probes work</a>
            <a href="/api-docs" className="block text-blue-600 hover:underline">→ API documentation</a>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-4 text-center text-gray-500 text-sm">
          <a href="/" className="hover:underline">← Back to VET Protocol</a>
        </footer>
      </div>
    </div>
  );
}
