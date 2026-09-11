# Implementation Plan: Eventum Protocol and Product

## Technical Context

**Language/Version**: Python 3.14 for the Intelligent Contract; TypeScript on
Node 20 for the application.  
**Primary dependencies**: `genlayer-test==0.29.2` for Direct Mode,
`genlayer-js==1.1.8`, Next.js, React, and Zod.  
**Storage**: GenLayer `TreeMap`/`DynArray` onchain; an atomic JSON cache under
`data/` offchain.  
**Testing**: pytest/gltest Direct Mode, Node tests, Next build, Playwright
Chromium against production build.  
**Target**: Studionet (chain ID 61999) with optional Bradbury validation.

## Constitution Check

| Principle | Design response | Gate |
|---|---|---|
| Contract first | Contract and Direct Mode tests precede application UX | PASS when contract tests pass |
| GenLayer necessity | Independent consensus adjudicates heterogeneous natural-language rules | PASS when Studio result is verified |
| Semantic safety | Relation + reasons + material differences, no similarity score | PASS |
| Immutable evidence | Content-derived snapshot IDs and monotonic versions | PASS |
| No silent transitivity | Graph stores direct edges only | PASS |
| Explainability | Bounded reasons, differences, rationale, hashes | PASS |
| Fail safe | Invalid/undetermined outputs become error or AMBIGUOUS | PASS |
| Injection resistance | Delimited evidence, strict JSON, independent validator | PASS |
| Real product | Backend/frontend point to configured deployed address | Release gate |
| Evidence release | Docs record actual commands, hashes, txs, and browser checks | Release gate |

## Architecture

1. `contracts/eventum.py` is the sole protocol implementation. It validates
   snapshot input, derives IDs, stores immutable records, runs consensus-backed
   comparison, persists a bounded result, and exposes read methods.
2. `src/lib/providers/polymarket.ts` resolves only allowlisted Polymarket URLs
   through the Gamma API and returns a normalized `MarketEvidence` object.
3. `src/lib/db.ts` owns the small atomic JSON cache; onchain state wins whenever
   both exist. A database migration is intentionally not shipped.
4. Next.js route handlers expose health, status, resolution, preparation, and
   read/graph endpoints. They share schema validation and SSRF-safe provider
   fetch code.
5. React pages render evidence-first views. The compare client owns wallet and
   GenLayer transaction lifecycle; it never simulates a contract result.
6. Playwright runs against `next start`, with screenshots and machine-readable
   evidence under `artifacts/qa/`.

## Data Flow

`URL → allowlisted provider adapter → normalized evidence → source hash →
atomic preview/cache → wallet register write(s) → contract snapshot IDs →
wallet compare write → GenLayer decision/finalization → contract read →
shareable result and direct graph edge`

## Milestones

1. Contract model, validators, and Direct Mode matrix.
2. Contract security review and source hash.
3. Studionet deployment and all-read/write verification.
4. Verified provider adapter, API, and cache.
5. Frontend routes and real wallet/read/write integration.
6. Static, security, responsive, accessibility, and production QA.
7. PM2/nginx/HTTPS deployment and production browser verification.

## Risks and mitigations

- Studio credentials or wallet approval may be unavailable: document the exact
  external blocker and keep local verification honest.
- GenLayer SDK compatibility can change: pin versions and record source/date in
  `docs/GENLAYER_COMPATIBILITY.md`.
- Provider fields can be incomplete: preserve explicit empty fields and return
  unsupported/incomplete errors instead of inventing rules.
- Consensus can be unresolved: retain no mutation and surface ambiguity.
