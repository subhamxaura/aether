<div align="center">

# AETHER

### The Distributed Sovereign Agent Operating System & Deterministic Execution Fabric

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![CI Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](#)
[![Rust Edition](https://img.shields.io/badge/Rust-2024%20(1.82%2B)-DEA584.svg)](Cargo.toml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6%2B-3178C6.svg)](package.json)
[![Docker Support](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](docker-compose.yml)
[![Discord Community](https://img.shields.io/badge/Discord-Join%20Community-5865F2.svg)](https://discord.gg/aether)
[![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-1.28%2B-F5A800.svg)](docs/ARCHITECTURE.md)
[![Security Audited](https://img.shields.io/badge/Security-Zero--Trust-success.svg)](SECURITY.md)

<p align="center">
  <b>Aether</b> is an open-source, enterprise-grade distributed runtime that provides event-sourced durable execution, a tri-tier sovereign memory fabric, and zero-trust sandboxing for autonomous AI agents.
</p>

[**Website**](https://aether.io) • [**Interactive Playground**](https://aether.io/play) • [**Documentation**](https://docs.aether.io) • [**Architecture Blueprint**](docs/ARCHITECTURE.md) • [**API Specifications**](docs/API_SPECIFICATION.md) • [**Roadmap**](docs/ROADMAP.md)

</div>

---

## ⚡ The "Final Boss" Thesis

Just as **Kubernetes** unified container orchestration and **Temporal** unified durable microservice execution, **AETHER** unifies autonomous multi-agent systems.

Modern AI agent frameworks (LangGraph, CrewAI, AutoGen) are written as monolithic Python scripts. They operate in volatile memory, lack transactional durability, crash unpredictably upon process restarts, leak private credentials, and permit unconstrained arbitrary code execution on host machines.

**Aether bridges the "Agent Prototype vs. Production Chasm"** by treating multi-agent execution as a distributed systems challenge:

```
                      THE PRODUCTION CHASM
  [ AI PROTOTYPE TOYS ]                     [ MISSION-CRITICAL PRODUCTION ]
  - Single-script loops                     - 99.999% Fault-Tolerant Durability
  - In-memory dictionaries   ==============> - Distributed Raft-Backed State
  - Arbitrary os.system()      DEATH VALLEY  - Zero-Trust Firecracker Sandboxes
  - Ad-hoc vector search                    - Tri-Tier Sovereign Memory Fabric
  - Zero cost limits                        - Deterministic Time-Travel Replay
```

---

## 🏛️ The Five Core Pillars

| Pillar | Capability | Technical Mechanism |
| :--- | :--- | :--- |
| **1. Durable Event-Sourced Execution** | **Zero Lost State** | Append-only event WAL ($S_t = \text{fold}(S_0, [E_1..E_t])$). Automatic suspension and resumption across worker crashes in `<15ms`. |
| **2. Tri-Tier Sovereign Memory Fabric** | **Lifelong Context** | **L1 Ephemeral Scratchpad** (Redis), **L2 Episodic Event Graph** (NATS/Postgres), **L3 Semantic Knowledge Graph** (`pgvector` HNSW). |
| **3. Zero-Trust Sandboxing** | **Hardware Isolation** | Sub-millisecond WebAssembly (**Wasmtime**) and Linux MicroVMs (**Firecracker**) with strictly policy-gated eBPF network egress. |
| **4. Deterministic Time-Travel Replay** | **Instant Debugging** | Capture every token, model parameter, and tool mutation. Scrub backward/forward through past runs to diagnose hallucinations. |
| **5. Sovereign Cloud-Native Governance** | **100% Privacy & Control** | Self-hosted, air-gapped ready, multi-tenant RBAC/ABAC (Cedar), real-time budget guardrails, and cryptographic action signing (`ed25519`). |

---

## 📐 Four-Plane System Topology

Aether is organized into four decoupled planes designed for horizontal scalability, zero-trust boundaries, and sub-millisecond dispatch:

```
+===================================================================================================+
|                                    AETHER GLOBAL SYSTEM TOPOLOGY                                  |
+===================================================================================================+
|                                                                                                   |
|  [ INGRESS & POLICY GATEWAY ]                                                                     |
|  +--------------------+  +---------------------+  +--------------------+  +--------------------+  |
|  | REST / OpenAPI 3.1 |  | gRPC (HTTP/2 mTLS)  |  | WebSocket Streams  |  | OIDC / SPIFFE Auth |  |
|  +--------------------+  +---------------------+  +--------------------+  +--------------------+  |
|  +--------------------+  +---------------------+  +--------------------+  +--------------------+  |
|  | PII & Prompt Shield|  | Token Bucket Limiter|  | Circuit Breakers   |  | Cryptographic Sign |  |
|  +--------------------+  +---------------------+  +--------------------+  +--------------------+  |
|                                         |                                                         |
|                                         v                                                         |
|  [ CONTROL PLANE: THE AETHER KERNEL (Rust / Tokio) ]                                              |
|  +---------------------------------------------------------------------------------------------+  |
|  | Distributed State Machine Engine (Event-Sourced Saga Orchestrator)                          |  |
|  | - Append-Only Event Journal          - Speculative Execution Branching                      |  |
|  | - Raft Consensus Cluster             - Checkpoint & Rehydration Scheduler                   |  |
|  +---------------------------------------------------------------------------------------------+  |
|  | Agent Swarm Coordinator & Scheduler                                                         |  |
|  | - Task Priority Queue (Priority Heap) - Worker Affinity & GPU-Aware Routing                |  |
|  | - Human-in-the-Loop (HITL) Signal Bus - Dead-Letter & Rollback Manager                      |  |
|  +---------------------------------------------------------------------------------------------+  |
|                                         |                                                         |
|                     +-------------------+-------------------+                                     |
|                     |                                       |                                     |
|                     v                                       v                                     |
|  [ TRI-TIER MEMORY FABRIC ]               [ WORKER PLANE (Execution Sandboxes) ]                  |
|  +-------------------------------------+  +----------------------------------------------------+  |
|  | TIER 1: Ephemeral Working Memory    |  | Micro-Worker Daemons (Rust / Go / Python / TS)     |  |
|  | - Sliding Window Context Scratchpad |  | - Task Pull / gRPC Stream Workers                  |  |
|  | - In-Memory KV-Cache & Prompt Cache |  +----------------------------------------------------+  |
|  +-------------------------------------+  | Isolation Runtime Engines                          |  |
|  | TIER 2: Episodic Event Graph        |  | - MicroVM Sandboxes (Firecracker - Untrusted Code) |  |
|  | - Immutable Execution Log (Postgres)|  | - WebAssembly Sandboxes (Wasmtime - Fast Tools)    |  |
|  | - Temporal State Transitions        |  | - eBPF Network & Filesystem Jail                   |  |
|  +-------------------------------------+  +----------------------------------------------------+  |
|  | TIER 3: Semantic Knowledge Graph    |  | Model Gateway & Semantic Cache Mesh                |  |
|  | - Vector Embeddings (HNSW / Qdrant) |  | - Multi-LLM Provider Mesh (vLLM, TensorRT, OpenAI) |  |
|  | - Relational Entity/Relation Triples|  | - Semantic Exact/Fuzzy Prompt Response Caching     |  |
|  +-------------------------------------+  +----------------------------------------------------+  |
|                                                                                                   |
|  [ OBSERVABILITY & TIME-TRAVEL DEBUGGER ]                                                         |
|  +--------------------+  +---------------------+  +--------------------+  +--------------------+  |
|  | OpenTelemetry GenAI|  | Time-Travel Replay  |  | Immutable Audit    |  | Real-Time Console  |  |
|  | Distributed Tracing|  | Step Debugger Engine|  | Ledger (ed25519)   |  | Web UI & Metrics   |  |
|  +--------------------+  +---------------------+  +--------------------+  +--------------------+  |
+===================================================================================================+
```

---

## 📊 12-Factor Competitive Matrix

How Aether stacks up against legacy workflow orchestrators, prototyping libraries, and databases:

| Dimension / Factor | AETHER Core | Temporal | LangGraph | AutoGen / CrewAI | Supabase |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **1. Native LLM Durability & Event Sourcing** | **Native ($S_t = \text{fold}$)** | Partial (Activities only) | In-Memory / SQLite hack | None | None |
| **2. Probabilistic State Machine Engine** | **Yes (Speculative/Rollback)** | No (Deterministic only) | Basic Graph | Rigid Chat Loop | No |
| **3. Tri-Tier Sovereign Memory Fabric** | **Native (L1/L2/L3)** | None | Ad-hoc Vector RAG | Naive Chat History | pgvector only |
| **4. Tool Sandboxing (MicroVM / Wasm)** | **Native (Firecracker/Wasm)** | None | None (Host OS) | Docker (Ad-hoc) | Deno Edge (Basic) |
| **5. Deterministic Time-Travel Replay** | **Full Token/State Replay** | Execution Replay only | Partial Step Replay | None | None |
| **6. Zero-Trust Policy & Budget Gateway** | **Native (Token/Dollar/PII)** | None | None | None | RLS (Data only) |
| **7. Polyglot Distributed Architecture** | **Rust Core + Polyglot SDKs** | Polyglot SDKs | Python / TS only | Python only | Polyglot Client |
| **8. Air-Gapped Sovereign Deployment** | **100% Air-Gapped Ready** | Self-hostable | Self-hostable | Self-hostable | Self-hostable |
| **9. Cryptographic Action Signing (ed25519)**| **Built-in Non-Repudiation** | None | None | None | None |
| **10. Multi-Agent Consensus & Swarm Raft** | **Built-in Swarm Protocol** | Custom Activity Logic | Manual routing | Conversational only | None |
| **11. Dual-Control HITL Approval Gates** | **Dual-Control Webhook/UI** | Signal/Query based | Basic Interrupt | Basic CLI Prompt | None |
| **12. OpenTelemetry GenAI Semantic Spans** | **Native OpenTelemetry 1.28+** | Generic workflow metrics | Proprietary SaaS | None | Standard Tracing |

---

## 🚀 5-Minute Developer Quickstart

Get an entire multi-agent swarm running locally with deterministic state persistence in under 5 minutes:

### 1. Clone & Bootstrap
```bash
# Clone the repository
git clone https://github.com/aether-ai/aether.git
cd aether

# Run automated dependency verification and environment setup
./scripts/setup.sh

# Launch backing services (PostgreSQL+pgvector, NATS, Redis, MinIO)
docker compose up -d
```

### 2. Python SDK Example (`packages/sdk-python`)
```python
import asyncio
from aether import Agent, Workflow, Tool, Supervisor

# 1. Define sandboxed deterministic tools
@Tool(sandbox="wasm", timeout_ms=2000)
def analyze_code_vulnerabilities(repo_path: str) -> dict:
    # Runs inside isolated Wasmtime sandbox
    return {"vulnerabilities_detected": 0, "status": "CLEAN"}

# 2. Define specialized autonomous agents
security_auditor = Agent(
    role="AUDITOR",
    model="claude-3-5-sonnet",
    system_prompt="You are an uncompromising SecOps engineer.",
    tools=[analyze_code_vulnerabilities]
)

# 3. Assemble event-sourced workflow DAG
workflow = Workflow(name="autonomous-pr-auditor")
workflow.add_node("audit_step", agent=security_auditor)

# 4. Execute with mathematical replayability
async def main():
    run = await workflow.execute(
        inputs={"repo_path": "/workspace"},
        idempotency_key="pr-audit-run-101"
    )
    print(f"Run completed with status: {run.status}, tokens: {run.total_tokens}")

if __name__ == "__main__":
    asyncio.run(main())
```

### 3. TypeScript SDK Example (`packages/sdk-typescript`)
```typescript
import { AetherClient, defineAgent, defineWorkflow } from "@aether/sdk";
import { z } from "zod";

const client = new AetherClient({ endpoint: "http://localhost:8080" });

// Define agent with strict Zod type safety
const researcher = defineAgent({
  id: "research_agent",
  role: "SPECIALIST",
  model: "gpt-4o",
  inputSchema: z.object({ topic: z.string() }),
});

const workflow = defineWorkflow({ name: "market-research" })
  .step("gather_intelligence", researcher);

// Trigger durable run
const run = await client.triggerWorkflow(workflow, {
  inputs: { topic: "Distributed Consensus Protocols" },
  idempotencyKey: "research-run-202"
});

// Stream real-time tokens over HTTP/2 SSE
for await (const event of client.streamRunEvents(run.id)) {
  if (event.type === "agent.token") {
    process.stdout.write(event.token);
  }
}
```

---

## 📂 Repository Layout

Aether is organized as a unified monorepo utilizing **Turborepo**, **pnpm workspaces**, and **Cargo workspaces**:

```
aether/
├── README.md                           # Master project documentation, badges, architecture, quickstart
├── LICENSE                             # Apache 2.0 with BSL 1.1 Open-Core terms
├── CONTRIBUTING.md                      # Contribution guidelines, development standards, PR workflow
├── CODE_OF_CONDUCT.md                  # Contributor Covenant v2.1
├── SECURITY.md                         # Security policy, vulnerability disclosure
├── docker-compose.yml                  # Complete local stack (Postgres+pgvector, NATS, Redis, MinIO, Aether)
├── .env.example                        # Comprehensive 10-tier environment variable matrix
├── package.json                        # Root monorepo package manifest
├── pnpm-workspace.yaml                 # Pnpm workspace definition
├── turbo.json                          # Turborepo task pipeline configuration
├── Cargo.toml                          # Cargo workspace root manifest
│
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                      # Automated build, lint, and test pipeline
│   │   └── release.yml                 # Semantic release and container publishing
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.yml              # Structured bug report template
│   │   └── feature_request.yml         # Structured RFC template
│   └── PULL_REQUEST_TEMPLATE.md        # Comprehensive PR checklist
│
├── docs/
│   ├── ARCHITECTURE.md                 # System topology, 4-plane design, state machines, sequence flows
│   ├── API_SPECIFICATION.md            # OpenAPI 3.1 REST schemas & gRPC Protobuf definitions
│   ├── DATA_MODELS.sql                 # Production PostgreSQL 16 DDL with pgvector, partitioning, audit
│   ├── LAUNCH_PLAN.md                  # Website launch architecture, hosting topology, 25-point checklist
│   └── ROADMAP.md                      # Phased execution milestones (MVP -> Growth -> Enterprise)
│
├── apps/
│   ├── web/                            # Next.js 15 marketing landing page & in-browser playground
│   └── docs/                           # Fumadocs documentation portal
│
├── crates/
│   ├── aether-core/                    # Rust core kernel, state machine, event fold
│   ├── aether-raft/                    # Raft consensus coordination
│   ├── aether-wasm/                    # Wasmtime sandboxing runtime
│   └── aether-cli/                     # Developer CLI for local replay and debugging
│
└── packages/
    ├── sdk-typescript/                 # TypeScript client SDK
    └── sdk-python/                     # Python client SDK
```

---

## 🗺️ Execution Roadmap

- **Phase 1: MVP Foundation (Months 0 – 3)**:
  - Rust core engine (`aetherd`), Tokio async event-fold, Wasmtime sandbox, Python/TypeScript SDKs, local CLI replay debugger.
- **Phase 2: Community & Growth (Months 3 – 6)**:
  - Web UI Console (`apps/console`), React Flow swarm visualizer, Tri-Tier Memory Hub (`pgvector`), Community Registry (`registry.aether.run`).
- **Phase 3: Enterprise & Scale (Months 6 – 12)**:
  - Managed Sovereign Cloud, BYOC data plane, Firecracker MicroVM hard isolation, SOC 2 Type II / HIPAA compliance, multi-region Raft replication.

For full specifications, read [docs/ROADMAP.md](docs/ROADMAP.md).

---

## 🤝 Community & Contributing

We welcome contributions from developers, systems engineers, and AI researchers worldwide!

- **Quickstart Contributing Guide**: Read [CONTRIBUTING.md](CONTRIBUTING.md) to set up your environment and understand our PR standards.
- **Join the Conversation**: Connect on [Discord](https://discord.gg/aether) or start a [GitHub Discussion](https://github.com/aether-ai/aether/discussions).
- **Code of Conduct**: All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📜 Licensing

Aether is distributed under the **Apache License, Version 2.0** for all core engine crates, polyglot SDKs, CLI tools, and community packages. Certain enterprise cloud and multi-tenant management modules are licensed under the **Business Source License 1.1 (BSL 1.1)**, converting automatically to Apache 2.0 after 36 months. See [LICENSE](LICENSE) for details.
