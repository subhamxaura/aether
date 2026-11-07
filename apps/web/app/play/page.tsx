"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface EventStep {
  seq: number;
  type: string;
  agent: string;
  payload: string;
  tokens: { prompt: number; completion: number };
  durationMs: number;
  stateHash: string;
}

const SCENARIOS = [
  {
    id: "secops",
    name: "🛡️ SecOps Incident Responder Swarm",
    desc: "Threat scanner agent detects CVE vulnerability, launches Firecracker MicroVM, generates patch, and verifies via cryptographic Merkle audit.",
    agents: [
      "Ingress Guard",
      "Threat Classifier",
      "MicroVM Patch Bot",
      "Forensic Auditor",
    ],
    events: [
      {
        seq: 1,
        type: "AgentJobCreated",
        agent: "Ingress Guard",
        payload:
          "Ingested raw syslog stream; detected suspicious buffer payload in packet #48291.",
        tokens: { prompt: 420, completion: 85 },
        durationMs: 12,
        stateHash: "7a9f82d1b4c3e809",
      },
      {
        seq: 2,
        type: "ContextWindowHydrated",
        agent: "Threat Classifier",
        payload:
          "Queried L3 Semantic pgvector fabric: 98.4% cosine similarity to CVE-2026-3841 (Memory leak).",
        tokens: { prompt: 890, completion: 210 },
        durationMs: 18,
        stateHash: "8c1e93a4f5b2d710",
      },
      {
        seq: 3,
        type: "ToolExecutionStarted",
        agent: "MicroVM Patch Bot",
        payload:
          "Spawned Wasmtime sandbox jail with eBPF egress restriction; compiling surgical AST patch.",
        tokens: { prompt: 1450, completion: 490 },
        durationMs: 44,
        stateHash: "3f5b71c8a9e2d406",
      },
      {
        seq: 4,
        type: "PolicyCheckEvaluated",
        agent: "Forensic Auditor",
        payload:
          "Evaluated Cedar ABAC security policy: Patch non-breaking; all 24 unit tests pass cleanly.",
        tokens: { prompt: 620, completion: 140 },
        durationMs: 15,
        stateHash: "9eb056c0de8f30ef",
      },
      {
        seq: 5,
        type: "AgentJobCompleted",
        agent: "Orchestrator",
        payload:
          "Saga state folded (S_5 = fold(S_0, [E_1..E_5])). Audit logged to SHA-256 Merkle chain.",
        tokens: { prompt: 210, completion: 60 },
        durationMs: 4,
        stateHash: "65f348dfba5433c1",
      },
    ],
  },
  {
    id: "pr_review",
    name: "🔍 Multi-Agent Autonomous PR Reviewer",
    desc: "Syntax analyzer, security scanner, and benchmark runner evaluate code diff in parallel, folding into unified verdict.",
    agents: [
      "Diff Ingress",
      "Syntax Worker",
      "Security Checker",
      "Lead Synthesizer",
    ],
    events: [
      {
        seq: 1,
        type: "AgentJobCreated",
        agent: "Diff Ingress",
        payload:
          "Ingested pull request #104: 12 changed files, +340 / -85 lines in Rust workspace.",
        tokens: { prompt: 350, completion: 60 },
        durationMs: 9,
        stateHash: "1d4b6a8e0f2c4e6a",
      },
      {
        seq: 2,
        type: "InferenceCompleted",
        agent: "Syntax Worker",
        payload:
          "Kahn's topological DAG sort parsed 8 dependencies. Zero circular dependencies detected.",
        tokens: { prompt: 780, completion: 190 },
        durationMs: 22,
        stateHash: "5e7a9c1b3d5f7a9c",
      },
      {
        seq: 3,
        type: "ToolExecutionStarted",
        agent: "Security Checker",
        payload:
          "Ran cargo clippy under -D warnings inside isolated container. Zero warnings reported.",
        tokens: { prompt: 1100, completion: 320 },
        durationMs: 38,
        stateHash: "9b1d3f5a7c9e1b3d",
      },
      {
        seq: 4,
        type: "AgentJobCompleted",
        agent: "Lead Synthesizer",
        payload:
          "Review approved! Verdict: APPROVED FOR MERGE. Signed commit with ed25519 key.",
        tokens: { prompt: 450, completion: 110 },
        durationMs: 14,
        stateHash: "4c6e8a0b2d4f6a8e",
      },
    ],
  },
];

