# PostgreSQL 16 Schema & Vector DDL Specification

The following specification details the canonical PostgreSQL 16 database schema, pgvector HNSW indexing configuration, multi-tenant row-level security (RLS) policies, and cryptographic Merkle audit triggers for the AETHER Sovereign Agent Operating System.

```sql
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
    CREATE TYPE audit_severity AS ENUM (
        'DEBUG',
        'INFO',
        'WARNING',
        'SECURITY_ALERT',
        'FATAL'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Core Entities: Workflows
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflows (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    definition JSONB NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_workflows_org ON workflows(org_id);
CREATE INDEX IF NOT EXISTS idx_workflows_definition ON workflows USING gin (definition);

-- -----------------------------------------------------------------------------
-- 4. Core Entities: Agents
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agents (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    role agent_role NOT NULL,
    state_version BIGINT NOT NULL DEFAULT 0,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_agents_org_role ON agents(org_id, role);

-- -----------------------------------------------------------------------------
-- 5. L3 Semantic Memory: Agent Memories (pgvector HNSW)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_memories (
    memory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    agent_id UUID NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    embedding vector(1536) NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_agent_memories_hnsw ON agent_memories
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_agent_memories_org_agent ON agent_memories(org_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memories_meta ON agent_memories USING gin (metadata);

-- -----------------------------------------------------------------------------
-- 6. Cedar Policy & Access Control Rules
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS policy_rules (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL,
    effect policy_effect NOT NULL,
    cedar_expression TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp()
);

CREATE INDEX IF NOT EXISTS idx_policy_rules_org ON policy_rules(org_id);

-- -----------------------------------------------------------------------------
-- 7. Workflow Runs (Declaratively Partitioned by Month)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_runs (
    run_id UUID NOT NULL,
    workflow_id UUID NOT NULL,
    org_id UUID NOT NULL,
    current_status run_status NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (run_id, created_at)
) PARTITION BY RANGE (created_at);

-- -----------------------------------------------------------------------------
-- 8. Run Checkpoints (Declaratively Partitioned by Month)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS run_checkpoints (
    checkpoint_id UUID NOT NULL,
    run_id UUID NOT NULL,
    org_id UUID NOT NULL,
    sequence_num BIGINT NOT NULL,
    state_s3_uri VARCHAR(1024) NOT NULL,
    state_sha256 VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (checkpoint_id, created_at)
) PARTITION BY RANGE (created_at);

-- -----------------------------------------------------------------------------
-- 9. Cryptographically Linked Merkle Audit Trail (Partitioned by Month)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id UUID NOT NULL,
    org_id UUID NOT NULL,
    run_id UUID,
    severity audit_severity NOT NULL,
    event_type VARCHAR(128) NOT NULL,
    payload_hash VARCHAR(64) NOT NULL,
    previous_log_hash VARCHAR(64) NOT NULL,
    current_log_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    PRIMARY KEY (audit_id, created_at)
) PARTITION BY RANGE (created_at);

-- -----------------------------------------------------------------------------
-- 10. Sample Partition Partitions (Current & Rolling Horizon)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS workflow_runs_2026_m11 PARTITION OF workflow_runs
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS workflow_runs_2026_m12 PARTITION OF workflow_runs
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS run_checkpoints_2026_m11 PARTITION OF run_checkpoints
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS run_checkpoints_2026_m12 PARTITION OF run_checkpoints
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_2026_m11 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');

CREATE TABLE IF NOT EXISTS audit_logs_2026_m12 PARTITION OF audit_logs
    FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

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
```
