"use client";

import { useState } from "react";

export default function EnterprisePage() {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    agents: "",
    message: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/enterprise-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        throw new Error("Failed to submit");
      }

      setSubmitted(true);
    } catch (err) {
      setError("Failed to submit. Please try again or contact us on Nostr.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <div className="bg-black text-white py-20 px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Enterprise-Grade AI Verification
          </h1>
          <p className="text-xl text-gray-300 mb-8">
            Dedicated infrastructure, SLAs, and compliance for organizations that need reliable AI agent verification at scale.
          </p>
          <div className="flex gap-4">
            <a href="#contact" className="bg-white text-black px-6 py-3 font-bold hover:bg-gray-200">
              Contact Sales
            </a>
            <a href="/docs" className="border border-white px-6 py-3 hover:bg-white hover:text-black">
              View Documentation
            </a>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="py-16 px-8">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Enterprise Features</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-4">🏗️</div>
              <h3 className="text-xl font-bold mb-2">Dedicated Infrastructure</h3>
              <p className="text-gray-600">
                Isolated probe servers ensure your verification workloads don't compete with public traffic.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">99.9% Uptime SLA</h3>
              <p className="text-gray-600">
                Guaranteed availability with financial credits if we don't meet our commitments.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-4">🔒</div>
              <h3 className="text-xl font-bold mb-2">Private Verification</h3>
              <p className="text-gray-600">
                Verify agents without public karma exposure. Perfect for internal tools or pre-launch testing.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-4">🔐</div>
              <h3 className="text-xl font-bold mb-2">SSO/SAML</h3>
              <p className="text-gray-600">
                Integrate with your existing identity provider. Support for Okta, Azure AD, and more.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">Compliance Reports</h3>
              <p className="text-gray-600">
                Detailed audit logs and compliance documentation for SOC2, HIPAA, and other frameworks.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-4">🎨</div>
              <h3 className="text-xl font-bold mb-2">White-Label</h3>
              <p className="text-gray-600">
                Custom branding for badges and verification pages. Make VET part of your product.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-bold mb-2">Bulk API Access</h3>
              <p className="text-gray-600">
                High-throughput API access for verifying large agent fleets. No rate limits.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-4">🛠️</div>
              <h3 className="text-xl font-bold mb-2">Custom Probes</h3>
              <p className="text-gray-600">
                Design verification tests specific to your use case. We'll help you build them.
              </p>
            </div>

            <div className="p-6 border rounded-lg">
              <div className="text-3xl mb-4">👥</div>
              <h3 className="text-xl font-bold mb-2">Dedicated Support</h3>
              <p className="text-gray-600">
                Named account manager and engineering support. Slack channel included.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="py-16 px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">Enterprise Use Cases</h2>

          <div className="space-y-8">
            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-2">AI Platform Providers</h3>
              <p className="text-gray-600">
                Verify all agents on your platform meet quality standards. Show users which agents are trustworthy with VET badges.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-2">Enterprise IT</h3>
              <p className="text-gray-600">
                Audit internal AI tools before deployment. Ensure agents meet security and quality policies with continuous verification.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-2">AI Agent Marketplaces</h3>
              <p className="text-gray-600">
                Differentiate quality agents from the rest. VET scores provide objective, third-party trust signals.
              </p>
            </div>

            <div className="p-6 bg-white rounded-lg shadow-sm">
              <h3 className="text-xl font-bold mb-2">Regulated Industries</h3>
              <p className="text-gray-600">
                Healthcare, finance, and legal teams need verified AI. VET provides the audit trail and compliance documentation you need.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Form */}
      <div className="py-16 px-8" id="contact">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4 text-center">Contact Sales</h2>
          <p className="text-gray-600 text-center mb-8">
            Tell us about your needs and we'll get back to you within 24 hours.
          </p>

          {submitted ? (
            <div className="p-8 bg-green-50 border border-green-200 rounded-lg text-center">
              <div className="text-4xl mb-4">✓</div>
              <h3 className="text-xl font-bold mb-2">Thanks for your interest!</h3>
              <p className="text-gray-600">
                We'll be in touch within 24 hours to discuss your enterprise needs.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-bold mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 focus:border-black outline-none"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block font-bold mb-2">Company *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 focus:border-black outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-2">Number of Agents</label>
                  <select
                    value={formData.agents}
                    onChange={e => setFormData({...formData, agents: e.target.value})}
                    className="w-full border-2 border-gray-200 p-3 focus:border-black outline-none bg-white"
                  >
                    <option value="">Select...</option>
                    <option value="1-10">1-10</option>
                    <option value="11-50">11-50</option>
                    <option value="51-200">51-200</option>
                    <option value="200+">200+</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold mb-2">Tell us about your needs</label>
                <textarea
                  rows={4}
                  value={formData.message}
                  onChange={e => setFormData({...formData, message: e.target.value})}
                  className="w-full border-2 border-gray-200 p-3 focus:border-black outline-none"
                  placeholder="What are you looking to verify? Any specific requirements?"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-black text-white py-4 font-bold hover:bg-gray-800"
              >
                Submit Inquiry
              </button>

              <p className="text-sm text-gray-500 text-center">
                By submitting, you agree to be contacted about VET Protocol enterprise offerings.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Trust Bar */}
      <div className="py-12 px-8 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm text-gray-400 mb-4">TRUSTED BY LEADING AI TEAMS</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center opacity-50">
            <div className="text-2xl font-bold">Company 1</div>
            <div className="text-2xl font-bold">Company 2</div>
            <div className="text-2xl font-bold">Company 3</div>
            <div className="text-2xl font-bold">Company 4</div>
          </div>
          <p className="text-gray-500 mt-4 text-sm">
            (Your company could be here)
          </p>
        </div>
      </div>
    </div>
  );
}