export default function PlayPage() {
  const [selectedScenarioIdx, setSelectedScenarioIdx] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<"terminal" | "memory" | "cluster">(
    "terminal",
  );
  const scenario = SCENARIOS[selectedScenarioIdx];

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-run simulation
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev < scenario.events.length) {
            return prev + 1;
          } else {
            setIsRunning(false);
            if (timerRef.current) clearInterval(timerRef.current);
            return prev;
          }
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, scenario.events.length]);

  const handleRun = () => {
    if (currentStep >= scenario.events.length) {
      setCurrentStep(0);
    }
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentStep(0);
  };

  const executedEvents = scenario.events.slice(0, currentStep);
  const currentEvent =
    currentStep > 0 ? scenario.events[currentStep - 1] : null;
  const totalPromptTokens = executedEvents.reduce(
    (acc, e) => acc + e.tokens.prompt,
    0,
  );
  const totalCompTokens = executedEvents.reduce(
    (acc, e) => acc + e.tokens.completion,
    0,
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#090d16",
        color: "#f8fafc",
      }}
    >
      {/* Top Operating System Header */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(12px)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link
            href="/"
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              color: "#38bdf8",
              textDecoration: "none",
            }}
          >
            ⚡ AETHER OS
          </Link>
          <span
            style={{
              padding: "0.2rem 0.6rem",
              borderRadius: "9999px",
              background: "rgba(34, 197, 94, 0.15)",
              color: "#4ade80",
              fontSize: "0.75rem",
              fontWeight: 700,
              border: "1px solid rgba(34, 197, 94, 0.3)",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "#4ade80",
              }}
            />
            OPERATING SERVER: ACTIVE (32.7M ops/sec)
          </span>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1.25rem",
            alignItems: "center",
            fontSize: "0.875rem",
          }}
        >
          <Link
            href="http://localhost:3001"
            style={{ color: "#94a3b8", textDecoration: "none" }}
          >
            📚 Documentation
          </Link>
          <a
            href="https://github.com/subhamxaura/aether"
            target="_blank"
            rel="noreferrer"
            style={{ color: "#94a3b8", textDecoration: "none" }}
          >
            GitHub (subhamxaura/aether)
          </a>
        </div>
      </header>

      {/* Main Operating Workspace */}
      <div
        style={{ display: "grid", gridTemplateColumns: "360px 1fr", flex: 1 }}
      >
        {/* Left Panel: Swarm Control & Scenarios */}
        <div
          style={{
            borderRight: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "1.75rem",
            background: "rgba(15, 23, 42, 0.4)",
          }}
        >
          <h2
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "#64748b",
              fontWeight: 700,
              letterSpacing: "0.08em",
              margin: "0 0 1rem 0",
            }}
          >
            Swarm Scenario Selector
          </h2>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              marginBottom: "2rem",
            }}
          >
            {SCENARIOS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedScenarioIdx(idx);
                  setCurrentStep(0);
                  setIsRunning(false);
                }}
                style={{
                  textAlign: "left",
                  padding: "1rem",
                  borderRadius: "0.5rem",
                  background:
                    selectedScenarioIdx === idx
                      ? "rgba(56, 189, 248, 0.12)"
                      : "rgba(255, 255, 255, 0.02)",
                  border:
                    selectedScenarioIdx === idx
                      ? "1px solid #38bdf8"
                      : "1px solid rgba(255, 255, 255, 0.06)",
                  cursor: "pointer",
                  color: "#f8fafc",
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: selectedScenarioIdx === idx ? "#38bdf8" : "#e2e8f0",
                  }}
                >
                  {s.name}
                </div>
                <div
                  style={{
                    fontSize: "0.8rem",
                    color: "#94a3b8",
                    marginTop: "0.35rem",
                    lineHeight: 1.4,
                  }}
                >
                  {s.desc}
                </div>
              </button>
            ))}
          </div>

          <h2
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "#64748b",
              fontWeight: 700,
              letterSpacing: "0.08em",
              margin: "0 0 1rem 0",
            }}
          >
            Swarm Execution Controls
          </h2>

          <div
            style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}
          >
            {!isRunning ? (
              <button
                onClick={handleRun}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  background: "#38bdf8",
                  color: "#0f172a",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.35rem",
                }}
              >
                ▶ Run Swarm
              </button>
            ) : (
              <button
                onClick={handlePause}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "0.5rem",
                  background: "#f59e0b",
                  color: "#0f172a",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ⏸ Pause
              </button>
            )}

            <button
              onClick={handleReset}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                color: "#e2e8f0",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              ↺ Reset
            </button>
          </div>

          {/* Time-Travel Replay Scrubber */}
          <div
            style={{
              padding: "1.25rem",
              borderRadius: "0.5rem",
              background: "rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.8rem",
                marginBottom: "0.5rem",
              }}
            >
              <span style={{ color: "#38bdf8", fontWeight: 700 }}>
                Time-Travel Replay
              </span>
              <span style={{ color: "#94a3b8" }}>
                Step {currentStep} / {scenario.events.length}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={scenario.events.length}
              value={currentStep}
              onChange={(e) => {
                setIsRunning(false);
                setCurrentStep(parseInt(e.target.value, 10));
              }}
              style={{
                width: "100%",
                accentColor: "#38bdf8",
                cursor: "pointer",
              }}
            />
            <div
              style={{
                fontSize: "0.75rem",
                color: "#64748b",
                marginTop: "0.5rem",
              }}
            >
              Drag to scrub backward/forward through deterministic event
              history.
            </div>
          </div>

          {/* Active Agents Topology */}
          <h2
            style={{
              fontSize: "0.8rem",
              textTransform: "uppercase",
              color: "#64748b",
              fontWeight: 700,
              letterSpacing: "0.08em",
              margin: "0 0 0.75rem 0",
            }}
          >
            Participating Agents
          </h2>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
          >
            {scenario.agents.map((agentName, aIdx) => {
              const isAgentActive = currentEvent?.agent === agentName;
              return (
                <div
                  key={aIdx}
                  style={{
                    padding: "0.6rem 0.75rem",
                    borderRadius: "0.375rem",
                    background: isAgentActive
                      ? "rgba(56, 189, 248, 0.15)"
                      : "rgba(255, 255, 255, 0.02)",
                    border: isAgentActive
                      ? "1px solid #38bdf8"
                      : "1px solid rgba(255, 255, 255, 0.05)",
                    fontSize: "0.85rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      color: isAgentActive ? "#38bdf8" : "#cbd5e1",
                      fontWeight: isAgentActive ? 700 : 500,
                    }}
                  >
                    {agentName}
                  </span>
                  <span
                    style={{
                      fontSize: "0.7rem",
                      color: isAgentActive ? "#4ade80" : "#64748b",
                    }}
                  >
                    {isAgentActive ? "● EXECUTING" : "IDLE"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Panel: Live Execution Dashboard & Terminal */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "1.75rem",
            overflowY: "auto",
          }}
        >
          {/* Top Telemetry Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "1rem",
              marginBottom: "1.5rem",
            }}
          >
            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Saga Status
              </div>
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color:
                    currentStep === scenario.events.length
                      ? "#4ade80"
                      : currentStep > 0
                        ? "#38bdf8"
                        : "#94a3b8",
                  marginTop: "0.25rem",
                }}
              >
                {currentStep === scenario.events.length
                  ? "Completed"
                  : currentStep > 0
                    ? "Running..."
                    : "Standby"}
              </div>
            </div>

            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Tokens Consumed
              </div>
              <div
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#f8fafc",
                  marginTop: "0.25rem",
                }}
              >
                {(totalPromptTokens + totalCompTokens).toLocaleString()}
              </div>
            </div>

            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Cryptographic Hash
              </div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  fontFamily: "monospace",
                  color: "#38bdf8",
                  marginTop: "0.35rem",
                }}
              >
                {currentEvent ? currentEvent.stateHash : "0000000000000000"}
              </div>
            </div>

            <div
              style={{
                padding: "1rem",
                borderRadius: "0.5rem",
                background: "rgba(255, 255, 255, 0.02)",
                border: "1px solid rgba(255, 255, 255, 0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  textTransform: "uppercase",
                }}
              >
                Replay Algebra
              </div>
              <div
                style={{
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  color: "#a855f7",
                  marginTop: "0.35rem",
                }}
              >
                S_{currentStep} = fold(S_0, [E_1..E_{currentStep}])
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
              paddingBottom: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <button
              onClick={() => setActiveTab("terminal")}
              style={{
                background:
                  activeTab === "terminal"
                    ? "rgba(56, 189, 248, 0.15)"
                    : "transparent",
                color: activeTab === "terminal" ? "#38bdf8" : "#94a3b8",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Live Event Stream
            </button>
            <button
              onClick={() => setActiveTab("memory")}
              style={{
                background:
                  activeTab === "memory"
                    ? "rgba(56, 189, 248, 0.15)"
                    : "transparent",
                color: activeTab === "memory" ? "#38bdf8" : "#94a3b8",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Tri-Tier Memory Fabric
            </button>
            <button
              onClick={() => setActiveTab("cluster")}
              style={{
                background:
                  activeTab === "cluster"
                    ? "rgba(56, 189, 248, 0.15)"
                    : "transparent",
                color: activeTab === "cluster" ? "#38bdf8" : "#94a3b8",
                border: "none",
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cluster & Kernel Health
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === "terminal" && (
            <div
              style={{
                flex: 1,
                borderRadius: "0.5rem",
                background: "#030712",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "1.25rem",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: "0.85rem",
                lineHeight: 1.6,
                overflowY: "auto",
                minHeight: "380px",
              }}
            >
              <div style={{ color: "#64748b", marginBottom: "1rem" }}>
                [AETHER KERNEL aetherd v0.1.0-alpha] Listening on
                127.0.0.1:50051 (gRPC / HTTP/2)...
              </div>

              {executedEvents.length === 0 ? (
                <div
                  style={{
                    color: "#475569",
                    fontStyle: "italic",
                    marginTop: "2rem",
                    textAlign: "center",
                  }}
                >
                  Swarm is in standby. Click &quot;▶ Run Swarm&quot; or drag the
                  time-travel slider to begin execution.
                </div>
              ) : (
                executedEvents.map((e, idx) => (
                  <div
                    key={idx}
                    style={{
                      marginBottom: "1rem",
                      borderLeft: "2px solid #38bdf8",
                      paddingLeft: "1rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "0.75rem",
                        color: "#38bdf8",
                        fontWeight: 700,
                      }}
                    >
                      <span>[seq={e.seq}]</span>
                      <span style={{ color: "#f59e0b" }}>{e.type}</span>
                      <span style={{ color: "#94a3b8" }}>@{e.agent}</span>
                      <span style={{ color: "#64748b", marginLeft: "auto" }}>
                        +{e.durationMs}ms
                      </span>
                    </div>
                    <div style={{ color: "#e2e8f0", marginTop: "0.25rem" }}>
                      {e.payload}
                    </div>
                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#64748b",
                        marginTop: "0.25rem",
                      }}
                    >
                      Tokens: {e.tokens.prompt} prompt, {e.tokens.completion}{" "}
                      completion • Hash: {e.stateHash}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "memory" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#38bdf8",
                    fontSize: "1rem",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  Tier 1: Ephemeral L1
                </h3>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  Redis in-memory sliding window context and prompt cache.
                </p>
                <div
                  style={{
                    background: "#030712",
                    padding: "0.75rem",
                    borderRadius: "0.375rem",
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                  }}
                >
                  SET current_task &quot;analyze&quot;
                  <br />
                  TTL 1800s
                  <br />
                  HIT RATE: 94.2%
                </div>
              </div>

              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#a855f7",
                    fontSize: "1rem",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  Tier 2: Episodic L2
                </h3>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  NATS JetStream append-only event stream & state WAL.
                </p>
                <div
                  style={{
                    background: "#030712",
                    padding: "0.75rem",
                    borderRadius: "0.375rem",
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                  }}
                >
                  STREAM &quot;aether-wal&quot;
                  <br />
                  SEQ {currentStep}
                  <br />
                  REPLICAS: 3/3 Raft
                </div>
              </div>

              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#34d399",
                    fontSize: "1rem",
                    margin: "0 0 0.5rem 0",
                  }}
                >
                  Tier 3: Semantic L3
                </h3>
                <p style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
                  PostgreSQL 16 + pgvector HNSW cosine knowledge graph.
                </p>
                <div
                  style={{
                    background: "#030712",
                    padding: "0.75rem",
                    borderRadius: "0.375rem",
                    fontSize: "0.8rem",
                    fontFamily: "monospace",
                  }}
                >
                  INDEX: hnsw_cosine
                  <br />
                  DIM: 1536
                  <br />
                  SIMILARITY: 0.984
                </div>
              </div>
            </div>
          )}

          {activeTab === "cluster" && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1.25rem",
              }}
            >
              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#38bdf8",
                    fontSize: "1rem",
                    margin: "0 0 0.75rem 0",
                  }}
                >
                  Rust 2024 Kernel (aetherd)
                </h3>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "1.25rem",
                    color: "#94a3b8",
                    fontSize: "0.875rem",
                    lineHeight: 1.8,
                  }}
                >
                  <li>
                    Raft Cluster Quorum:{" "}
                    <strong style={{ color: "#4ade80" }}>
                      Healthy (3/3 Nodes)
                    </strong>
                  </li>
                  <li>
                    Replay Fold Throughput:{" "}
                    <strong style={{ color: "#f8fafc" }}>
                      32,756,280 events/sec
                    </strong>
                  </li>
                  <li>
                    Average Event Latency:{" "}
                    <strong style={{ color: "#f8fafc" }}>
                      30.53 ns / event
                    </strong>
                  </li>
                  <li>
                    Crash Recovery Time:{" "}
                    <strong style={{ color: "#f8fafc" }}>
                      &lt; 15 ms rehydration
                    </strong>
                  </li>
                </ul>
              </div>

              <div
                style={{
                  padding: "1.25rem",
                  borderRadius: "0.5rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                }}
              >
                <h3
                  style={{
                    color: "#38bdf8",
                    fontSize: "1rem",
                    margin: "0 0 0.75rem 0",
                  }}
                >
                  Isolation & Security Sandboxes
                </h3>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: "1.25rem",
                    color: "#94a3b8",
                    fontSize: "0.875rem",
                    lineHeight: 1.8,
                  }}
                >
                  <li>
                    Wasm Engine:{" "}
                    <strong style={{ color: "#4ade80" }}>
                      Wasmtime 26.0 (Fuel Metered)
                    </strong>
                  </li>
                  <li>
                    MicroVM Engine:{" "}
                    <strong style={{ color: "#4ade80" }}>
                      Firecracker Jail Active
                    </strong>
                  </li>
                  <li>
                    Network Egress Policy:{" "}
                    <strong style={{ color: "#f59e0b" }}>
                      eBPF Policy Enforced
                    </strong>
                  </li>
                  <li>
                    Authorization:{" "}
                    <strong style={{ color: "#f8fafc" }}>
                      Cedar ABAC Policy Engine
                    </strong>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
