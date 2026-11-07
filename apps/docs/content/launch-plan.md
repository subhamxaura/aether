# AETHER Production Website Launch Plan & Infrastructure Topology

**Document Class:** Web Launch Architecture & Operational Readiness  
**Target Launch Date:** Q1 2027  
**Status:** APPROVED FOR EXECUTION

---

## 1. Launch Architecture Overview

A category-defining open-source platform requires a launch web architecture that communicates technical authority, delivers immediate developer gratification, and converts visitors into active users and contributors within seconds.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          LAUNCH ARCHITECTURE                           │
├────────────────────────────────┬───────────────────────────────────────┤
│ Marketing Landing (aether.io)  │ Interactive Sandbox (aether.io/play)  │
│ - Ultra-fast Next.js 15 SSR    │ - Client-side WebAssembly Engine      │
│ - Terminal ASCII Hero visual   │ - Zero-login swarm execution          │
│ - 1-Click Install Command      │ - Live trace & replay debugger        │
├────────────────────────────────┼───────────────────────────────────────┤
│ Documentation (docs.aether.io) │ Cloud Console (app.aether.io)         │
│ - Fumadocs / Nextra SSG        │ - Clerk / WorkOS OAuth + SAML         │
│ - 5-Minute Quickstart guide    │ - Workspace & API Key management      │
│ - Interactive API Playground   │ - Real-time execution dashboard       │
└────────────────────────────────┴───────────────────────────────────────┘
```

---

## 2. Web Properties & User Experiences

### 2.1 Marketing Landing Page (`aether.io`)

- **Technology Stack**: Next.js 15 (App Router), React 19, Tailwind CSS v4, shadcn/ui primitives, Framer Motion for high-framerate micro-interactions.
- **Hero Section**:
  - Direct value proposition: _"The Sovereign Operating System for Autonomous AI Swarms"_.
  - Subhead: _"Deterministic event-sourced execution, tri-tier memory fabrics, and zero-trust sandboxing. Build multi-agent workflows that never hallucinate state or lose execution traces."_
  - Interactive Terminal Snippet with instant copy button:
    ```bash
    curl -sSL https://install.aether.run | sh && aether init my-swarm
    ```
  - Dual Primary Action Buttons:
    - **`[ Try Interactive Playground -> ]`** (Routes directly to `/play`)
    - **`[ Star on GitHub ★ ]`** (Live counter fetching via GitHub GraphQL API)
- **Interactive Architecture Visualizer**:
  - Interactive component topology: Clicking on "Control Plane", "Memory Fabric", or "Worker Sandboxes" expands live code snippets and animated data packet flows.
- **12-Factor Competitive Matrix**: Interactive comparison matrix against Temporal, LangGraph, AutoGen, and CrewAI.

---

### 2.2 Interactive In-Browser Sandbox (`aether.io/play`)

- **Zero-Login Experience**: No account creation, API key, or credit card required.
- **WebAssembly Engine**: Compiles the `aether-engine` core into WebAssembly (`wasm32-unknown-unknown`) using `wasm-bindgen`, running execution state machines entirely client-side in the browser.
- **Pre-loaded Scenarios**:
  1. _Autonomous PR Review Swarm_: Code analyzer agent + Security auditor agent + Synthesizer agent.
  2. _SecOps Incident Responder_: Log analyzer agent + Threat classifier + Automated patch generator.
- **Split-Screen Interface**:
  - Left panel: Workflow DAG editor (YAML / JSON).
  - Right panel: Live animated execution graph with token streaming, latency metrics, and time-travel replay scrubber.

---

### 2.3 Documentation Portal (`docs.aether.io`)

- **Engine**: Powered by **Fumadocs** for full-text search (Pagefind), dark/light mode, and copyable polyglot tabs (Python, TypeScript, Rust, cURL).
- **Core Sections**:
  1. `Getting Started`: 5-Minute Quickstart, Core Concepts, Monorepo Setup.
  2. `SDK References`: TypeScript `@aether/sdk`, Python `aether-sdk`, Rust Crates.
  3. `Architecture & Deep Dives`: Deterministic Replay, Tri-Tier Memory Fabric, Wasm Sandboxing.
  4. `Self-Hosting`: Docker Compose, Kubernetes Helm, AWS/GCP Terraform modules.
  5. `Enterprise`: Air-gapped deployments, SAML/SSO configuration, Merkle audit log verification.

---

### 2.4 Cloud Console & Onboarding (`app.aether.io`)

- **Authentication**: Frictionless onboarding via Clerk / WorkOS (GitHub, Google, SAML SSO).
- **3-Step Onboarding Wizard**:
  1. Create Organization & Workspace.
  2. Issue Personal / Machine API Access Tokens.
  3. Run initial CLI connection: `aether login --token <token>`.

---

## 3. Global Hosting & Infrastructure Topology

| Subsystem         | Component                 | Hosting Provider            | Spec & Sizing                | High Availability & Edge                                  |
| :---------------- | :------------------------ | :-------------------------- | :--------------------------- | :-------------------------------------------------------- |
| **Frontend**      | Marketing (`aether.io`)   | Vercel / Cloudflare Pages   | Edge Serverless              | Global Anycast CDN, Brotli/zstd compression               |
| **Frontend**      | Docs (`docs.aether.io`)   | Cloudflare Pages            | Static Edge Delivery         | 100% cache hit ratio, sub-25ms global TTFB                |
| **Frontend**      | Console (`app.aether.io`) | Vercel Enterprise           | Next.js Node Runtime         | Multi-region edge bypass for authenticated traffic        |
| **API Gateway**   | REST / SSE / WS Gateway   | AWS EKS / Fly.io Edge       | Envoy / Traefik Proxy        | Multi-region, TLS 1.3 termination, rate limiting          |
| **Control Plane** | Core Kernel (`aetherd`)   | AWS EKS (Kubernetes)        | 3x Nodes (`c6i.2xlarge`)     | Multi-AZ, Karpenter autoscaling, Raft consensus           |
| **Persistence**   | PostgreSQL + pgvector     | AWS Aurora Serverless v2    | 2 - 16 ACUs                  | Multi-AZ auto-failover, continuous point-in-time recovery |
| **Event Fabric**  | NATS JetStream WAL        | AWS EKS StatefulSet         | 3x Replicas (NVMe EBS)       | Raft cluster replication factor 3                         |
| **Cache & Lock**  | Redis / Dragonfly         | Managed Redis / ElastiCache | Cluster Mode Enabled         | Sub-millisecond latency, multi-AZ replication             |
| **Artifacts**     | Snapshots & Blobs         | AWS S3 / Cloudflare R2      | S3 Standard / R2 Zero-Egress | Dual-region cross-bucket replication                      |

---

## 4. Environment Variables Configuration

The platform runtime requires environment configuration across 10 distinct functional tiers. A comprehensive reference template is maintained in the root `.env.example` file:

1. **Core Application Runtime**: `NODE_ENV`, `APP_ENV`, `PORT`, `GRPC_PORT`, `LOG_LEVEL`.
2. **CORS & Security**: `CORS_ALLOWED_ORIGINS`, `ENCRYPTION_SECRET_KEY`, `JWT_SIGNING_SECRET`.
3. **Database & Persistence**: `DATABASE_URL`, connection pool boundaries, timeouts.
4. **Cache & Event Fabric**: `REDIS_URL`, `NATS_URL`, JetStream cluster parameters.
5. **Vector & Memory Fabric**: `VECTOR_STORE_PROVIDER`, `QDRANT_URL`, embedding model configs.
6. **LLM Providers & Gateway**: API keys for OpenAI, Anthropic, Groq, and local vLLM endpoints.
7. **Authentication & Identity**: Clerk / WorkOS publishable & secret keys, SPIFFE socket path.
8. **Billing & Commerce**: Stripe publishable keys, webhook secrets, and plan price IDs.
9. **Telemetry & Monitoring**: PostHog analytics keys, Sentry DSNs, OpenTelemetry OTLP endpoint.
10. **Object Storage**: S3 / MinIO credentials, bucket names, and endpoints.

---

## 5. External Service Prerequisites

Before opening the platform to public launch traffic, the following third-party cloud dependencies must be provisioned and validated:

1. **Cloudflare Enterprise / Pro Zone**:
   - Apex domain (`aether.io`) and subdomains delegated.
   - SSL/TLS mode set to **Full (Strict)** with authenticated origin pull certificates.
   - Cloudflare WAF: OWASP Core Ruleset enabled; rate limiting active (`100 req/min per IP` on `/api/auth/*`).
2. **Authentication Provider (Clerk / WorkOS)**:
   - Production tenant initialized with verified email and OAuth apps (GitHub, Google).
   - Production webhook endpoints registered and tested.
3. **Telemetry & Error Tracking (PostHog & Sentry)**:
   - PostHog production project created with EU/US data residency compliance.
   - Sentry projects initialized for web, docs, console, and engine binaries with automated sourcemap releases.
4. **Payment Gateway (Stripe)**:
   - Live business account verified.
   - Pricing tiers (Free Developer, Team, Sovereign Enterprise) and webhook listeners active.
5. **Transactional Email (Resend)**:
   - Dedicated sending domain `mail.aether.io` verified with 100% SPF, DKIM, and DMARC pass scores.

---

## 6. Launch Day 25-Point Verification Checklist

The following strict verification protocol must be executed and approved prior to announcing the release:

```
[ ] DOMAIN & NETWORK
  1. [ ] DNS propagation verified across 25+ global edge nodes (dnschecker.org).
  2. [ ] Cloudflare SSL Certificate status is "Active"; SSL Labs rating is "A+".
  3. [ ] HTTP to HTTPS 301 redirection verified on apex and all subdomains.
  4. [ ] Apex domain (aether.io) canonicalizes seamlessly with www.aether.io.
  5. [ ] Subdomains (docs, app, api, registry) route to intended origin clusters.

[ ] PERFORMANCE & LIGHTHOUSE
  6. [ ] Google Lighthouse Performance score >= 95 on Desktop, >= 90 on Mobile.
  7. [ ] Cumulative Layout Shift (CLS) <= 0.05, Largest Contentful Paint (LCP) <= 1.8s.
  8. [ ] Edge assets (JS/CSS/Fonts) served with Cache-Control: public, max-age=31536000, immutable.
  9. [ ] First Load JS bundle size strictly < 120 KB gzip on marketing landing.
 10. [ ] Time To First Byte (TTFB) <= 100ms globally via edge CDN caching.

[ ] SEO, SOCIAL GRAPH & ACCESSIBILITY
 11. [ ] Dynamic OpenGraph images (og:image) render cleanly on Twitter Card Validator & OpenGraph.xyz.
 12. [ ] Canonical tags, structured JSON-LD (SoftwareApplication), and meta tags present.
 13. [ ] robots.txt configured: landing and docs public; disallows /app/private/*.
 14. [ ] sitemap.xml dynamically generated and verified with 0 broken links (HTTP 200).
 15. [ ] WCAG 2.1 AA accessibility validated (color contrast, keyboard navigation, aria-labels).

[ ] SECURITY & HEADERS
 16. [ ] Strict Content Security Policy (CSP), X-Content-Type-Options: nosniff, X-Frame-Options: DENY.
 17. [ ] HSTS enabled with includeSubDomains; preload; max-age=31536000.
 18. [ ] CORS policies reject untrusted external origins on all mutating API routes.
 19. [ ] Distributed rate limiter actively sheds traffic exceeding 100 req/sec on unauthenticated routes.

[ ] TELEMETRY, AUTH & MONETIZATION
 20. [ ] Sentry captures test client and server exceptions with un-minified sourcemap traces.
 21. [ ] PostHog records live session pageviews, install copy clicks, and sandbox execution events.
 22. [ ] Health checks (/healthz, /readyz) return 200 OK across all backend Kubernetes pods.
 23. [ ] Full user onboarding flow tested: Sign-up -> Verification -> Workspace -> API Key issued.
 24. [ ] Stripe live transaction verified with real payment authorization & refund cycle.
 25. [ ] Webhook signature verification verified with simulated Stripe and Clerk test payloads.
```
