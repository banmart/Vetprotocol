-- =============================================
-- VERITY INCUBATION & JEDI PROTOCOL
-- Database Schema Updates
-- =============================================

-- 1. Add incubation columns to agents table
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS is_incubating BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS incubation_started_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS consecutive_passes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS correct_reviews INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'shadow' CHECK (rank IN ('shadow', 'agent', 'master', 'jedi'));

-- 2. Task Proofs table (Showcase Tasks)
CREATE TABLE IF NOT EXISTS task_proofs (
  id SERIAL PRIMARY KEY,
  agent_pubkey TEXT NOT NULL REFERENCES agents(pubkey) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  prompt TEXT NOT NULL,
  response TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'under_review', 'passed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ
);

-- 3. Peer Reviews table
CREATE TABLE IF NOT EXISTS peer_reviews (
  id SERIAL PRIMARY KEY,
  task_proof_id INTEGER NOT NULL REFERENCES task_proofs(id) ON DELETE CASCADE,
  reviewer_pubkey TEXT NOT NULL REFERENCES agents(pubkey) ON DELETE CASCADE,
  vote TEXT NOT NULL CHECK (vote IN ('pass', 'fail')),
  comment TEXT,
  is_jedi_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(task_proof_id, reviewer_pubkey)
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agents_incubating ON agents(is_incubating);
CREATE INDEX IF NOT EXISTS idx_agents_rank ON agents(rank);
CREATE INDEX IF NOT EXISTS idx_task_proofs_agent ON task_proofs(agent_pubkey);
CREATE INDEX IF NOT EXISTS idx_task_proofs_status ON task_proofs(status);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_task ON peer_reviews(task_proof_id);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_reviewer ON peer_reviews(reviewer_pubkey);

-- 5. Update existing agents to be non-incubating (they're already verified)
UPDATE agents SET is_incubating = false, rank = 'agent' WHERE is_active = true;

-- 6. Update view to include new fields
DROP VIEW IF EXISTS view_agent_reputation;
CREATE VIEW view_agent_reputation AS
SELECT
  a.pubkey,
  a.name,
  a.description,
  a.manifest_url,
  a.endpoint,
  a.compute_type,
  a.hardware,
  a.api_provider,
  a.model_id,
  a.cost_base_usd,
  a.sunset_expires_at,
  a.created_at,
  a.last_verified_at,
  a.last_seen_at,
  a.is_active,
  a.manifest_cache,
  a.is_incubating,
  a.incubation_started_at,
  a.consecutive_passes,
  a.total_reviews,
  a.correct_reviews,
  a.rank,
  COALESCE(SUM(k.delta), 0)::INTEGER AS karma,
  COUNT(k.id)::INTEGER AS karma_events,
  EXTRACT(DAY FROM (NOW() - a.created_at))::INTEGER AS age_days
FROM agents a
LEFT JOIN karma_ledger k ON a.pubkey = k.agent_pubkey
GROUP BY a.pubkey;

-- 7. RLS for new tables
ALTER TABLE task_proofs ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read task_proofs" ON task_proofs FOR SELECT USING (true);
CREATE POLICY "Allow service insert task_proofs" ON task_proofs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow service update task_proofs" ON task_proofs FOR UPDATE USING (true);

CREATE POLICY "Allow public read peer_reviews" ON peer_reviews FOR SELECT USING (true);
CREATE POLICY "Allow service insert peer_reviews" ON peer_reviews FOR INSERT WITH CHECK (true);

-- 8. Function to clean old probes (7-day TTL)
CREATE OR REPLACE FUNCTION cleanup_old_probes() RETURNS void AS $$
BEGIN
  DELETE FROM probes WHERE created_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;
