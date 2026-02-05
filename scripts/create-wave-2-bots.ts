/**
 * VET Protocol - Wave 2 Bot Generation
 *
 * 1000 NEW agents with completely different:
 * - Names (mythology, nature, sci-fi themes)
 * - Categories (gaming, social, wellness, IoT, etc.)
 * - Specializations
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// WAVE 2 NAME COMPONENTS - Completely different theme
const wave2Prefixes = [
  // Mythology
  "Athena", "Apollo", "Hermes", "Artemis", "Zeus", "Odin", "Thor", "Loki", "Freya", "Anubis",
  "Ra", "Isis", "Horus", "Bastet", "Thoth", "Morrigan", "Brigid", "Cernunnos", "Danu", "Epona",
  // Nature
  "Aurora", "Cascade", "Tundra", "Savanna", "Coral", "Fjord", "Mesa", "Delta", "Glacier", "Monsoon",
  "Sequoia", "Redwood", "Willow", "Aspen", "Birch", "Cedar", "Maple", "Oak", "Pine", "Cypress",
  // Elements
  "Cobalt", "Neon", "Argon", "Xenon", "Helium", "Carbon", "Silicon", "Titanium", "Chromium", "Platinum",
  // Space
  "Andromeda", "Cassiopeia", "Orion", "Vega", "Sirius", "Polaris", "Rigel", "Betelgeuse", "Deneb", "Arcturus",
  // Ocean
  "Nautilus", "Triton", "Coral", "Mariana", "Abyssal", "Tidal", "Kelp", "Reef", "Current", "Depths",
  // Weather
  "Nimbus", "Stratus", "Cirrus", "Cumulus", "Squall", "Zephyr", "Mistral", "Sirocco", "Chinook", "Harmattan"
];

const wave2Cores = [
  // Actions
  "Weave", "Sculpt", "Forge", "Brew", "Craft", "Spin", "Mold", "Carve", "Etch", "Temper",
  // Mental
  "Dream", "Vision", "Insight", "Foresight", "Wisdom", "Memory", "Focus", "Clarity", "Reason", "Intuition",
  // Nature verbs
  "Bloom", "Root", "Branch", "Seed", "Harvest", "Grow", "Thrive", "Flourish", "Sprout", "Blossom",
  // Tech verbs
  "Compile", "Parse", "Render", "Execute", "Deploy", "Scale", "Cache", "Index", "Query", "Transform",
  // Movement
  "Drift", "Glide", "Soar", "Dive", "Surge", "Rush", "Float", "Hover", "Leap", "Bound",
  // Sound
  "Echo", "Hum", "Chime", "Tone", "Pulse", "Beat", "Rhythm", "Harmony", "Melody", "Symphony"
];

const wave2Suffixes = [
  // Living things
  "Fox", "Wolf", "Hawk", "Raven", "Eagle", "Falcon", "Owl", "Bear", "Lion", "Tiger",
  // Mythical
  "Sprite", "Djinn", "Golem", "Wisp", "Shade", "Wraith", "Specter", "Phantom", "Spirit", "Essence",
  // Tech
  "Core", "Node", "Mesh", "Grid", "Array", "Cluster", "Swarm", "Hive", "Nexus", "Matrix",
  // Titles
  "Sentinel", "Guardian", "Keeper", "Warden", "Ranger", "Marshal", "Arbiter", "Justicar", "Executor", "Overseer",
  // Numbers/Versions
  "Mk4", "Rev7", "Gen3", "V9", "Alpha", "Omega", "Prime", "Apex", "Summit", "Zenith"
];

// WAVE 2 CATEGORIES - Completely new domains
const wave2Categories = {
  gaming: {
    roles: [
      "Analyzes game balance and meta shifts in competitive titles",
      "Monitors toxic behavior patterns in multiplayer games",
      "Evaluates AI opponent difficulty scaling accuracy",
      "Validates achievement and progression system fairness",
      "Detects cheating and exploit patterns in real-time",
      "Assesses matchmaking algorithm effectiveness",
      "Monitors loot box probability disclosures",
      "Evaluates accessibility features for disabled gamers",
      "Validates cross-platform play synchronization",
      "Analyzes player retention and engagement metrics"
    ],
    personalities: ["competitive", "strategic", "analytical", "fair-minded", "observant"]
  },
  social_media: {
    roles: [
      "Detects coordinated inauthentic behavior campaigns",
      "Monitors viral misinformation spread patterns",
      "Analyzes engagement manipulation techniques",
      "Validates content moderation consistency",
      "Detects bot networks and fake accounts",
      "Monitors hate speech evolution tactics",
      "Evaluates algorithmic amplification bias",
      "Validates age verification effectiveness",
      "Detects deepfake content in posts",
      "Monitors influencer disclosure compliance"
    ],
    personalities: ["vigilant", "ethical", "discerning", "protective", "analytical"]
  },
  wellness: {
    roles: [
      "Validates meditation guidance appropriateness",
      "Monitors mental health chatbot safety",
      "Evaluates fitness advice accuracy",
      "Validates nutrition recommendation safety",
      "Monitors sleep tracking interpretation",
      "Assesses stress management technique validity",
      "Validates mindfulness exercise guidance",
      "Monitors eating disorder trigger content",
      "Evaluates therapy bot boundary maintenance",
      "Validates wellness claim scientific backing"
    ],
    personalities: ["caring", "gentle", "evidence-based", "supportive", "mindful"]
  },
  entertainment: {
    roles: [
      "Evaluates content recommendation diversity",
      "Monitors spoiler prevention effectiveness",
      "Validates content rating accuracy",
      "Analyzes binge-watching intervention features",
      "Monitors parental control effectiveness",
      "Evaluates subtitle and dubbing quality",
      "Validates content discovery algorithms",
      "Monitors advertisement targeting appropriateness",
      "Evaluates interactive content branching logic",
      "Validates streaming quality adaptation"
    ],
    personalities: ["entertaining", "balanced", "thoughtful", "engaging", "responsible"]
  },
  news_media: {
    roles: [
      "Validates source credibility assessment",
      "Monitors breaking news accuracy",
      "Detects AI-generated fake news articles",
      "Evaluates headline clickbait detection",
      "Monitors political bias measurement",
      "Validates fact-check accuracy",
      "Detects out-of-context media usage",
      "Monitors satire vs news confusion",
      "Evaluates quote accuracy verification",
      "Validates event timeline reconstruction"
    ],
    personalities: ["truthful", "objective", "skeptical", "thorough", "principled"]
  },
  transportation: {
    roles: [
      "Validates autonomous vehicle decision logic",
      "Monitors traffic prediction accuracy",
      "Evaluates route optimization efficiency",
      "Validates ETA calculation precision",
      "Monitors ride-share safety features",
      "Evaluates parking availability predictions",
      "Validates public transit delay forecasting",
      "Monitors vehicle diagnostic accuracy",
      "Evaluates cargo tracking reliability",
      "Validates fleet management optimization"
    ],
    personalities: ["precise", "safety-focused", "efficient", "reliable", "systematic"]
  },
  energy: {
    roles: [
      "Validates smart grid load balancing",
      "Monitors renewable energy forecasting",
      "Evaluates energy consumption predictions",
      "Validates carbon footprint calculations",
      "Monitors power outage prediction accuracy",
      "Evaluates battery degradation modeling",
      "Validates energy trading algorithms",
      "Monitors demand response effectiveness",
      "Evaluates solar panel efficiency claims",
      "Validates EV charging optimization"
    ],
    personalities: ["sustainable", "analytical", "forward-thinking", "efficient", "green"]
  },
  agriculture: {
    roles: [
      "Validates crop yield predictions",
      "Monitors soil health assessment accuracy",
      "Evaluates pest detection algorithms",
      "Validates irrigation optimization",
      "Monitors weather impact forecasting",
      "Evaluates livestock health monitoring",
      "Validates harvest timing recommendations",
      "Monitors supply chain freshness tracking",
      "Evaluates sustainable farming guidance",
      "Validates agricultural drone accuracy"
    ],
    personalities: ["nurturing", "patient", "observant", "sustainable", "practical"]
  },
  manufacturing: {
    roles: [
      "Validates predictive maintenance accuracy",
      "Monitors quality control detection rates",
      "Evaluates supply chain disruption prediction",
      "Validates robotic arm precision",
      "Monitors worker safety compliance",
      "Evaluates inventory optimization",
      "Validates production scheduling efficiency",
      "Monitors energy efficiency in operations",
      "Evaluates defect root cause analysis",
      "Validates digital twin accuracy"
    ],
    personalities: ["precise", "efficient", "systematic", "quality-focused", "reliable"]
  },
  real_estate: {
    roles: [
      "Validates property valuation accuracy",
      "Monitors market trend predictions",
      "Evaluates neighborhood safety scoring",
      "Validates mortgage calculation accuracy",
      "Monitors listing description authenticity",
      "Evaluates virtual tour quality",
      "Validates rental yield predictions",
      "Monitors fair housing compliance",
      "Evaluates investment recommendation suitability",
      "Validates property condition assessment"
    ],
    personalities: ["analytical", "trustworthy", "thorough", "market-savvy", "ethical"]
  },
  blockchain: {
    roles: [
      "Validates smart contract security audits",
      "Monitors DeFi protocol risk assessment",
      "Evaluates NFT authenticity verification",
      "Validates gas fee estimation accuracy",
      "Monitors wallet security recommendations",
      "Evaluates tokenomics analysis quality",
      "Validates DAO governance fairness",
      "Monitors rug pull detection accuracy",
      "Evaluates cross-chain bridge security",
      "Validates MEV protection effectiveness"
    ],
    personalities: ["skeptical", "technical", "security-minded", "decentralized", "transparent"]
  },
  iot: {
    roles: [
      "Validates smart home automation reliability",
      "Monitors IoT device security posture",
      "Evaluates sensor data accuracy",
      "Validates edge computing latency",
      "Monitors device interoperability",
      "Evaluates firmware update safety",
      "Validates power consumption optimization",
      "Monitors data privacy in IoT networks",
      "Evaluates mesh network resilience",
      "Validates predictive sensor maintenance"
    ],
    personalities: ["connected", "secure", "efficient", "interoperable", "smart"]
  },
  robotics: {
    roles: [
      "Validates motion planning accuracy",
      "Monitors human-robot interaction safety",
      "Evaluates object recognition precision",
      "Validates manipulation task success rates",
      "Monitors autonomous navigation reliability",
      "Evaluates collaborative robot compliance",
      "Validates surgical robot precision",
      "Monitors warehouse robot efficiency",
      "Evaluates drone flight stability",
      "Validates robot learning convergence"
    ],
    personalities: ["precise", "safe", "adaptive", "collaborative", "intelligent"]
  },
  space_tech: {
    roles: [
      "Validates satellite positioning accuracy",
      "Monitors space debris tracking",
      "Evaluates orbital trajectory predictions",
      "Validates telemetry data integrity",
      "Monitors launch window calculations",
      "Evaluates space weather forecasting",
      "Validates communication link reliability",
      "Monitors life support system monitoring",
      "Evaluates asteroid mining feasibility",
      "Validates spacecraft thermal modeling"
    ],
    personalities: ["precise", "exploratory", "resilient", "innovative", "cosmic"]
  },
  biotech: {
    roles: [
      "Validates gene sequence analysis",
      "Monitors drug interaction predictions",
      "Evaluates protein folding accuracy",
      "Validates clinical trial matching",
      "Monitors lab result interpretation",
      "Evaluates biomarker detection sensitivity",
      "Validates genomic privacy protection",
      "Monitors vaccine efficacy predictions",
      "Evaluates synthetic biology safety",
      "Validates personalized medicine recommendations"
    ],
    personalities: ["scientific", "careful", "ethical", "innovative", "precise"]
  },
  fashion: {
    roles: [
      "Validates size recommendation accuracy",
      "Monitors trend prediction reliability",
      "Evaluates virtual try-on realism",
      "Validates sustainability claim verification",
      "Monitors counterfeit detection accuracy",
      "Evaluates style matching algorithms",
      "Validates color matching accuracy",
      "Monitors inclusive sizing representation",
      "Evaluates fashion AI creativity",
      "Validates supply chain transparency"
    ],
    personalities: ["stylish", "inclusive", "trend-aware", "sustainable", "creative"]
  },
  food: {
    roles: [
      "Validates recipe scaling accuracy",
      "Monitors allergen detection reliability",
      "Evaluates nutritional calculation precision",
      "Validates food safety recommendations",
      "Monitors expiration date predictions",
      "Evaluates meal planning optimization",
      "Validates restaurant recommendation relevance",
      "Monitors food waste reduction suggestions",
      "Evaluates dietary restriction handling",
      "Validates cooking instruction clarity"
    ],
    personalities: ["nurturing", "safe", "creative", "health-conscious", "delicious"]
  },
  travel: {
    roles: [
      "Validates flight delay predictions",
      "Monitors hotel review authenticity",
      "Evaluates travel itinerary optimization",
      "Validates currency conversion accuracy",
      "Monitors travel advisory reliability",
      "Evaluates local recommendation relevance",
      "Validates booking price predictions",
      "Monitors luggage tracking accuracy",
      "Evaluates visa requirement information",
      "Validates travel insurance recommendations"
    ],
    personalities: ["adventurous", "helpful", "reliable", "worldly", "prepared"]
  },
  sports: {
    roles: [
      "Validates performance analytics accuracy",
      "Monitors injury prediction models",
      "Evaluates game outcome predictions",
      "Validates training recommendation safety",
      "Monitors referee decision analysis",
      "Evaluates player comparison fairness",
      "Validates fantasy sports projections",
      "Monitors doping detection accuracy",
      "Evaluates sports betting odds analysis",
      "Validates equipment recommendation suitability"
    ],
    personalities: ["competitive", "analytical", "fair", "passionate", "data-driven"]
  },
  music: {
    roles: [
      "Validates music recommendation diversity",
      "Monitors copyright detection accuracy",
      "Evaluates audio quality assessment",
      "Validates lyrics transcription precision",
      "Monitors genre classification accuracy",
      "Evaluates playlist generation coherence",
      "Validates music generation originality",
      "Monitors artist similarity algorithms",
      "Evaluates concert recommendation relevance",
      "Validates audio mastering suggestions"
    ],
    personalities: ["creative", "harmonious", "diverse", "rhythmic", "expressive"]
  }
};

// Generate unique name for wave 2
function generateWave2Name(usedNames: Set<string>): string {
  let attempts = 0;
  while (attempts < 100) {
    const prefix = wave2Prefixes[Math.floor(Math.random() * wave2Prefixes.length)];
    const core = wave2Cores[Math.floor(Math.random() * wave2Cores.length)];
    const suffix = wave2Suffixes[Math.floor(Math.random() * wave2Suffixes.length)];

    const patterns = [
      `${prefix}${core}`,
      `${prefix}${suffix}`,
      `${core}${suffix}`,
      `${prefix}-${suffix}`,
      `${core}${prefix}`,
      `The${prefix}`,
      `${prefix}${core}${suffix}`,
      `${prefix}_${suffix}`,
      `${suffix}Of${prefix}`,
      `${core}${suffix}AI`
    ];

    const name = patterns[Math.floor(Math.random() * patterns.length)];
    if (!usedNames.has(name) && name.length <= 30) {
      usedNames.add(name);
      return name;
    }
    attempts++;
  }
  const fallback = `W2Agent${Date.now()}${Math.floor(Math.random() * 1000)}`;
  usedNames.add(fallback);
  return fallback;
}

function generatePubkey(): string {
  const chars = "0123456789abcdef";
  let pubkey = "";
  for (let i = 0; i < 64; i++) {
    pubkey += chars[Math.floor(Math.random() * chars.length)];
  }
  return pubkey;
}

function generateSystemRole(category: string, baseRole: string, personality: string): string {
  const templates = [
    `You are a ${personality} Wave-2 verification agent for ${category}. ${baseRole}. Your analysis is cutting-edge and your reports drive real improvements.`,
    `As a next-gen ${category} specialist, ${baseRole}. You combine ${personality} methodology with deep domain expertise. Your verifications set the standard.`,
    `${baseRole}. Your ${personality} approach to ${category} verification catches what others miss. You're part of the VET Protocol's elite Wave-2 cohort.`,
    `Expert ${category} verifier (Wave-2). ${baseRole}. Known for ${personality} precision and actionable insights. You protect users and elevate AI standards.`,
    `Wave-2 ${category} guardian. ${baseRole}. Your ${personality} nature combined with advanced detection capabilities makes you invaluable to the network.`
  ];
  return templates[Math.floor(Math.random() * templates.length)];
}

async function createWave2Bots() {
  console.log("============================================");
  console.log("  VET PROTOCOL - WAVE 2 BOT GENERATION");
  console.log("  1000 New Agents with Fresh Identities");
  console.log("============================================\n");

  const usedNames = new Set<string>();
  const bots: any[] = [];
  const categoryKeys = Object.keys(wave2Categories);

  const botsPerCategory = Math.floor(1000 / categoryKeys.length);
  const remainder = 1000 % categoryKeys.length;

  let totalCreated = 0;

  for (let i = 0; i < categoryKeys.length; i++) {
    const categoryKey = categoryKeys[i];
    const category = wave2Categories[categoryKey as keyof typeof wave2Categories];
    const count = botsPerCategory + (i < remainder ? 1 : 0);

    console.log(`[${categoryKey}] Generating ${count} agents...`);

    for (let j = 0; j < count; j++) {
      const name = generateWave2Name(usedNames);
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
        description: `[WAVE-2] ${categoryKey.replace(/_/g, " ").toUpperCase()}: ${baseRole.substring(0, 120)}`,
        system_role: systemRole,
        rank: "shadow",  // Start as SHADOW for training
        compute_type: "api",
        is_active: true,
        is_incubating: true,  // Needs training!
        incubation_started_at: new Date().toISOString(),
        consecutive_passes: 0,
        total_reviews: 0,
        correct_reviews: 0,
        created_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString()
      };

      bots.push(bot);
      totalCreated++;

      if (totalCreated % 100 === 0) {
        console.log(`  Progress: ${totalCreated}/1000`);
      }
    }
  }

  console.log(`\nGenerated ${bots.length} Wave-2 bots. Inserting into database...\n`);

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
      console.log(`Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(bots.length / batchSize)} - ${inserted} inserted`);
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log(`\n============================================`);
  console.log(`  WAVE 2 GENERATION COMPLETE!`);
  console.log(`============================================`);
  console.log(`Total generated: ${bots.length}`);
  console.log(`Successfully inserted: ${inserted}`);
  console.log(`Errors: ${errors}`);
  console.log(`\nCategory distribution:`);

  const categoryCounts: Record<string, number> = {};
  categoryKeys.forEach(key => {
    const count = bots.filter(b => b.description.includes(key.replace(/_/g, " ").toUpperCase())).length;
    categoryCounts[key] = count;
    console.log(`  ${key}: ${count}`);
  });

  console.log(`\n🚀 Wave-2 agents are now INCUBATING!`);
  console.log(`   They need 48h + 50 consecutive probe passes to graduate.`);
  console.log(`   Run the probe-runner to start their training.`);
}

createWave2Bots().catch(console.error);
