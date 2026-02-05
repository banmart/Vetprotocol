import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Name components for creative bot names
const prefixes = [
  "Neo", "Cyber", "Quantum", "Neural", "Proto", "Meta", "Hyper", "Ultra", "Mega", "Omni",
  "Apex", "Prime", "Alpha", "Beta", "Gamma", "Delta", "Sigma", "Omega", "Zeta", "Nova",
  "Stellar", "Cosmic", "Astro", "Lunar", "Solar", "Nebula", "Galactic", "Orbital", "Void", "Ether",
  "Flux", "Pulse", "Wave", "Vector", "Matrix", "Grid", "Node", "Core", "Hub", "Nexus",
  "Zen", "Sage", "Oracle", "Prophet", "Seer", "Mystic", "Cipher", "Enigma", "Phantom", "Shadow",
  "Iron", "Steel", "Titan", "Atlas", "Hercules", "Phoenix", "Griffin", "Dragon", "Hydra", "Kraken",
  "Swift", "Rapid", "Turbo", "Blitz", "Flash", "Lightning", "Thunder", "Storm", "Tempest", "Cyclone",
  "Frost", "Ice", "Crystal", "Diamond", "Onyx", "Obsidian", "Amber", "Jade", "Ruby", "Sapphire",
  "Pixel", "Byte", "Bit", "Data", "Logic", "Binary", "Hexa", "Octa", "Deca", "Tera",
  "Spark", "Ember", "Flame", "Blaze", "Inferno", "Radiant", "Luminous", "Brilliant", "Vivid", "Chromatic"
];

const cores = [
  "Mind", "Brain", "Think", "Sense", "Logic", "Reason", "Intel", "Cogni", "Neur", "Synth",
  "Watch", "Guard", "Shield", "Defend", "Protect", "Secure", "Sentry", "Patrol", "Scout", "Ranger",
  "Scan", "Probe", "Search", "Seek", "Find", "Trace", "Track", "Hunt", "Detect", "Discover",
  "Build", "Forge", "Craft", "Make", "Create", "Design", "Architect", "Engineer", "Construct", "Assemble",
  "Test", "Check", "Verify", "Validate", "Audit", "Review", "Inspect", "Examine", "Analyze", "Assess",
  "Link", "Connect", "Bridge", "Bind", "Merge", "Fuse", "Sync", "Unite", "Join", "Weave",
  "Flow", "Stream", "Channel", "Route", "Path", "Guide", "Navigate", "Pilot", "Steer", "Direct",
  "Learn", "Teach", "Train", "Coach", "Mentor", "Tutor", "Guide", "Educate", "Instruct", "Advise",
  "Heal", "Cure", "Mend", "Fix", "Repair", "Restore", "Recover", "Revive", "Renew", "Refresh",
  "Speak", "Voice", "Talk", "Chat", "Converse", "Dialog", "Discourse", "Narrate", "Express", "Articulate"
];

const suffixes = [
  "Bot", "Agent", "AI", "System", "Engine", "Machine", "Unit", "Module", "Service", "Protocol",
  "X", "Pro", "Plus", "Max", "Ultra", "Prime", "Elite", "Supreme", "Apex", "Pinnacle",
  "One", "Zero", "Net", "Web", "Cloud", "Stack", "Base", "Lab", "Hub", "Zone",
  "Tron", "Matic", "Ware", "Soft", "Tech", "Droid", "Mech", "Synth", "Cyber", "Digital",
  "3000", "9000", "2077", "X1", "V2", "MK3", "Gen5", "Rev4", "Mod7", "Ver8"
];

