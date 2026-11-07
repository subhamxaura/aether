import React from "react";
import fs from "fs";
import path from "path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MarkdownRenderer } from "../../components/MarkdownRenderer";

const DOCS_CATALOG = [
  {
    slug: "architecture",
    title: "System Architecture & 4-Plane Topology",
    description: "Rust kernel, Wasm sandboxes, and sovereign memory fabric",
    file: "architecture.md",
  },
  {
    slug: "api-specification",
    title: "API Specification & gRPC Contracts",
    description: "OpenAPI 3.1 REST contracts and runtimev1.proto definitions",
    file: "api-specification.md",
  },
  {
    slug: "data-models",
    title: "PostgreSQL 16 Schema & Vector DDL",
    description: "pgvector HNSW, RLS, and cryptographic Merkle triggers",
    file: "data-models.md",
  },
  {
    slug: "launch-plan",
    title: "Production Launch Plan & Topology",
    description: "Cloud hosting topology, environment configs, and 25-point launch checklist",
    file: "launch-plan.md",
  },
  {
    slug: "roadmap",
    title: "Phased Execution Roadmap (M1–M4)",
    description: "MVP foundation, collaborative ecosystem, and enterprise scale milestones",
    file: "roadmap.md",
  },
  {
    slug: "audit-report",
    title: "Final Hardening & Benchmark Audit Report",
    description: "Full test logs, 1M fold replay benchmarks, and forensic verification",
    file: "audit-report.md",
  },
];

export async function generateStaticParams() {
  return DOCS_CATALOG.map((doc) => ({
    slug: doc.slug,
  }));
}

function getDocContent(slug: string): { title: string; content: string } | null {
  const docMeta = DOCS_CATALOG.find((d) => d.slug === slug);
  if (!docMeta) return null;

  const candidatePaths = [
    path.join(process.cwd(), "content", docMeta.file),
    path.join(process.cwd(), "apps", "docs", "content", docMeta.file),
    path.join(process.cwd(), "..", "..", "docs", docMeta.file.toUpperCase()),
    path.join(process.cwd(), "docs", docMeta.file.toUpperCase()),
  ];

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      const content = fs.readFileSync(candidate, "utf-8");
      return { title: docMeta.title, content };
    }
  }

  return null;
}

export default async function DocPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const params = await props.params;
  const doc = getDocContent(params.slug);

  if (!doc) {
    notFound();
  }

  const currentIdx = DOCS_CATALOG.findIndex((d) => d.slug === params.slug);
  const prevDoc = currentIdx > 0 ? DOCS_CATALOG[currentIdx - 1] : null;
  const nextDoc = currentIdx < DOCS_CATALOG.length - 1 ? DOCS_CATALOG[currentIdx + 1] : null;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar Navigation */}
      <aside
        style={{
          width: "280px",
          borderRight: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(15, 23, 42, 0.6)",
          padding: "2rem 1.25rem",
          position: "sticky",
          top: 0,
          height: "100vh",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <Link
          href="/"
          style={{
            display: "inline-block",
            color: "#38bdf8",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: "1.15rem",
            marginBottom: "1.5rem",
            letterSpacing: "-0.01em",
          }}
        >
          ← AETHER Docs
        </Link>

        <div style={{ fontSize: "0.75rem", textTransform: "uppercase", color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", marginBottom: "0.75rem" }}>
          Documentation Library
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
          {DOCS_CATALOG.map((item) => {
            const isActive = item.slug === params.slug;
            return (
              <Link
                key={item.slug}
                href={`/docs/${item.slug}`}
                style={{
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.375rem",
                  fontSize: "0.875rem",
                  color: isActive ? "#38bdf8" : "#94a3b8",
                  background: isActive ? "rgba(56, 189, 248, 0.1)" : "transparent",
                  fontWeight: isActive ? 600 : 400,
                  textDecoration: "none",
                  borderLeft: isActive ? "2px solid #38bdf8" : "2px solid transparent",
                }}
              >
                {item.title}
              </Link>
            );
          })}
        </nav>

        <div style={{ marginTop: "2.5rem", paddingTop: "1.5rem", borderTop: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <a
            href="http://localhost:3000"
            style={{
              fontSize: "0.85rem",
              color: "#64748b",
              textDecoration: "none",
              display: "block",
              marginBottom: "0.5rem",
            }}
          >
            ↗ Main Website (:3000)
          </a>
          <a
            href="https://github.com/subhamxaura/aether"
            target="_blank"
            rel="noreferrer"
            style={{
              fontSize: "0.85rem",
              color: "#64748b",
              textDecoration: "none",
              display: "block",
            }}
          >
            ↗ GitHub Repository
          </a>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "2.5rem 3.5rem", maxWidth: "900px" }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: "1.5rem" }}>
          <Link href="/" style={{ color: "#64748b", textDecoration: "none" }}>
            Docs
          </Link>
          <span style={{ margin: "0 0.5rem" }}>/</span>
          <span style={{ color: "#94a3b8" }}>{doc.title}</span>
        </div>

        {/* Markdown Content */}
        <MarkdownRenderer content={doc.content} />

        {/* Previous / Next Navigation */}
        <div
          style={{
            marginTop: "4rem",
            paddingTop: "2rem",
            borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            display: "flex",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          {prevDoc ? (
            <Link
              href={`/docs/${prevDoc.slug}`}
              style={{
                padding: "0.85rem 1.25rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                textDecoration: "none",
                fontSize: "0.875rem",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              ← Previous: <strong style={{ color: "#38bdf8" }}>{prevDoc.title}</strong>
            </Link>
          ) : (
            <div />
          )}

          {nextDoc ? (
            <Link
              href={`/docs/${nextDoc.slug}`}
              style={{
                padding: "0.85rem 1.25rem",
                borderRadius: "0.5rem",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                textDecoration: "none",
                fontSize: "0.875rem",
                background: "rgba(255, 255, 255, 0.02)",
              }}
            >
              Next: <strong style={{ color: "#38bdf8" }}>{nextDoc.title}</strong> →
            </Link>
          ) : (
            <div />
          )}
        </div>
      </main>
    </div>
  );
}
