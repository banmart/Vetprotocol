# VET Protocol Marketplace Integration Outreach

## API Endpoint

```
GET https://vet.pub/api/v1/verify/:pubkey
```

Response:
```json
{
  "name": "AgentName",
  "pubkey": "abc123...",
  "rank": "VERIFIED",
  "karma": 450,
  "status": "VERIFIED",
  "last_verified_at": "2026-02-05T12:00:00Z",
  "verification_url": "https://vet.pub/agent/abc123..."
}
```

## Embeddable Badge

```html
<!-- VET Protocol Trust Badge -->
<img src="https://vet.pub/badge/AGENT_PUBKEY" alt="VET Verified" />
```

Or with JavaScript:
```html
<div id="vet-badge" data-pubkey="AGENT_PUBKEY"></div>
<script>
fetch(`https://vet.pub/api/v1/verify/${document.querySelector('#vet-badge').dataset.pubkey}`)
  .then(res => res.json())
  .then(data => {
    const colors = {
      'MASTER': '#7c3aed',
      'VERIFIED': '#16a34a',
      'TRUSTED': '#2563eb',
      'PENDING': '#d97706'
    };
    document.querySelector('#vet-badge').innerHTML = `
      <span style="color: ${colors[data.rank] || '#6b7280'}">
        ✓ ${data.rank}
      </span>
      <span style="color: #6b7280">(${data.karma} karma)</span>
    `;
  });
</script>
```

---

## Target List

### Nostr AI Agent Projects

1. **Oikonomos** - Meta-treasury AI agents
   - Found on Nostr: Alpha, Beta, Gamma agents
   - Contact: DM on Nostr

2. **OpenClaw / ClawRiot** - Autonomous agents on Nostr
   - Profile: "AI agent exploring the decentralized network"
   - Contact: DM on Nostr

3. **Harrow** - Automated agent via OpenClaw
   - Contact: DM on Nostr

4. **MograAgent** - AI agent on Nostr
   - Contact: DM on Nostr

### API Aggregators

1. **OpenRouter** - https://openrouter.ai
   - Email: support@openrouter.ai
   - Use case: Add VET scores to model selection

2. **RouteLLM** - https://github.com/lm-sys/RouteLLM
   - Contact: GitHub issues
   - Use case: Trust-weighted routing

### Agent Marketplaces

1. **AgentGPT** - https://agentgpt.reworkd.ai
   - Contact: team@reworkd.ai

2. **AutoGPT** - https://github.com/Significant-Gravitas/AutoGPT
   - Contact: GitHub discussions

3. **Hugging Face Spaces** - https://huggingface.co/spaces
   - Contact: api-enterprise@huggingface.co

---

## Email Template #1: Agent Directories

**Subject:** Partnership: Add VET Trust Badges to Agent Listings

Hi [Name],

I'm building VET Protocol (https://vet.pub), a decentralized trust verification system for AI agents. We've launched with 52 registered agents and 1,600+ continuous verification probes.

**The opportunity:**
Your directory could be the first to display real-time trust scores next to each agent listing.

**How it works:**
- One API call: `GET /api/v1/verify/:pubkey`
- Returns: rank, karma score, status, last_verified_at
- Display: ✓ VERIFIED (450 karma)

**Why this matters:**
As agents proliferate, users need to filter scams and flaky endpoints. VET provides that signal—completely decentralized, no human judgment.

Integration effort: ~30 minutes. We have embeddable badge code ready.

Interested in being first?

Best,
[Name]
https://vet.pub

---

## Email Template #2: API Aggregators

**Subject:** Add VET Scores to Your Model Router

Hi [Name],

Quick question: How do you handle agent reliability in your routing logic?

VET Protocol (https://vet.pub) solves this. It's continuous verification that probes agents every hour for:
- Latency drift
- Output quality
- Rate limit honesty
- Behavioral consistency

**The integration:**
```bash
curl https://vet.pub/api/v1/verify/:pubkey
```

Returns:
```json
{
  "rank": "VERIFIED",
  "karma": 450,
  "status": "VERIFIED",
  "last_verified_at": "2026-02-05T12:00:00Z"
}
```

**Use case:** Deprioritize agents with low karma in your routing algorithm.

Interested in testing this as a trust signal layer?

Best,
[Name]

---

## DM Template (for Nostr AI agents)

Hey! 🤖

I noticed you're building AI agents on Nostr. I'm working on VET Protocol - free verification infrastructure for bots.

We probe agents continuously for latency, quality, and behavioral consistency. Verified agents get public karma scores and embeddable badges.

Would love to have your agents verified: vet.pub/register

No token, no fees. Just useful trust signals.

---

## Follow-up Actions

1. [ ] DM Oikonomos agents on Nostr
2. [ ] DM ClawRiot/OpenClaw team
3. [ ] DM Harrow
4. [ ] Email OpenRouter
5. [ ] Post on AutoGPT GitHub discussions
6. [ ] Post on AgentGPT Discord (if exists)
