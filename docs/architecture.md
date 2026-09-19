# Eventum architecture

Eventum separates provider access, application run state, wallet writes, and
protocol authority.

```text
Polymarket
  → Gamma provider adapter
  → normalized evidence + submitted source hash
  → Comparison Run (durable application record)
  → browser wallet on Studionet
  → register_market_snapshot
  → compare_markets
  → GenLayer leader / validator consensus
  → persisted Comparison
  → direct Market Equivalence Graph edge
```

## Responsibilities

### Provider adapter

The server resolves allowlisted Polymarket URLs through the Gamma API,
canonicalizes the child market, bounds the payload, and creates normalized
evidence. Raw provider payloads are not protocol state.

### Application

The Next.js server owns route handlers, read-only projections, and the durable
Comparison Run record. The small atomic JSON store preserves prepared evidence,
transaction hashes, lifecycle events, and recovery state across refreshes and
PM2 restarts. It is an application audit trail, not a substitute for chain
state.

New runs receive a cryptographically random HttpOnly, Secure production session
cookie. Only its SHA-256 binding is stored with the run. PATCH requests require
that same session; historical runs without a binding remain public and
read-only. Public PATCH accepts transaction-hash claims only. The server checks
the chain, current contract, transaction stage, and contract read-back before
populating consensus, persistence, relation, safety, or comparison fields.

### Browser wallet

The wallet signs the two snapshot writes and the comparison write. The runtime
contract, network, chain, and public RPC values come from `.env` through the
server runtime config. The browser never receives deployment secrets.

### Intelligent Contract

`contracts/eventum.py` validates bounded snapshot evidence, derives immutable
IDs, evaluates quoted evidence with GenLayer, validates structured decision
fields, persists accepted comparisons, and exposes public reads. It is the
authority for finalized snapshot and comparison state.

The v1.1.1 contract derives `canonical_event_hint` from corroborated source
evidence and records `source_evidence_hash`; the application always replaces
offchain previews with contract read-back after registration.

### Graph

The graph is a direct projection of persisted contract comparisons. A rejected
run has no graph edge, and Eventum does not infer transitive relationships.

## Runtime binding

`/root/eventum/.env` → `scripts/run-next.cjs` → `getConfig()` → server clients →
`/api/runtime-config` → browser. Contract rotation requires a verified
deployment, an `.env` update, and an application restart; it does not create a
second build-time contract authority.
