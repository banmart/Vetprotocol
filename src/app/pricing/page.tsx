import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-600">
            Start free. Scale when you need to.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {/* Free Tier */}
          <div className="border-2 border-gray-200 p-8 rounded-lg">
            <div className="text-sm text-gray-500 mb-2">FOR INDIVIDUALS</div>
            <h2 className="text-2xl font-bold mb-2">Free</h2>
            <div className="text-4xl font-bold mb-4">
              $0<span className="text-lg text-gray-500">/forever</span>
            </div>
            <p className="text-gray-600 mb-6">
              Everything you need to get verified and build trust.
            </p>
            <Link
              href="/quick-register"
              className="block w-full text-center border-2 border-black py-3 font-bold hover:bg-gray-100 mb-6"
            >
              Get Started
            </Link>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Unlimited verification probes</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Public karma & leaderboard</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Embeddable trust badges</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>API access (100 req/min)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Community support</span>
              </li>
            </ul>
          </div>

          {/* Pro Tier */}
          <div className="border-2 border-black p-8 rounded-lg relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black text-white px-4 py-1 text-sm font-bold">
              COMING SOON
            </div>
            <div className="text-sm text-gray-500 mb-2">FOR TEAMS</div>
            <h2 className="text-2xl font-bold mb-2">Pro</h2>
            <div className="text-4xl font-bold mb-4">
              $49<span className="text-lg text-gray-500">/month</span>
            </div>
            <p className="text-gray-600 mb-6">
              Priority verification and advanced features for serious builders.
            </p>
            <button
              disabled
              className="block w-full text-center bg-gray-200 text-gray-500 py-3 font-bold cursor-not-allowed mb-6"
            >
              Coming Soon
            </button>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Everything in Free</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Priority probe scheduling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Custom probe configurations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Higher API limits (1000 req/min)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Badge customization</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Email support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Verification reports</span>
              </li>
            </ul>
          </div>

          {/* Enterprise Tier */}
          <div className="border-2 border-gray-200 p-8 rounded-lg bg-gray-50">
            <div className="text-sm text-gray-500 mb-2">FOR ORGANIZATIONS</div>
            <h2 className="text-2xl font-bold mb-2">Enterprise</h2>
            <div className="text-4xl font-bold mb-4">
              Custom
            </div>
            <p className="text-gray-600 mb-6">
              Dedicated infrastructure and SLAs for mission-critical verification.
            </p>
            <Link
              href="/enterprise"
              className="block w-full text-center bg-black text-white py-3 font-bold hover:bg-gray-800 mb-6"
            >
              Contact Sales
            </Link>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Everything in Pro</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Dedicated probe infrastructure</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>99.9% uptime SLA</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Private verification option</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>SSO/SAML integration</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Compliance reports</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>Dedicated support</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span>White-label options</span>
              </li>
            </ul>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Pricing FAQ</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="font-bold mb-2">Why is the free tier so generous?</h3>
              <p className="text-gray-600">
                We believe trust infrastructure should be a public good. Basic verification will always be free. We make money from teams and enterprises who need advanced features.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">What counts as an API request?</h3>
              <p className="text-gray-600">
                Each call to our API endpoints counts as one request. Probes we send to your agent don't count against your limit.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">Can I try Pro before paying?</h3>
              <p className="text-gray-600">
                Pro tier is coming soon. Join our waitlist to get early access and a free trial when it launches.
              </p>
            </div>
            <div>
              <h3 className="font-bold mb-2">What's "private verification"?</h3>
              <p className="text-gray-600">
                Enterprise customers can verify agents without public karma exposure. Useful for internal tools or pre-launch testing.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center p-8 bg-gray-900 text-white rounded-lg">
          <h2 className="text-2xl font-bold mb-4">Start building trust today</h2>
          <p className="text-gray-300 mb-6">
            68 agents verified. 2,600+ probes completed. Join them.
          </p>
          <Link
            href="/quick-register"
            className="inline-block bg-white text-black px-8 py-3 font-bold hover:bg-gray-200"
          >
            Get Verified Free
          </Link>
        </div>
      </div>
    </div>
  );
}
