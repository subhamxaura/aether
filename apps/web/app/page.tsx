import React from "react";

export default function HomePage() {
  return (
    <main style={{ padding: "4rem 2rem", maxWidth: "1200px", margin: "0 auto" }}>
      <header style={{ marginBottom: "4rem", textAlign: "center" }}>
        <div
          style={{
            display: "inline-block",
            padding: "0.25rem 0.75rem",
            borderRadius: "9999px",
            background: "rgba(56, 189, 248, 0.1)",
            color: "#38bdf8",
            fontSize: "0.875rem",
            fontWeight: 600,
            marginBottom: "1rem",
            border: "1px solid rgba(56, 189, 248, 0.2)",
          }}
        >
          v0.1.0-alpha • Open Source Deterministic Execution Fabric
        </div>
        <h1
          style={{
            fontSize: "3.5rem",
            fontWeight: 800,
            letterSpacing: "-0.025em",
            margin: "0 0 1.5rem 0",
            lineHeight: 1.1,
          }}
        >
          The Sovereign Agent <br />
          <span style={{ color: "#38bdf8" }}>Operating System</span>
        </h1>
        <p
          style={{
            fontSize: "1.25rem",
            color: "#94a3b8",
            maxWidth: "760px",
            margin: "0 auto 2.5rem auto",
            lineHeight: 1.6,
          }}
        >
          AETHER bridges the agent prototype-to-production chasm. Durable event-sourced
          execution, tri-tier sovereign memory fabric, and zero-trust Wasm/MicroVM isolation.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
          <a
            href="http://localhost:3001"
            style={{
              padding: "0.875rem 1.75rem",
              borderRadius: "0.5rem",
              background: "#38bdf8",
              color: "#0f172a",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Explore Documentation
          </a>
          <a
            href="https://github.com/aether-ai/aether"
            style={{
              padding: "0.875rem 1.75rem",
              borderRadius: "0.5rem",
              background: "rgba(255, 255, 255, 0.05)",
              color: "#f8fafc",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            View on GitHub
          </a>
        </div>
      </header>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
          marginTop: "4rem",
        }}
      >
        <div
          style={{
            padding: "2rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8" }}>Control Plane Kernel</h3>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5 }}>
            High-throughput Rust asynchronous runtime with Raft consensus and deterministic
            state fold algebra: S_t = fold(S_0, [E_1..E_t]).
          </p>
        </div>
        <div
          style={{
            padding: "2rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8" }}>Tri-Tier Memory Fabric</h3>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5 }}>
            L1 sub-millisecond scratchpad in Redis, L2 episodic event stream in NATS JetStream,
            and L3 semantic vector graph in PostgreSQL pgvector.
          </p>
        </div>
        <div
          style={{
            padding: "2rem",
            borderRadius: "0.75rem",
            background: "rgba(255, 255, 255, 0.02)",
            border: "1px solid rgba(255, 255, 255, 0.06)",
          }}
        >
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8" }}>Zero-Trust Sandboxes</h3>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.95rem", lineHeight: 1.5 }}>
            Microsecond-latency deterministic Wasm compute via Wasmtime paired with Firecracker
            MicroVMs and eBPF network filtering.
          </p>
        </div>
      </section>
    </main>
  );
}
