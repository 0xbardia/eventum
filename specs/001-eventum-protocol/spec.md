# Feature Specification: Eventum Protocol and Product

**Feature branch**: `001-eventum-protocol`  
**Created**: 2026-09-08  
**Status**: Implemented; release verification complete  
**Input**: Contract-first semantic interoperability layer for prediction markets

## User Scenarios & Testing

### User Story 1 - Compare two published markets (Priority: P1)

A researcher enters two supported market URLs and inspects the resolved,
versioned evidence before requesting a consensus-backed comparison.

**Why this priority**: This is the product's defining action and the shortest
path to proving why Eventum exists.

**Independent Test**: Resolve two real Polymarket URLs, display both complete
previews, submit the comparison through the deployed contract, and render the
final structured relationship with its transaction evidence.

**Acceptance Scenarios**:

1. Given two valid supported URLs, when the user resolves them, then each
   preview shows provider attribution, market ID, title, outcomes, time fields,
   rules, resolution source, retrieval time, and source hash.
2. Given two immutable snapshot IDs, when comparison is requested, then the
   Intelligent Contract performs the semantic adjudication and persists the
   result only after its consensus path returns a validated decision.
3. Given a result, when the user opens its permalink, then the page shows the
   relation, settlement and aggregation safety, direction-aware outcome map,
   reason codes, material differences, evidence hashes, contract address, and
   transaction lifecycle.

### User Story 2 - Register immutable market history (Priority: P1)

An integrator registers a market snapshot and later registers an amended
version without changing the earlier snapshot or comparisons that reference it.

**Independent Test**: Register the same snapshot twice, observe deterministic
duplicate rejection, register changed rules, verify version 2, and confirm the
version 1 read remains byte-for-byte stable.

**Acceptance Scenarios**:

1. Given valid structured evidence, when a snapshot is registered, then its ID
   is derived from canonical content and its version is persisted onchain.
2. Given identical canonical content, when it is registered again, then the
   contract rejects the duplicate without mutating counters or history.
3. Given changed evidence for the same provider market ID, when registered,
   then a new immutable version is created and the latest pointer advances.

### User Story 3 - Inspect relationships safely (Priority: P1)

An agent or researcher reads a relationship in either order and can distinguish
direct adjudication from unsupported transitive inference.

**Independent Test**: Store representative relations, query forward and
reverse order, and verify inverse mappings; create A=B and B=C and confirm no
synthetic A=C edge is returned.

**Acceptance Scenarios**:

1. Given an equivalent, unrelated, or conflicting comparison, when queried in
   reverse order, then symmetry is preserved.
2. Given a subset comparison, when queried in reverse order, then the relation
   becomes `SUPERSET` and the outcome mapping reverses by direction.
3. Given two direct equivalent edges sharing a node, when graph edges are read,
   then only direct consensus-backed edges are returned.

### User Story 4 - Handle hostile or inconclusive evidence (Priority: P1)

The protocol remains safe when market text, web content, URLs, or model output
is malformed, adversarial, oversized, or inconclusive.

**Independent Test**: Run adversarial Direct Mode fixtures and malformed
provider responses; verify rejection or `AMBIGUOUS`, never an invented
`EQUIVALENT` state.

**Acceptance Scenarios**:

1. Given prompt-injection text in a title or rules field, when compared, then
   the quoted text is treated as evidence and cannot alter system instructions.
2. Given malformed model JSON, an unknown enum, or a hallucinated outcome,
   when adjudication completes, then the result is rejected or safe
   `AMBIGUOUS` with a reason code.
3. Given a private-network URL, redirect, oversized body, HTML response, or
   timeout, when a market is resolved, then the request fails with a safe,
   actionable provider error.

### User Story 5 - Operate the real application (Priority: P2)

A reviewer can use the production site, see the configured deployed contract,
read its state, and understand which claims are real, demo, or unavailable.

**Independent Test**: Run the production build, visit every public route on
desktop and mobile Chromium, monitor errors/network requests, and reload deep
links through the production domain.

**Acceptance Scenarios**:

1. Given no wallet, when a write is attempted, then the UI explains that a
   browser wallet is required and does not claim success.
2. Given a wrong chain, when a wallet is connected, then the UI identifies the
   configured chain and does not silently switch it.
3. Given a pending GenLayer transaction, when the page is reloaded, then the
   lifecycle remains explicit and no premature success state is shown.

## Functional Requirements

### Protocol and contract

- **FR-001**: The Intelligent Contract MUST be the authority for semantic
  relationship results; an opaque backend boolean MUST NOT be accepted as the
  result.
- **FR-002**: The contract MUST persist immutable market snapshots containing
  provider, provider market ID, canonical URL, title, description, outcomes,
  rules, resolution source, time fields, clarifications, retrieval metadata,
  source hash, and normalized semantic facts.
- **FR-003**: Snapshot IDs MUST be deterministic hashes of canonical validated
  content; a changed snapshot MUST create a new version.
- **FR-004**: The contract MUST support the relation taxonomy
  `EQUIVALENT`, `CONDITIONAL_EQUIVALENT`, `SUBSET`, `SUPERSET`, `OVERLAPPING`,
  `CONFLICTING`, `TEMPORAL_MISMATCH`, `SOURCE_MISMATCH`, `OUTCOME_MISMATCH`,
  `UNRELATED`, and `AMBIGUOUS`.
