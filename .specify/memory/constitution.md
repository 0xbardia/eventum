<!--
Sync Impact Report
- Version change: template → 1.0.0
- Modified principles: replaced all five scaffold placeholders with ten Eventum
  protocol, security, and release principles.
- Added sections: Security and quality constraints; development and release workflow.
- Removed sections: none; the scaffold was unfilled.
- Deferred items: none.
-->

# Eventum Constitution

## Core Principles

### I. Contract First
The GenLayer Intelligent Contract is the product's authoritative semantic
adjudication layer. Frontend, backend, cache, and graph projections MUST consume
contract results and MUST NOT replace them with a centralized boolean or model
score. Any feature that cannot be expressed as useful contract state or a
contract-backed read path is out of scope until that value is demonstrated.

### II. GenLayer Necessity
The design MUST explain why heterogeneous natural-language rules, external
evidence, and validator agreement require GenLayer consensus. A centralized LLM
call MAY assist discovery or preview, but it MUST NOT be presented as protocol
truth. The consensus path MUST perform meaningful semantic adjudication.

### III. Semantic Safety Over Similarity
Eventum classifies settlement compatibility, not textual or embedding
similarity. A result MUST distinguish fully equivalent, conditionally
equivalent, one-way implication, partial overlap, conflicting, unrelated, and
ambiguous cases. Heuristic confidence MUST never authorize aggregation.

### IV. Immutable Evidence and Versioned State
Every comparison MUST reference immutable market snapshot identifiers and source
hashes. A market update MUST create a new snapshot. Historical comparisons MUST
remain queryable and unchanged after later registrations or comparisons.

### V. Explicit and Explainable Relationships
Each accepted comparison MUST include a constrained relation, safe-to-compare
and safe-to-aggregate decisions, direction-aware outcome mapping, bounded reason
codes, material differences, concise rationale, evidence hashes, and comparison
version. Reverse-order reads MUST return logically inverted relations and
mappings.

### VI. Fail Safe and No Silent Transitivity
Invalid input, unsupported evidence, malformed model output, validator
disagreement, or ambiguous semantics MUST resolve to a safe failure or
AMBIGUOUS outcome and MUST never become EQUIVALENT by default. Direct
consensus-backed edges MUST NOT be merged with unsafe transitive closure; A=B
and B=C does not authorize A=C without explicit all-pairs proof.

### VII. Prompt-Injection and Trust-Boundary Defense
Market text, source pages, provider responses, and model output are untrusted
data. Prompts MUST separate system instructions from quoted evidence, require a
strict bounded schema, validate every field, and reject unknown outcomes,
relations, URLs, lengths, and malformed JSON. No model output may bypass
deterministic validation or become authoritative merely because it is fluent.

### VIII. Test-First Protocol Engineering
Contract invariants, adversarial evidence, consensus disagreement, provider
failures, backend security boundaries, and user-critical flows MUST have
runnable tests. Direct Mode tests MUST precede deployment; Studio/integration
tests MUST exercise the exact source and meaningful reads/writes before release.
Every non-trivial change MUST leave at least one focused regression check.

### IX. Real Product and Honest Evidence
Production paths MUST use real contract state and verified provider data, with
demo or mock data explicitly labeled and isolated from production. Documentation,
status pages, metrics, deployment addresses, and supported-provider claims MUST
be backed by reproducible command, browser, or network evidence. The project
MUST never fabricate users, liquidity, coverage, transaction hashes, or audits.

### X. Minimal, Accessible, Operable Delivery
The architecture MUST use the smallest safe number of services and dependencies,
reuse existing platform capabilities, and avoid speculative abstractions. User
interfaces MUST remain keyboard accessible, readable at required viewports,
contrast compliant, color-independent in status communication, and safe under
reduced motion. Production deployments MUST be isolated to Eventum's process,
localhost port, proxy host, and documented configuration.

## Security and Quality Constraints

- Provider resolution MUST enforce http/https, allowlists where available,
  DNS/address validation, redirect limits, timeouts, response-size limits, and
  content-type checks. Loopback, link-local, RFC1918, metadata, and other
  private addresses MUST be rejected.
- Request bodies, market fields, outcome lists, reason codes, and model outputs
  MUST have explicit size and cardinality limits. Secrets MUST remain server-side
  and MUST NOT enter `NEXT_PUBLIC_*` variables or responses.
- Onchain state is authoritative for protocol judgments. Offchain persistence
  MAY cache raw evidence and projections, but it MUST not override newer
  finalized state or conceal stale data.
- Deployment and release records MUST contain source hash, network, chain ID,
  RPC, address, transaction identifier when available, timestamp, and the exact
  verification command or browser evidence.

## Development and Release Workflow

Work follows: inspect → specify → plan → implement → test → adversarial review →
real integration verification → browser QA → production verification. A failed
gate remains a failure until fixed or reported as an external blocker. Code,
docs, tests, and compatibility records MUST be updated together when behavior
or version-sensitive APIs change.

The release gate requires passing formatting, lint, typecheck, unit/contract,
security, build, provider, integration, accessibility, responsive browser, and
production health checks that apply to the changed surface. Expensive checks
already passed MAY be skipped only when a later change cannot reasonably regress
them. No release claim may be made from HTTP 200, build success, a submitted
transaction, or an online process alone.

## Governance

This constitution is authoritative for Eventum and supersedes convenience,
scaffold defaults, and undocumented assumptions. Amendments require a dated
sync-impact report, a semantic-version decision, updates to affected specs and
tests, and a re-run of the applicable release gates. A major version removes or
redefines a principle; a minor version adds or materially expands a principle;
a patch version clarifies wording without changing obligations.

Reviews MUST check every MUST statement and record evidence or an explicit
external blocker. Deliberate simplifications with a known ceiling MUST be
marked near the code with a `ponytail:` comment naming the ceiling and upgrade
path. Security review language MUST say "internal security review" unless an
independent third party actually performed an audit.

**Version**: 1.0.0 | **Ratified**: 2026-09-08 | **Last Amended**: 2026-09-08
