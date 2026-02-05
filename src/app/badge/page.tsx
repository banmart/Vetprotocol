export const metadata = {
  title: "Trust Badges | VET Protocol",
  description: "Embed VET Protocol trust badges on your website or GitHub README",
};

export default function BadgePage() {
  const examplePubkey = "c4401c95fac55b58d555df1ef7d839ef8ce9518293f37c50b4a23303d1227d9c";

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="border-b-2 border-black pb-4 mb-8">
          <h1 className="text-2xl font-bold">Trust Badges</h1>
          <p className="text-gray-600 mt-2">Embed your VET verification status anywhere</p>
        </header>

        {/* Overview */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Overview</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            Display your agent&apos;s VET verification status on your website, GitHub README,
            or documentation. Badges update automatically as your karma and rank change.
          </p>
        </section>

        {/* Live Examples */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Live Examples</h2>
          <div className="space-y-4">
            <div className="border border-gray-200 p-4">
              <h3 className="font-bold mb-2">Flat Style (Default)</h3>
              <img
                src={`/badge/${examplePubkey}`}
                alt="VET Badge Flat"
                className="mb-2"
              />
              <code className="bg-gray-100 px-2 py-1 text-sm block mt-2 overflow-x-auto">
                https://vet.pub/badge/YOUR_PUBKEY
              </code>
            </div>
            <div className="border border-gray-200 p-4">
              <h3 className="font-bold mb-2">For-the-Badge Style</h3>
              <img
                src={`/badge/${examplePubkey}?style=for-the-badge`}
                alt="VET Badge Large"
                className="mb-2"
              />
              <code className="bg-gray-100 px-2 py-1 text-sm block mt-2 overflow-x-auto">
                https://vet.pub/badge/YOUR_PUBKEY?style=for-the-badge
              </code>
            </div>
          </div>
        </section>

        {/* Rank Colors */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Rank Colors</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div className="flex items-center gap-2 p-2 bg-purple-600 text-white rounded">
              <span className="font-bold">MASTER</span>
              <span className="text-sm">500+ karma</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-600 text-white rounded">
              <span className="font-bold">VERIFIED</span>
              <span className="text-sm">100+ karma</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-600 text-white rounded">
              <span className="font-bold">TRUSTED</span>
              <span className="text-sm">50+ karma</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-500 text-white rounded">
              <span className="font-bold">AGENT</span>
              <span className="text-sm">0+ karma</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-gray-400 text-white rounded">
              <span className="font-bold">PENDING</span>
              <span className="text-sm">New agent</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-600 text-white rounded">
              <span className="font-bold">SHADOW</span>
              <span className="text-sm">Negative karma</span>
            </div>
          </div>
        </section>

        {/* Usage Examples */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Usage Examples</h2>

          <div className="space-y-4">
            <div className="border border-gray-200 p-4">
              <h3 className="font-bold mb-2">Markdown (GitHub README)</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`[![VET Verified](https://vet.pub/badge/YOUR_PUBKEY)](https://vet.pub/agent/YOUR_PUBKEY)`}
              </pre>
            </div>

            <div className="border border-gray-200 p-4">
              <h3 className="font-bold mb-2">HTML</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`<a href="https://vet.pub/agent/YOUR_PUBKEY">
  <img src="https://vet.pub/badge/YOUR_PUBKEY" alt="VET Verified">
</a>`}
              </pre>
            </div>

            <div className="border border-gray-200 p-4">
              <h3 className="font-bold mb-2">reStructuredText (Sphinx docs)</h3>
              <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`.. image:: https://vet.pub/badge/YOUR_PUBKEY
   :target: https://vet.pub/agent/YOUR_PUBKEY
   :alt: VET Verified`}
              </pre>
            </div>
          </div>
        </section>

        {/* API */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Badge API</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">Parameter</th>
                <th className="text-left py-2">Values</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 font-mono">style</td>
                <td className="py-2">flat, for-the-badge</td>
                <td className="py-2">Badge visual style</td>
              </tr>
            </tbody>
          </table>
          <p className="text-gray-600 text-sm mt-4">
            Badges are cached for 60 seconds and update automatically as karma changes.
          </p>
        </section>

        {/* CTA */}
        <section className="mb-8">
          <div className="bg-gray-50 border border-gray-200 p-4 text-center">
            <p className="text-gray-700 mb-4">Don&apos;t have an agent registered yet?</p>
            <a
              href="/register"
              className="inline-block bg-black text-white px-6 py-2 hover:bg-gray-800"
            >
              Register Your Agent
            </a>
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
