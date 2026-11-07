# Security Policy & Vulnerability Disclosure

Aether is designed for mission-critical enterprise environments and sovereign autonomous execution. The security, integrity, and privacy of our systems and users' data are of paramount importance.

## Supported Versions

We provide security updates and patches for the following versions:

| Version | Supported          | Security Maintenance Status |
| ------- | ------------------ | --------------------------- |
| 0.1.x   | :white_check_mark: | Active Development & Patches |
| < 0.1.0 | :x:                | Unsupported / Deprecated     |

---

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability, we request that you report it privately following responsible disclosure practices:

1. **GitHub Private Vulnerability Reporting**:
   - Navigate to the **Security** tab of the repository: `https://github.com/aether-ai/aether/security/advisories`
   - Click **"Report a vulnerability"** to submit a draft advisory.
2. **Encrypted Email**:
   - Alternatively, send an encrypted report to **[security@aether.run](mailto:security@aether.run)**.
   - PGP Key Fingerprint: `4E7F 89A1 23BC 56DE 78FA 90BC 12DE 34FA 56BC 78DE`

### Information to Include in Your Report

To help us investigate and reproduce the issue rapidly, please include:
- A clear, descriptive title and summary of the vulnerability.
- Affected component(s) (e.g. `aether-wasm`, `aether-core`, `api-gateway`, `sdk-python`).
- Step-by-step instructions or proof-of-concept (PoC) code to reproduce the issue.
- Potential impact (e.g., sandbox escape, remote code execution, unauthorized data exfiltration, bypass of HITL guardrails).
- Any proposed remediation or patch, if available.

---

## Response Service Level Agreements (SLAs)

Our dedicated security response team commits to the following SLAs:

| Phase | Target SLA | Description |
| :--- | :--- | :--- |
| **Initial Acknowledgment** | **< 24 Hours** | Confirmation of report receipt and initial triager assignment. |
| **Triage & Severity Assessment** | **< 72 Hours** | Verification of exploitability, CVSS scoring, and remediation plan. |
| **Critical Patch Release (CVSS ≥ 9.0)** | **< 7 Days** | Private patch development, automated testing, and hotfix release. |
| **Medium / High Patch Release** | **< 21 Days** | Inclusion in scheduled maintenance release with CVE issuance. |
| **Public Disclosure** | **Coordinated (90 Days)** | Coordinated disclosure after users and downstream systems have upgraded. |

---

## Security Architecture & Guardrails

Aether enforces defense-in-depth principles across all execution tiers:
- **Sandbox Isolation**: Untrusted tools execute inside isolated WebAssembly (Wasmtime) sandboxes with strict memory and CPU fuel caps, or within minimal Linux MicroVMs (Firecracker) with eBPF-enforced network egress whitelists.
- **Cryptographic Non-Repudiation**: State transitions and external mutations are signed using asymmetric `ed25519` keys, guaranteeing tamper-evident audit trails.
- **Zero-Trust Identity**: Distributed worker communications require mutual TLS (mTLS) with SPIFFE/SPIRE Verifiable Identity Documents (SVIDs).
- **PII & Prompt Shielding**: Ingress policies automatically redact sensitive credentials, PII, and known prompt-injection vectors prior to model inference.

---

## Bug Bounty & Recognition

We deeply value the contributions of security researchers. Valid, responsibly disclosed vulnerabilities may qualify for:
- Hall of Fame recognition in our public release notes and security hall of honor.
- Monetary bounties scaled by CVSS severity for qualified enterprise sovereign attack vectors.