- **FR-005**: The contract MUST persist safe-to-compare, safe-to-aggregate,
  derived canonical event key when safe, direction-aware outcome mapping,
  bounded reason codes, material differences, rationale, snapshot IDs,
  evidence hashes, and comparison version. `safe_to_aggregate` MUST remain
  false unless the result proves a complete one-to-one outcome mapping with
  equal outcome cardinality and a safe canonical identity.
- **FR-006**: Semantic adjudication MUST run through current GenLayer
  nondeterministic execution and an Equivalence Principle validator path; it
  MUST validate stable structured fields independently.
- **FR-007**: Evidence MUST be clearly delimited as untrusted data in prompts;
  evidence instructions MUST never be treated as executable instructions.
- **FR-008**: Invalid or inconclusive evidence MUST fail closed as an error or
  `AMBIGUOUS`; it MUST never become `EQUIVALENT` through exception swallowing.
- **FR-009**: A snapshot MUST NOT compare to itself; duplicate pair/version
  submissions MUST be deterministic and historical comparisons MUST remain
  unchanged.
- **FR-010**: Reverse reads MUST invert `SUBSET`/`SUPERSET` and outcome mapping
  direction while preserving symmetric relations.
- **FR-011**: The graph MUST expose direct stored edges only; it MUST NOT use
  unsafe transitive closure to infer equivalence.
- **FR-012**: Public reads MUST expose protocol version, counts, snapshots,
  comparison history, relationship lookup, and direct graph edges.

### Backend and provider boundary

- **FR-013**: The backend MUST use schemas for every request body and MUST
  validate client-supplied provider metadata against the resolver result.
- **FR-014**: The first production provider MUST be a verified public Polymarket
  Gamma API adapter with explicit attribution; unsupported URLs MUST return a
  clear unsupported-provider error.
- **FR-015**: URL fetching MUST enforce HTTP(S), provider host allowlisting,
  public DNS/address checks, redirect revalidation, timeouts, body-size limits,
  and JSON content-type validation.
- **FR-016**: Offchain persistence MAY cache raw evidence and previews, but it
  MUST never override newer finalized onchain state.
- **FR-017**: Production responses MUST not expose secrets, stack traces, or
  opaque provider internals; logs MUST be structured and useful.

### Application and accessibility

- **FR-018**: The compare flow MUST resolve, preview, submit, track lifecycle,
  and render the exact structured contract result.
- **FR-019**: Wallet UI MUST distinguish absent, disconnected, wrong-network,
  signature, submitted, consensus-pending, decided, finalized, failed, and
  ambiguous states.
- **FR-020**: The frontend MUST render untrusted market content as text, use
  safe external-link attributes, and avoid exposing private environment values.
- **FR-021**: Main routes MUST be keyboard usable, semantically structured,
  visibly focused, contrast-aware, reduced-motion aware, and free of horizontal
  overflow at 360px through desktop widths.
- **FR-022**: UI claims MUST be labeled as real, demo, or unavailable; fake
  adoption, liquidity, coverage, and transaction evidence MUST NOT appear.

## Key Entities

- **MarketSnapshot**: Immutable, versioned evidence record for one provider
  market state.
- **Comparison**: Consensus-backed direct relationship between two snapshots.
- **OutcomeMapping**: Direction-aware mapping between published outcome labels.
- **ReasonCode**: Bounded machine-readable explanation for a semantic result.
- **EvidenceHash**: Integrity reference for a source snapshot or supporting
  material.
- **GraphEdge**: Direct persisted comparison; never an inferred closure edge.

## Non-Functional Requirements

- **NFR-001**: Contract writes MUST bound strings, arrays, JSON, and storage
  operations to limit payload and storage denial of service.
- **NFR-002**: Contract state transitions MUST be deterministic after consensus,
  and failed adjudication MUST leave state unchanged.
- **NFR-003**: A clean setup MUST be reproducible from README instructions with
  pinned tool versions and no private credential in source control.
- **NFR-004**: Production browser QA MUST monitor page errors, console errors,
  failed requests, hydration issues, deep links, and responsive overflow.

## Assumptions and Defaults

- Version 1 uses one verified provider, Polymarket Gamma, and a manual
  structured-evidence path is deferred until a real use case requires it.
- Version 1 uses one Next.js process with route handlers and an atomic JSON
  cache; PostgreSQL is deferred because there is no multi-process or high-volume
  need yet.
- The stable Studio environment is Studionet, chain ID `61999`, RPC
  `https://studio.genlayer.com/api`; Bradbury is optional validation only.
- No token, staking, governance, admin override, or challenge mechanism ships
  without a separately justified protocol requirement.
- Free-form heuristic confidence is not protocol state and is omitted from the
  canonical result.

## Success Criteria

- **SC-001**: A reviewer can reproduce a real provider resolution and inspect
  both complete snapshots in under two minutes.
- **SC-002**: The deployed contract's source hash matches the tested source and
  every public read and meaningful write path has recorded evidence.
- **SC-003**: Direct Mode, adversarial, backend, frontend, build, and
  production Chromium checks pass with no unresolved critical errors.
- **SC-004**: A reviewer can see why a relationship is safe, unsafe, or
  ambiguous without relying on a confidence percentage.
- **SC-005**: A graph read never presents transitive equivalence as a direct
  consensus-backed fact.
