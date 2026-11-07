import React from "react";
import Link from "next/link";

export default function DocsPage() {
  return (
    <main style={{ padding: "4rem 2rem", maxWidth: "1080px", margin: "0 auto" }}>
      <header style={{ marginBottom: "3.5rem" }}>
        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            background: "rgba(56, 189, 248, 0.1)",
            color: "#38bdf8",
            fontSize: "0.85rem",
            fontWeight: 600,
            marginBottom: "1rem",
            border: "1px solid rgba(56, 189, 248, 0.2)",
          }}
        >
          AETHER Documentation Portal
        </div>
        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 800,
            margin: "0 0 1rem 0",
            color: "#f8fafc",
            letterSpacing: "-0.025em",
          }}
        >
          Developer & Architecture Guides
        </h1>
        <p
          style={{
            fontSize: "1.2rem",
            color: "#94a3b8",
            lineHeight: 1.6,
            maxWidth: "760px",
            margin: 0,
          }}
        >
          Explore system architecture blueprints, formal API specifications, PostgreSQL data models, and high-iteration benchmark audit reports for the Aether Sovereign Agent Operating System.
        </p>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <article
          style={{
            padding: "2rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#38bdf8" }}>
              Core Architecture
            </span>
            <h2 style={{ margin: "0.75rem 0", fontSize: "1.35rem" }}>
              <Link href="/docs/architecture" style={{ color: "#f8fafc", textDecoration: "none" }}>
                System Architecture & 4-Plane Topology
              </Link>
            </h2>
            <p style={{ margin: "0 0 1.5rem 0", color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6 }}>
              Deep dive into the Ingress Gateway, Control Plane Kernel (aetherd), Worker Sandboxes, and Sovereign Memory Fabric.
            </p>
          </div>
          <Link href="/docs/architecture" style={{ color: "#38bdf8", fontWeight: 600, textDecoration: "none" }}>
            Read Specification →
          </Link>
        </article>

        <article
          style={{
            padding: "2rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#38bdf8" }}>
              API & Protocols
            </span>
            <h2 style={{ margin: "0.75rem 0", fontSize: "1.35rem" }}>
              <Link href="/docs/api-specification" style={{ color: "#f8fafc", textDecoration: "none" }}>
                API Specification & gRPC Contracts
              </Link>
            </h2>
            <p style={{ margin: "0 0 1.5rem 0", color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6 }}>
              OpenAPI 3.1 REST contracts with Idempotency-Key headers, SSE streaming, and runtimev1.proto definitions.
            </p>
          </div>
          <Link href="/docs/api-specification" style={{ color: "#38bdf8", fontWeight: 600, textDecoration: "none" }}>
            Read Specification →
          </Link>
        </article>

        <article
          style={{
            padding: "2rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#38bdf8" }}>
              Database & Memory
            </span>
            <h2 style={{ margin: "0.75rem 0", fontSize: "1.35rem" }}>
              <Link href="/docs/data-models" style={{ color: "#f8fafc", textDecoration: "none" }}>
                PostgreSQL 16 Schema & Vector DDL
              </Link>
            </h2>
            <p style={{ margin: "0 0 1.5rem 0", color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6 }}>
              Monthly partitioned runs, checkpoints, HNSW vector indexing, Cedar ABAC policies, and Merkle triggers.
            </p>
          </div>
          <Link href="/docs/data-models" style={{ color: "#38bdf8", fontWeight: 600, textDecoration: "none" }}>
            Read Specification →
          </Link>
        </article>

        <article
          style={{
            padding: "2rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#38bdf8" }}>
              Production Ops
            </span>
            <h2 style={{ margin: "0.75rem 0", fontSize: "1.35rem" }}>
              <Link href="/docs/launch-plan" style={{ color: "#f8fafc", textDecoration: "none" }}>
                Production Launch Plan & Topology
              </Link>
            </h2>
            <p style={{ margin: "0 0 1.5rem 0", color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6 }}>
              Cloud hosting topology, environment configs, Cloudflare/AWS setup, and 25-point launch checklist.
            </p>
          </div>
          <Link href="/docs/launch-plan" style={{ color: "#38bdf8", fontWeight: 600, textDecoration: "none" }}>
            Read Specification →
          </Link>
        </article>

        <article
          style={{
            padding: "2rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#38bdf8" }}>
              Roadmap
            </span>
            <h2 style={{ margin: "0.75rem 0", fontSize: "1.35rem" }}>
              <Link href="/docs/roadmap" style={{ color: "#f8fafc", textDecoration: "none" }}>
                Phased Execution Roadmap (M1–M4)
              </Link>
            </h2>
            <p style={{ margin: "0 0 1.5rem 0", color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6 }}>
              MVP foundation, collaborative ecosystem, and enterprise scale milestones ($1M ARR trajectory).
            </p>
          </div>
          <Link href="/docs/roadmap" style={{ color: "#38bdf8", fontWeight: 600, textDecoration: "none" }}>
            Read Specification →
          </Link>
        </article>

        <article
          style={{
            padding: "2rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700, color: "#38bdf8" }}>
              Verification
            </span>
            <h2 style={{ margin: "0.75rem 0", fontSize: "1.35rem" }}>
              <Link href="/docs/audit-report" style={{ color: "#f8fafc", textDecoration: "none" }}>
                Hardening & 1M-Event Benchmark Audit
              </Link>
            </h2>
            <p style={{ margin: "0 0 1.5rem 0", color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.6 }}>
              Full test logs, 32.7M events/sec fold replay telemetry, state machine fuzzing, and forensic verification.
            </p>
          </div>
          <Link href="/docs/audit-report" style={{ color: "#38bdf8", fontWeight: 600, textDecoration: "none" }}>
            Read Specification →
          </Link>
        </article>
      </div>

      <footer
        style={{
          marginTop: "5rem",
          paddingTop: "2rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          justifyContent: "space-between",
          color: "#64748b",
          fontSize: "0.875rem",
        }}
      >
        <div>AETHER Sovereign Agent Operating System • Apache 2.0</div>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <a href="http://localhost:3000" style={{ color: "#64748b", textDecoration: "none" }}>
            Main Website (:3000)
          </a>
          <a
            href="https://github.com/subhamxaura/aether"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#64748b", textDecoration: "none" }}
          >
            GitHub
          </a>
        </div>
      </footer>
    </main>
  );
}
