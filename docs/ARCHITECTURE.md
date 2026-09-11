# Eventum architecture

## Boundary map

```text
Browser
  │ URL / wallet intent
  ▼
Next.js route handlers ── allowlisted DNS + HTTP provider adapter ── Polymarket Gamma
  │ normalized preview
  ▼
Atomic JSON cache (offchain, non-authoritative)
  │ register/compare transaction through EIP-1193
  ▼
GenLayer Intelligent Contract (authoritative protocol state)
  │ finalized reads
  ├─ snapshots
  ├─ comparisons
  └─ direct relationship graph
```

There is one application process. A PostgreSQL service and a separate API
service were deliberately not added: the release has one process, a low-volume
preview cache, and an onchain authority. `src/lib/db.ts` uses an atomic JSON
file with mode `0600`, directory mode `0700`, and a process-local cache. It is
an operational cache, not a second protocol implementation.

## Authority and trust

The provider is untrusted evidence. The browser is untrusted input. The
backend can normalize and prepare arguments but cannot assert a relationship.
The contract validates snapshot fields, constructs the adjudication prompt,
runs GenLayer nondeterministic execution, validates leader and independent
validator stable fields, and only then persists the relationship.

Raw provider payloads never enter authoritative contract state. Onchain fields
include bounded semantic fields, exact outcome labels, source hashes, snapshot
IDs, comparison IDs, and provenance references.

## Request paths

1. `POST /api/markets/resolve` resolves one real Polymarket URL and returns an
   explicitly offchain preview.
2. `POST /api/comparisons/prepare` resolves two URLs and returns two previews
   plus the exact register argument arrays. It does not write onchain state.
3. The browser submits `register_market_snapshot` and `compare_markets` through
   the configured EIP-1193 wallet.
4. The client waits for `FINALIZED` and a successful execution result, then
   reads `get_latest_comparison` from the same deployed contract.
5. Server pages and API read routes use account-free GenLayerJS reads with
   `LATEST_FINAL`.

## Graph model

The graph is a projection of stored comparison records. Every displayed edge is
direct and consensus-backed. Eventum does not use union-find or transitive
closure: `A ≡ B` plus `B ≡ C` never creates an `A ≡ C` edge.

## Failure behavior

Provider failures are safe HTTP errors. Invalid contract inputs revert with
bounded codes. Model execution failure or malformed output produces a safe
`AMBIGUOUS` result or consensus failure and leaves state unchanged. A failed
write is never rendered as success.