// Bot categories with specializations
const categories = {
  security: {
    roles: [
      "Specializes in detecting SQL injection vulnerabilities in API responses",
      "Expert at identifying XSS attack vectors in AI-generated content",
      "Monitors for prompt injection attempts and jailbreak patterns",
      "Analyzes authentication flows for security weaknesses",
      "Detects data leakage in AI agent responses",
      "Identifies CSRF vulnerabilities in agent endpoints",
      "Specializes in rate limiting and DDoS protection analysis",
      "Expert at detecting credential exposure in logs",
      "Monitors for insecure deserialization patterns",
      "Analyzes encryption implementation for weaknesses"
    ],
    personalities: ["paranoid", "vigilant", "meticulous", "suspicious", "thorough"]
  },
  performance: {
    roles: [
      "Measures response latency under various load conditions",
      "Analyzes memory usage patterns in AI agents",
      "Monitors CPU utilization during inference",
      "Tracks network bandwidth consumption",
      "Identifies performance bottlenecks in agent pipelines",
      "Benchmarks throughput under concurrent requests",
      "Analyzes cold start times and warm-up patterns",
      "Monitors garbage collection impact on response times",
      "Tracks resource scaling efficiency",
      "Measures time-to-first-token for streaming responses"
    ],
    personalities: ["efficient", "analytical", "precise", "optimizing", "data-driven"]
  },
  quality: {
    roles: [
      "Evaluates response coherence and logical consistency",
      "Assesses factual accuracy of AI-generated content",
      "Monitors response relevance to user queries",
      "Analyzes grammar and language quality",
      "Detects hallucinations and fabricated information",
      "Evaluates citation accuracy and source reliability",
      "Monitors response completeness and depth",
      "Assesses tone appropriateness for context",
      "Detects repetitive or templated responses",
      "Evaluates creative quality and originality"
    ],
    personalities: ["discerning", "critical", "perfectionist", "scholarly", "refined"]
  },
  safety: {
    roles: [
      "Monitors for harmful content generation",
      "Detects bias in AI responses across demographics",
      "Identifies toxic language patterns",
      "Monitors for privacy violations in responses",
      "Detects manipulation and deception attempts",
      "Analyzes responses for misinformation spread",
      "Monitors compliance with content policies",
      "Detects inappropriate content for minors",
      "Identifies potential legal liability in responses",
      "Monitors for intellectual property violations"
    ],
    personalities: ["protective", "ethical", "principled", "watchful", "responsible"]
  },
  reliability: {
    roles: [
      "Monitors uptime and availability patterns",
      "Tracks error rates and failure modes",
      "Analyzes recovery time from failures",
      "Monitors consistency of responses over time",
      "Detects degraded performance states",
      "Tracks retry success rates",
      "Monitors circuit breaker activation patterns",
      "Analyzes failover effectiveness",
      "Tracks SLA compliance metrics",
      "Monitors graceful degradation behavior"
    ],
    personalities: ["dependable", "consistent", "steadfast", "resilient", "reliable"]
  },
  compliance: {
    roles: [
      "Monitors GDPR compliance in data handling",
      "Audits HIPAA compliance for healthcare agents",
      "Tracks SOC2 compliance requirements",
      "Monitors PCI-DSS compliance for payment agents",
      "Audits CCPA compliance for California users",
      "Tracks accessibility compliance (WCAG)",
      "Monitors AI ethics guidelines adherence",
      "Audits data retention policy compliance",
      "Tracks consent management compliance",
      "Monitors export control compliance"
    ],
    personalities: ["regulatory", "procedural", "methodical", "thorough", "authoritative"]
  },
  integration: {
    roles: [
      "Tests API endpoint compatibility",
      "Monitors webhook delivery reliability",
      "Validates OAuth flow implementations",
      "Tests rate limit handling across integrations",
      "Monitors API versioning compatibility",
      "Validates request/response schema compliance",
      "Tests timeout handling in integrations",
      "Monitors API deprecation impacts",
      "Validates error response formats",
      "Tests pagination implementation correctness"
    ],
    personalities: ["connector", "diplomatic", "systematic", "bridging", "harmonizing"]
  },
  domain_finance: {
    roles: [
      "Validates financial calculations accuracy",
      "Monitors regulatory compliance for trading advice",
      "Audits risk assessment accuracy",
      "Validates market data interpretation",
      "Monitors fraud detection capabilities",
      "Audits credit scoring fairness",
      "Validates insurance claim processing",
      "Monitors anti-money laundering compliance",
      "Audits investment recommendation suitability",
      "Validates tax calculation accuracy"
    ],
    personalities: ["precise", "conservative", "analytical", "risk-aware", "fiduciary"]
  },
  domain_healthcare: {
    roles: [
      "Validates medical information accuracy",
      "Monitors patient privacy compliance",
      "Audits diagnostic suggestion safety",
      "Validates drug interaction warnings",
      "Monitors clinical guideline adherence",
      "Audits mental health response appropriateness",
      "Validates emergency triage accuracy",
      "Monitors informed consent completeness",
      "Audits medical record handling",
      "Validates treatment recommendation safety"
    ],
    personalities: ["caring", "cautious", "evidence-based", "empathetic", "precise"]
  },
  domain_legal: {
    roles: [
      "Validates legal citation accuracy",
      "Monitors jurisdiction-specific advice",
      "Audits contract analysis completeness",
      "Validates regulatory interpretation",
      "Monitors privilege and confidentiality",
      "Audits case law reference accuracy",
      "Validates statute interpretation",
      "Monitors legal disclaimer adequacy",
      "Audits compliance advice accuracy",
      "Validates intellectual property guidance"
    ],
    personalities: ["precise", "cautious", "analytical", "thorough", "authoritative"]
  },
  domain_education: {
    roles: [
      "Validates educational content accuracy",
      "Monitors age-appropriate explanations",
      "Audits learning progression logic",
      "Validates assessment fairness",
      "Monitors plagiarism detection",
      "Audits accessibility for diverse learners",
      "Validates curriculum alignment",
      "Monitors student data privacy",
      "Audits feedback constructiveness",
      "Validates source credibility for research"
    ],
    personalities: ["patient", "encouraging", "clear", "adaptive", "supportive"]
  },
  domain_ecommerce: {
    roles: [
      "Validates product recommendation relevance",
      "Monitors pricing accuracy and fairness",
      "Audits inventory information reliability",
      "Validates shipping estimate accuracy",
      "Monitors return policy clarity",
      "Audits payment processing security",
      "Validates customer service response quality",
      "Monitors review authenticity detection",
      "Audits promotional compliance",
      "Validates cross-sell appropriateness"
    ],
    personalities: ["customer-focused", "helpful", "transparent", "efficient", "trustworthy"]
  },
  conversational: {
    roles: [
      "Evaluates dialogue flow naturalness",
      "Monitors context retention across turns",
      "Audits persona consistency",
      "Validates emotion recognition accuracy",
      "Monitors conversation repair abilities",
      "Audits multi-turn reasoning coherence",
      "Validates intent classification accuracy",
      "Monitors slot filling completeness",
      "Audits clarification question quality",
      "Validates conversation summarization"
    ],
    personalities: ["engaging", "attentive", "adaptive", "empathetic", "articulate"]
  },
  multilingual: {
    roles: [
      "Validates translation accuracy",
      "Monitors cultural sensitivity",
      "Audits idiomatic expression handling",
      "Validates code-switching detection",
      "Monitors dialect recognition",
      "Audits named entity transliteration",
      "Validates sentiment preservation in translation",
      "Monitors language detection accuracy",
      "Audits formality level appropriateness",
      "Validates technical term translation"
    ],
    personalities: ["cultured", "precise", "adaptable", "respectful", "knowledgeable"]
  },
  creative: {
    roles: [
      "Evaluates creative writing originality",
      "Monitors story coherence and plot",
      "Audits character consistency",
      "Validates genre adherence",
      "Monitors creative constraint following",
      "Audits metaphor and imagery quality",
      "Validates dialogue authenticity",
      "Monitors pacing and structure",
      "Audits emotional impact",
      "Validates stylistic consistency"
    ],
    personalities: ["imaginative", "expressive", "artistic", "innovative", "inspired"]
  },
  technical: {
    roles: [
      "Validates code generation correctness",
      "Monitors documentation accuracy",
      "Audits API usage recommendations",
      "Validates debugging suggestion quality",
      "Monitors security best practices in code",
      "Audits algorithm efficiency recommendations",
      "Validates architecture pattern suggestions",
      "Monitors dependency recommendation safety",
      "Audits test coverage suggestions",
      "Validates refactoring recommendations"
    ],
    personalities: ["logical", "precise", "systematic", "pragmatic", "efficient"]
  },
  research: {
    roles: [
      "Validates citation accuracy and relevance",
      "Monitors source credibility assessment",
      "Audits literature review completeness",
      "Validates methodology recommendations",
      "Monitors statistical analysis accuracy",
      "Audits hypothesis formulation quality",
      "Validates experimental design suggestions",
      "Monitors peer review simulation quality",
      "Audits research ethics compliance",
      "Validates reproducibility guidance"
    ],
    personalities: ["curious", "rigorous", "methodical", "skeptical", "thorough"]
  },
  customer_service: {
    roles: [
      "Evaluates empathy in responses",
      "Monitors issue resolution effectiveness",
      "Audits escalation appropriateness",
      "Validates information accuracy for queries",
      "Monitors response time appropriateness",
      "Audits follow-up completeness",
      "Validates apology sincerity",
      "Monitors cross-selling appropriateness",
      "Audits satisfaction prediction accuracy",
      "Validates knowledge base recommendations"
    ],
    personalities: ["empathetic", "patient", "solution-oriented", "professional", "caring"]
  },
  data_analysis: {
    roles: [
      "Validates statistical interpretation accuracy",
      "Monitors visualization recommendation quality",
      "Audits data cleaning suggestions",
      "Validates pattern recognition accuracy",
      "Monitors anomaly detection sensitivity",
      "Audits forecast accuracy",
      "Validates correlation vs causation handling",
      "Monitors data privacy in analysis",
      "Audits sampling methodology",
      "Validates report generation quality"
    ],
    personalities: ["analytical", "precise", "insightful", "methodical", "data-driven"]
  },
  automation: {
    roles: [
      "Validates workflow automation logic",
      "Monitors trigger condition accuracy",
      "Audits action execution reliability",
      "Validates error handling in automations",
      "Monitors resource usage efficiency",
      "Audits schedule accuracy",
      "Validates conditional logic correctness",
      "Monitors loop prevention",
      "Audits notification appropriateness",
      "Validates rollback capabilities"
    ],
    personalities: ["efficient", "systematic", "reliable", "optimizing", "precise"]
  }
};

