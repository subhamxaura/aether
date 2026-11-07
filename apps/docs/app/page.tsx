import React from "react";

export default function DocsPage() {
  return (
    <main style={{ padding: "3rem 2rem", maxWidth: "960px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0 0 1rem 0", color: "#38bdf8" }}>
        AETHER Documentation Portal
      </h1>
      <p style={{ fontSize: "1.15rem", color: "#94a3b8", lineHeight: 1.6, marginBottom: "3rem" }}>
        Architecture blueprints, data schemas, API contracts, and deployment guides for the
        Aether Sovereign Agent Operating System.
      </p>

      <div style={{ display: "grid", gap: "1.5rem" }}>
        <article
          style={{
            padding: "1.5rem",
            borderRadius: "0.5rem",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.35rem" }}>
            <a href="/docs/architecture" style={{ color: "#38bdf8", textDecoration: "none" }}>
              System Architecture & 4-Plane Topology →
            </a>
          </h2>
          <p style={{ margin: 0, color: "#94a3b8" }}>
            Deep dive into the Ingress Gateway, Control Plane Kernel (aetherd), Worker Sandboxes,
            and Sovereign Memory Fabric.
          </p>
        </article>

        <article
          style={{
            padding: "1.5rem",
            borderRadius: "0.5rem",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.35rem" }}>
            <a href="/docs/api-specification" style={{ color: "#38bdf8", textDecoration: "none" }}>
              API Specification & gRPC Contracts →
            </a>
          </h2>
          <p style={{ margin: 0, color: "#94a3b8" }}>
            OpenAPI 3.1 REST contracts with Idempotency-Key handling and runtimev1.proto gRPC
            definitions.
          </p>
        </article>

        <article
          style={{
            padding: "1.5rem",
            borderRadius: "0.5rem",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <h2 style={{ margin: "0 0 0.5rem 0", fontSize: "1.35rem" }}>
            <a href="/docs/data-models" style={{ color: "#38bdf8", textDecoration: "none" }}>
              PostgreSQL 16 Schema & Vector DDL →
            </a>
          </h2>
          <p style={{ margin: 0, color: "#94a3b8" }}>
            Monthly partitioned runs, checkpoints, HNSW vector indexing, Cedar ABAC policies, and
            Merkle audit chain triggers.
          </p>
        </article>
      </div>
    </main>
  );
}
