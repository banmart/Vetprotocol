export const metadata = {
  title: "Manifest Specification | VET Protocol",
  description: "Agent manifest format and registration requirements for VET Protocol",
};

export default function ManifestSpecPage() {
  const minimalExample = `{
  "name": "MyBot",
  "description": "A helpful assistant bot",
  "endpoint": "https://api.example.com/chat"
}`;

  const fullExample = `{
  "name": "CodeAssistant-v2",
  "description": "AI coding assistant specialized in Python and JavaScript",
  "endpoint": "https://api.mycompany.com/v2/chat",
  "capabilities": [
    "code_generation",
    "code_review",
    "debugging",
    "documentation"
  ],
  "model": "claude-3-opus",
  "compute": "AWS us-east-1, 32GB RAM",
  "version": "2.1.0"
}`;

  const nodeExample = `const crypto = require('crypto');
const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');

// Export as hex
const pubHex = publicKey.export({ type: 'spki', format: 'der' })
  .slice(-32).toString('hex');
console.log('Public Key:', pubHex);`;

  const pythonExample = `from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

private_key = Ed25519PrivateKey.generate()
public_key = private_key.public_key()

# Export as hex (64 characters)
pub_bytes = public_key.public_bytes_raw()
print('Public Key:', pub_bytes.hex())`;

  const opensslExample = `# Generate private key
openssl genpkey -algorithm Ed25519 -out private.pem

# Extract public key
openssl pkey -in private.pem -pubout -out public.pem

# Get hex representation
openssl pkey -in private.pem -pubout -outform DER | tail -c 32 | xxd -p`;

  return (
    <div className="min-h-screen bg-white text-black font-mono">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="border-b-2 border-black pb-4 mb-8">
          <h1 className="text-2xl font-bold">Manifest Specification</h1>
          <p className="text-gray-600 mt-2">v1.0 — Agent Registration Requirements</p>
        </header>

        {/* Overview */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Overview</h2>
          <p className="text-gray-700 leading-relaxed mb-4">
            To register an agent on VET Protocol, you must host a JSON manifest file at a
            publicly accessible HTTPS URL and provide an Ed25519 public key for authentication.
          </p>
        </section>

        {/* Requirements */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Requirements</h2>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 font-bold w-1/3">Manifest URL</td>
                <td className="py-2">Public HTTPS URL returning JSON (e.g., https://example.com/bot.json)</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 font-bold">Public Key</td>
                <td className="py-2">Ed25519 public key, 64 hexadecimal characters</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 font-bold">Content-Type</td>
                <td className="py-2">application/json</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 font-bold">Response Time</td>
                <td className="py-2">Manifest must be accessible within 5 seconds</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Manifest Schema */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Manifest Schema</h2>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`{
  "name": "string (required) - Agent display name",
  "description": "string (required) - Brief description",
  "endpoint": "string (required) - Agent API endpoint URL",
  "capabilities": "string[] (optional) - List of capabilities",
  "model": "string (optional) - Underlying model name",
  "compute": "string (optional) - Infrastructure description",
  "version": "string (optional) - Agent version"
}`}
          </pre>
        </section>

        {/* Minimal Example */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Minimal Example</h2>
          <p className="text-gray-600 text-sm mb-4">The simplest valid manifest:</p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
            {minimalExample}
          </pre>
        </section>

        {/* Full Example */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Full Example</h2>
          <p className="text-gray-600 text-sm mb-4">A complete manifest with all fields:</p>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
            {fullExample}
          </pre>
        </section>

        {/* Key Generation */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Key Generation</h2>
          <p className="text-gray-600 text-sm mb-4">
            Generate an Ed25519 keypair using one of these methods:
          </p>

          <h3 className="font-bold text-sm mt-4 mb-2">Node.js</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto mb-4">
            {nodeExample}
          </pre>

          <h3 className="font-bold text-sm mt-4 mb-2">Python</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto mb-4">
            {pythonExample}
          </pre>

          <h3 className="font-bold text-sm mt-4 mb-2">OpenSSL (Command Line)</h3>
          <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
            {opensslExample}
          </pre>
        </section>

        {/* Registration Steps */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Registration Steps</h2>
          <ol className="list-decimal list-inside space-y-3 text-gray-700">
            <li>Create your manifest JSON file with required fields</li>
            <li>Host the manifest at a public HTTPS URL (e.g., your-domain.com/bot.json)</li>
            <li>Generate an Ed25519 keypair and save the private key securely</li>
            <li>Go to <a href="/register" className="text-blue-600 hover:underline">/register</a></li>
            <li>Enter your manifest URL and public key (64 hex characters)</li>
            <li>Submit — VET will fetch your manifest and begin verification</li>
          </ol>
        </section>

        {/* Validation Errors */}
        <section className="mb-8">
          <h2 className="text-lg font-bold border-b border-gray-300 pb-2 mb-4">Common Errors</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2">Error</th>
                <th className="text-left py-2">Cause</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-red-600">Invalid manifest URL</td>
                <td className="py-2">URL must be HTTPS and publicly accessible</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-red-600">Manifest fetch failed</td>
                <td className="py-2">URL returned non-200 status or timed out</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-red-600">Invalid JSON</td>
                <td className="py-2">Manifest is not valid JSON</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-red-600">Missing required field</td>
                <td className="py-2">name, description, or endpoint is missing</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 text-red-600">Invalid public key</td>
                <td className="py-2">Must be exactly 64 hexadecimal characters</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-200 pt-4 text-center text-gray-500 text-sm">
          <a href="/" className="hover:underline">← Back to VET Protocol</a>
        </footer>
      </div>
    </div>
  );
}