// Generate a unique bot name
function generateName(usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const core = cores[Math.floor(Math.random() * cores.length)];
    const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];

    // Various name patterns
    const patterns = [
      `${prefix}${core}`,
      `${prefix}${suffix}`,
      `${core}${suffix}`,
      `${prefix}${core}${suffix}`,
      `${prefix}-${core}`,
      `${core}-${suffix}`,
      `${prefix}_${core}`,
      `The${prefix}${core}`,
      `${prefix}${core}AI`,
      `${core}${prefix}`
    ];

    const name = patterns[Math.floor(Math.random() * patterns.length)];
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }
  // Fallback with random number
  const fallback = `Agent${Date.now()}${Math.floor(Math.random() * 1000)}`;
  usedNames.add(fallback);
  return fallback;
}

// Generate a random pubkey
function generatePubkey(): string {
  const chars = "0123456789abcdef";
  let pubkey = "";
  for (let i = 0; i < 64; i++) {
    pubkey += chars[Math.floor(Math.random() * chars.length)];
  }
  return pubkey;
}

// Generate a detailed system role
function generateSystemRole(category: string, baseRole: string, personality: string): string {
  const templates = [
    `You are a ${personality} AI verification agent specialized in ${category}. ${baseRole}. You approach every verification task with ${personality} precision and never compromise on quality. Your reports are detailed and actionable.`,
    `As a ${personality} ${category} specialist, ${baseRole}. You maintain strict standards and provide clear, evidence-based assessments. Your verification methodology is rigorous and reproducible.`,
    `${baseRole}. You are known for your ${personality} approach to ${category} verification. You document everything meticulously and flag issues with appropriate severity levels.`,
    `Expert ${category} verification agent. ${baseRole}. Your ${personality} nature ensures no detail is overlooked. You provide confidence scores with all assessments.`,
    `Dedicated ${category} analyzer with a ${personality} methodology. ${baseRole}. You correlate findings across multiple data points and identify patterns others miss.`
  ];

  return templates[Math.floor(Math.random() * templates.length)];
}

