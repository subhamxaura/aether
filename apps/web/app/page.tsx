import React from "react";
import Link from "next/link";

export default function HomePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0f172a",
        color: "#f8fafc",
      }}
    >
      {/* Top Navigation Bar */}
      <nav
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(12px)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            color: "#38bdf8",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          ⚡ AETHER
        </Link>

        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            alignItems: "center",
            fontSize: "0.9rem",
          }}
        >
          <Link
            href="/play"
            style={{
              padding: "0.5rem 1rem",
              borderRadius: "0.375rem",
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38bdf8",
              fontWeight: 700,
              textDecoration: "none",
              border: "1px solid rgba(56, 189, 248, 0.3)",
            }}
          >
            ⚡ Operating Console
          </Link>
          <a
            href="http://localhost:3001"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Explore Documentation
          </a>
          <a
            href="https://github.com/subhamxaura/aether"
            target="_blank"
            rel="noreferrer"
            style={{
              color: "#94a3b8",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            View on GitHub
          </a>
        </div>
      </nav>

      {/* Hero Section */}
      <main
        style={{ padding: "4rem 2rem", maxWidth: "1200px", margin: "0 auto" }}
      >
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
            AETHER bridges the agent prototype-to-production chasm. Durable
            event-sourced execution, tri-tier sovereign memory fabric, and
            zero-trust Wasm/MicroVM isolation.
          </p>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/play"
              style={{
                padding: "0.875rem 2rem",
                borderRadius: "0.5rem",
                background: "#38bdf8",
                color: "#0f172a",
                fontWeight: 800,
                fontSize: "1.05rem",
                textDecoration: "none",
                boxShadow: "0 0 25px rgba(56, 189, 248, 0.4)",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              ⚡ Launch Operating Console →
            </Link>
            <a
              href="http://localhost:3001"
              style={{
                padding: "0.875rem 1.75rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.08)",
                color: "#f8fafc",
                border: "1px solid rgba(255, 255, 255, 0.15)",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Explore Documentation
            </a>
            <a
              href="https://github.com/subhamxaura/aether"
              target="_blank"
              rel="noreferrer"
              style={{
                padding: "0.875rem 1.75rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.03)",
                color: "#94a3b8",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              View on GitHub
            </a>
          </div>
        </header>

        {/* Feature Pillars */}
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
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8" }}>
              Control Plane Kernel
            </h3>
            <p
              style={{
                margin: "0 0 1rem 0",
                color: "#94a3b8",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              High-throughput Rust asynchronous runtime with Raft consensus and
              deterministic state fold algebra: S_t = fold(S_0, [E_1..E_t]).
            </p>
            <Link
              href="/play"
              style={{
                color: "#38bdf8",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Inspect Kernel in Console →
            </Link>
          </div>

          <div
            style={{
              padding: "2rem",
              borderRadius: "0.75rem",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8" }}>
              Tri-Tier Memory Fabric
            </h3>
            <p
              style={{
                margin: "0 0 1rem 0",
                color: "#94a3b8",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              L1 sub-millisecond scratchpad in Redis, L2 episodic event stream
              in NATS JetStream, and L3 semantic vector graph in PostgreSQL
              pgvector.
            </p>
            <Link
              href="/play"
              style={{
                color: "#38bdf8",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Inspect Memory in Console →
            </Link>
          </div>

          <div
            style={{
              padding: "2rem",
              borderRadius: "0.75rem",
              background: "rgba(255, 255, 255, 0.02)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
            }}
          >
            <h3 style={{ margin: "0 0 0.5rem 0", color: "#38bdf8" }}>
              Zero-Trust Sandboxes
            </h3>
            <p
              style={{
                margin: "0 0 1rem 0",
                color: "#94a3b8",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              Microsecond-latency deterministic Wasm compute via Wasmtime paired
              with Firecracker MicroVMs and eBPF network filtering.
            </p>
            <Link
              href="/play"
              style={{
                color: "#38bdf8",
                fontSize: "0.85rem",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Run Sandbox in Console →
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
