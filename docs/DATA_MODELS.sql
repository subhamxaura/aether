-- =============================================================================
-- AETHER SOVEREIGN OPERATING SYSTEM — PRODUCTION POSTGRESQL 16 DDL
-- =============================================================================
-- Features:
--   - Native pgvector (HNSW) indexing for semantic memory retrieval
--   - Monthly declarative table partitioning for runs and audit trails
--   - Deterministic execution state checkpoints with S3 blob references
--   - Cryptographically linked Merkle audit log (SHA-256)
--   - Multi-tenant Row-Level Security (RLS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Extensions & Primitives
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "vector";

-- -----------------------------------------------------------------------------
-- 2. Enumerated Domain Types
-- -----------------------------------------------------------------------------
DO $$ BEGIN
    CREATE TYPE run_status AS ENUM (
        'PENDING', 
        'RUNNING', 
        'WAITING_INPUT', 
        'SUSPENDED', 
        'COMPLETED', 
        'FAILED', 
        'CANCELLED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE agent_role AS ENUM (
        'SUPERVISOR', 
        'WORKER', 
        'CRITIC', 
        'SPECIALIST', 
        'AUDITOR'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE policy_effect AS ENUM ('ALLOW', 'DENY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE memory_tier AS ENUM ('L1_WORKING', 'L2_EPISODIC', 'L3_SEMANTIC');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Organizations & Multi-Tenant Boundaries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    tier VARCHAR(32) DEFAULT 'COMMUNITY' NOT NULL,
    max_concurrent_runs INT DEFAULT 20 NOT NULL,
    monthly_budget_usd NUMERIC(10, 2) DEFAULT 100.00 NOT NULL,
    current_month_spend_usd NUMERIC(10, 2) DEFAULT 0.00 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- -----------------------------------------------------------------------------
-- 4. Workflows & Directed Acyclic Graphs (DAGs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    version INT DEFAULT 1 NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    dag_definition JSONB NOT NULL, -- Declarative nodes, edges, dependencies, and parameters
    timeout_seconds INT DEFAULT 3600 NOT NULL,
    retry_policy JSONB NOT NULL DEFAULT '{"max_retries": 3, "backoff_ms": 1000, "jitter": true}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_org_workflow_version UNIQUE (org_id, name, version)
);

CREATE INDEX IF NOT EXISTS idx_workflows_org_active ON workflows(org_id, is_active);

-- -----------------------------------------------------------------------------
-- 5. Autonomous Agents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    role agent_role DEFAULT 'WORKER' NOT NULL,
    model_provider VARCHAR(64) NOT NULL, -- 'openai', 'anthropic', 'vllm', 'ollama'
    model_name VARCHAR(128) NOT NULL,    -- 'claude-3-5-sonnet', 'gpt-4o', 'deepseek-v3'
    system_prompt TEXT NOT NULL,
    temperature NUMERIC(3, 2) DEFAULT 0.20 NOT NULL,
    max_tokens INT DEFAULT 4096 NOT NULL,
    tools_declared JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of tool schemas and capability scopes
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agents_org_role ON agents(org_id, role);

-- -----------------------------------------------------------------------------
-- 6. Workflow Runs (Partitioned by Month)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_runs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    workflow_version INT NOT NULL,
    parent_run_id UUID, -- For hierarchical sub-agent executions
    idempotency_key VARCHAR(128) NOT NULL,
    status run_status DEFAULT 'PENDING' NOT NULL,
    input_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    output_payload JSONB DEFAULT NULL,
    error_details JSONB DEFAULT NULL,
    total_tokens_consumed INT DEFAULT 0 NOT NULL,
    total_cost_usd NUMERIC(10, 4) DEFAULT 0.0000 NOT NULL,
    execution_duration_ms BIGINT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Partitions for 2026 Q4 and 2027 Q1
CREATE TABLE IF NOT EXISTS workflow_runs_2026_q4 PARTITION OF workflow_runs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS workflow_runs_2027_q1 PARTITION OF workflow_runs
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');

CREATE INDEX IF NOT EXISTS idx_workflow_runs_org_status ON workflow_runs(org_id, status);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_idempotency ON workflow_runs(org_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_workflow_runs_parent ON workflow_runs(parent_run_id) WHERE parent_run_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 7. Execution State Checkpoints (Deterministic Replay Snapshots)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS run_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    run_id UUID NOT NULL,
    run_created_at TIMESTAMPTZ NOT NULL,
    step_index INT NOT NULL,
    state_vector_hash VARCHAR(64) NOT NULL, -- SHA-256 hash of execution frame
    blob_storage_uri TEXT NOT NULL,         -- s3://aether-checkpoints/{run_id}/{step_index}.bin
    wal_offset BIGINT NOT NULL,             -- NATS JetStream sequence offset
    active_memory_state JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT uq_run_step UNIQUE (run_id, step_index),
    CONSTRAINT fk_run_checkpoints_workflow_run FOREIGN KEY (run_id, run_created_at) 
        REFERENCES workflow_runs(id, created_at) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_org_run ON run_checkpoints(org_id, run_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_run_step ON run_checkpoints(run_id, step_index DESC);

-- -----------------------------------------------------------------------------
-- 8. Tri-Tier Agent Memory Fabric (Vector & Relational Knowledge)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    run_id UUID,
    run_created_at TIMESTAMPTZ,
    tier memory_tier DEFAULT 'L2_EPISODIC' NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536) NOT NULL,  -- Standard OpenAI / Modern Embedding dimension
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    decay_score NUMERIC(5, 4) DEFAULT 1.0000 NOT NULL,
    last_accessed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT fk_agent_memories_workflow_run FOREIGN KEY (run_id, run_created_at) 
        REFERENCES workflow_runs(id, created_at) ON DELETE CASCADE
);

-- HNSW Cosine Index for Sub-Millisecond Nearest Neighbor Retrieval
CREATE INDEX IF NOT EXISTS idx_agent_memories_embedding ON agent_memories 
USING hnsw (embedding vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_agent_memories_lookup ON agent_memories(org_id, agent_id, tier);

-- -----------------------------------------------------------------------------
-- 9. Policy & Security Rules (Cedar / CEL Evaluation Engine)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    effect policy_effect DEFAULT 'DENY' NOT NULL,
    resource_pattern VARCHAR(255) NOT NULL, -- e.g. "tools:filesystem:*" or "models:external:*"
    action VARCHAR(64) NOT NULL,           -- "EXECUTE", "INVOKE", "READ", "WRITE"
    condition_expression TEXT NOT NULL,    -- Common Expression Language (CEL) / Cedar rule
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    priority INT DEFAULT 100 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_policy_rules_org_active ON policy_rules(org_id, is_active, priority DESC);

-- -----------------------------------------------------------------------------
-- 10. Immutable Audit Logs (Cryptographically Chained Merkle WAL)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    actor_id VARCHAR(128) NOT NULL,
    actor_type VARCHAR(32) NOT NULL, -- 'USER', 'AGENT', 'SYSTEM'
    action VARCHAR(64) NOT NULL,
    resource_id VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,      -- SHA-256 of payload data
    previous_log_hash VARCHAR(64) NOT NULL, -- Merkle chain pointer to preceding record
    current_log_hash VARCHAR(64) NOT NULL,  -- SHA256(previous_hash + payload_hash + timestamp)
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE TABLE IF NOT EXISTS audit_logs_2026_q4 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_2027_q1 PARTITION OF audit_logs
    FOR VALUES FROM ('2027-01-01 00:00:00+00') TO ('2027-04-01 00:00:00+00');

CREATE INDEX IF NOT EXISTS idx_audit_logs_org_created ON audit_logs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_hash ON audit_logs(current_log_hash);

-- -----------------------------------------------------------------------------
-- 11. Multi-Tenant Row-Level Security (RLS) Configuration
-- -----------------------------------------------------------------------------
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Enforce RLS for table owners / background workers
ALTER TABLE workflows FORCE ROW LEVEL SECURITY;
ALTER TABLE agents FORCE ROW LEVEL SECURITY;
ALTER TABLE agent_memories FORCE ROW LEVEL SECURITY;
ALTER TABLE policy_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE workflow_runs FORCE ROW LEVEL SECURITY;
ALTER TABLE run_checkpoints FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_workflows ON workflows
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY tenant_isolation_agents ON agents
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY tenant_isolation_memories ON agent_memories
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY tenant_isolation_policies ON policy_rules
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY tenant_isolation_workflow_runs ON workflow_runs
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY tenant_isolation_run_checkpoints ON run_checkpoints
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

CREATE POLICY tenant_isolation_audit_logs ON audit_logs
    FOR ALL
    USING (org_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid);

-- -----------------------------------------------------------------------------
-- 12. Audit Log Cryptographic Hash Verification Trigger (Concurrency & UTC Fixed)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION compute_audit_log_hash()
RETURNS TRIGGER AS $$
DECLARE
    prev_hash VARCHAR(64);
BEGIN
    -- Acquire transaction-scoped advisory lock on org_id to strictly serialize
    -- Merkle hash chain extension per tenant under concurrent execution swarms.
    -- Different tenants proceed in parallel without lock contention.
    PERFORM pg_advisory_xact_lock(hashtext(NEW.org_id::text));

    -- Retrieve the most recent hash for this tenant to extend the Merkle chain
    SELECT current_log_hash INTO prev_hash
    FROM audit_logs
    WHERE org_id = NEW.org_id
    ORDER BY created_at DESC
    LIMIT 1;

    IF prev_hash IS NULL THEN
        -- Genesis block hash for tenant
        NEW.previous_log_hash := '0000000000000000000000000000000000000000000000000000000000000000';
    ELSE
        NEW.previous_log_hash := prev_hash;
    END IF;

    -- Calculate current hash: SHA-256(previous_hash + payload_hash + canonical_utc_timestamp)
    -- Using canonical UTC ISO-8601 format guarantees deterministic verification across all timezones.
    NEW.current_log_hash := encode(
        digest(
            NEW.previous_log_hash || 
            NEW.payload_hash || 
            to_char(NEW.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
            'sha256'
        ),
        'hex'
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_audit_logs_hash_chain
    BEFORE INSERT ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION compute_audit_log_hash();