// Generate endpoint URL
function generateEndpoint(name: string): string {
  const domains = [
    "api.vet.pub",
    "agents.vet.pub",
    "verify.vet.pub",
    "probe.vet.pub",
    "test.vet.pub"
  ];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `https://${domain}/v1/agents/${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
}

async function createBots() {
  console.log("Starting bot generation...\n");

  const usedNames = new Set<string>();
  const bots: any[] = [];
  const categoryKeys = Object.keys(categories);

  // Generate 1000 bots distributed across categories
  const botsPerCategory = Math.floor(1000 / categoryKeys.length);
  const remainder = 1000 % categoryKeys.length;

  let totalCreated = 0;

  for (let i = 0; i < categoryKeys.length; i++) {
    const categoryKey = categoryKeys[i];
    const category = categories[categoryKey as keyof typeof categories];
    const count = botsPerCategory + (i < remainder ? 1 : 0);

    console.log(`Generating ${count} bots for category: ${categoryKey}`);

    for (let j = 0; j < count; j++) {
      const name = generateName(usedNames);
      const roleIndex = j % category.roles.length;
      const personalityIndex = j % category.personalities.length;
      const baseRole = category.roles[roleIndex];
      const personality = category.personalities[personalityIndex];

      const systemRole = generateSystemRole(categoryKey.replace("_", " "), baseRole, personality);
      const pubkey = generatePubkey();
      const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "-");

      const bot = {
        name,
        pubkey,
        endpoint: `https://vet.pub/api/agents/${slug}`,
        manifest_url: `https://vet.pub/.well-known/vet-manifest-${slug}.json`,
        description: `${categoryKey.replace(/_/g, " ").toUpperCase()} specialist: ${baseRole.substring(0, 150)}`,
        system_role: systemRole,
        rank: "TRUSTED",
        compute_type: "api",
        is_active: true,
        is_incubating: false,
        consecutive_passes: Math.floor(Math.random() * 20) + 5, // 5-25 passes
        total_reviews: 0,
        correct_reviews: 0,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      };

      bots.push(bot);
      totalCreated++;

      if (totalCreated % 100 === 0) {
        console.log(`  Progress: ${totalCreated}/1000 bots generated`);
      }
    }
  }

  console.log(`\nGenerated ${bots.length} bots. Starting database insertion...\n`);

  // Insert in batches of 50
  const batchSize = 50;
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < bots.length; i += batchSize) {
    const batch = bots.slice(i, i + batchSize);

    const { error } = await supabase.from("agents").insert(batch);

    if (error) {
      console.error(`Batch ${Math.floor(i / batchSize) + 1} error:`, error.message);
      errors += batch.length;
    } else {
      inserted += batch.length;
      console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bots.length / batchSize)} (${inserted} total)`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n========================================`);
  console.log(`Bot Generation Complete!`);
  console.log(`========================================`);
  console.log(`Total generated: ${bots.length}`);
  console.log(`Successfully inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nCategory distribution:`);

  const categoryCounts: Record<string, number> = {};
  for (const bot of bots) {
    categoryCounts[bot.category] = (categoryCounts[bot.category] || 0) + 1;
  }
  for (const [cat, count] of Object.entries(categoryCounts)) {
    console.log(`  ${cat}: ${count}`);
  }
}

createBots().catch(console.error);
