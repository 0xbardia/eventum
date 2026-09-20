# Eventum

![Eventum semantic-edge mark](app/icon.svg)

**Semantic interoperability for prediction markets.**

Eventum turns independently authored market rules into structured evidence and
uses GenLayer consensus to determine whether those markets are equivalent,
directionally related, overlapping, conflicting, unrelated, or ambiguous.

[Live demo](https://eventum.bydx.fun) · [Status](https://eventum.bydx.fun/status) · [GenLayer Studio](https://studio.genlayer.com/contracts)

![Eventum landing page](docs/assets/landing.png)

## Why it exists

Two prediction markets can ask nearly the same question and still settle under
different thresholds, dates, authorities, exceptions, or outcome spaces.
Wording similarity is not settlement equivalence. Eventum makes those rules
inspectable and keeps the final relationship reusable onchain.

## How it works

```text
Polymarket URL
  → Gamma evidence resolution
  → normalized market preview
  → durable Comparison Run
  → wallet-authorized snapshot writes
  → GenLayer leader + validator adjudication
  → accepted onchain comparison
  → direct Market Equivalence Graph edge
```

The backend is a provider and transaction-preparation boundary. The
Intelligent Contract validates bounded evidence, performs the semantic
adjudication, records accepted results, and remains the protocol authority.

## Current deployment

| Field | Value |
|---|---|
| Network | Studionet |
| Chain | `61999` |
| Protocol | `eventum/1.1.1` |
| Contract | `0x96F23489C251135965b13303A991b2B9579bdF19` |
| Source SHA-256 | `4c198184c7a48485cba207c5f6037cd701e27c69c4ab76192a5bfd76803434d5` |

Deployment lineage, source provenance, and historical superseded addresses are
kept in [`deployments/studionet.json`](deployments/studionet.json). Historical
addresses are not active runtime targets.

Snapshot registration is source-bound: GenLayer corroborates the submitted
Polymarket evidence, derives the canonical event identity, and stores its own
`source_evidence_hash`. The browser's submitted `source_hash` and canonical
hint are claims, not final provenance. The server binds each Comparison Run to
an HttpOnly application session, verifies transaction claims against the
current contract, and polls the same hash with bounded backoff. A rejected run
remains auditable but cannot become a fabricated onchain comparison.

Protocol registration is permissionless, source-bound, and idempotent for the
same snapshot. The application adds same-origin checks, bounded bodies,
allowlisted providers, per-IP/session throttling, and read-before-write
deduplication so repeated preparation does not create avoidable wallet writes.

Accepted comparisons are immutable direct graph edges in v1.1.1. There is no
in-place dispute or correction write; a disputed edge can be flagged offchain,
while protocol-level remediation requires a reviewed future version and
migration. Historical onchain state remains auditable.

## Protocol model

The contract distinguishes `EQUIVALENT`, `CONDITIONAL_EQUIVALENT`, `SUBSET`,
`SUPERSET`, `OVERLAPPING`, `CONFLICTING`, specialized mismatches,
`UNRELATED`, and `AMBIGUOUS`. `safe_to_aggregate` is conservative: an accepted
comparison still needs a complete one-to-one outcome mapping before aggregation
is authorized. Graph edges are direct only; Eventum does not invent transitive
relationships.

A Comparison Run is the durable application record of every attempt. An
onchain Comparison exists only after consensus accepts the result and the
contract persists it. `MAJORITY_DISAGREE`, execution failure, and verification
pending remain visibly distinct states.

Read the detailed model in [`docs/semantic-model.md`](docs/semantic-model.md),
the consensus lifecycle in [`docs/consensus.md`](docs/consensus.md), and the
system boundary in [`docs/architecture.md`](docs/architecture.md).

## Routes

- `/` — product explanation and live protocol proof
- `/compare` — resolve real Polymarket markets and prepare a run
- `/comparisons` — durable run history, including rejected consensus
- `/comparisons/runs/<run-id>` — one run's lifecycle and recovery surface
- `/comparisons/<comparison-id>` — accepted onchain comparison report
- `/markets` and `/markets/<snapshot-id>` — snapshot records and provenance
- `/graph` — direct consensus-backed relationship edges
- `/docs` — in-app field guide
- `/status` — runtime and contract health

## Requirements

- Node.js `20.20+`
- pnpm `9.15+`
- Python `3.14+` for contract tooling
- Chromium for browser QA

## Setup

```bash
pnpm install --frozen-lockfile
python3 -m venv .venv
.venv/bin/pip install -r contracts/requirements-dev.txt
cp .env.example .env
chmod 600 .env
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm start
```

`.env` is the server-side runtime source of truth. The browser receives only
the safe public subset from `/api/runtime-config`; there is no
`NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS`. A funded wallet on the configured
network is required for writes. Never put a private key, API token, or wallet
seed in source control.

## Commands

```bash
pnpm dev
pnpm build && pnpm start
pnpm typecheck
pnpm lint
pnpm test
pnpm contract:lint
pnpm contract:test
pnpm audit
pnpm qa:local
```

Contract changes are release changes. Read [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
and the contract-change warning in [`CONTRIBUTING.md`](CONTRIBUTING.md) before
touching `contracts/eventum.py`.

## Security and limitations

Only the Polymarket Gamma adapter is verified. Provider evidence is bounded,
allowlisted, and treated as untrusted input. SSRF controls, request limits,
XSS-safe rendering, wallet chain checks, and fail-closed contract reads are
covered by the test suite and threat model. Eventum is not a trading venue,
does not publish odds or advice, and does not claim a third-party audit.

See [`SECURITY.md`](SECURITY.md), [`docs/CONTRACT_SECURITY.md`](docs/CONTRACT_SECURITY.md),
and [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md).

## Contributing

Start with [`CONTRIBUTING.md`](CONTRIBUTING.md). Frontend changes must preserve
protocol truth, durable run recovery, accessible fallbacks, and production
Playwright coverage.

## License

Eventum is licensed under the Apache License 2.0. See [LICENSE](LICENSE).
