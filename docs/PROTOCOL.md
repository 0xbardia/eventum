# Eventum protocol

## Protocol question

> Would these markets resolve identically under all materially relevant
> interpretations of their published rules?

Prices, liquidity, popularity, and embeddings are not settlement evidence.

## Snapshot identity

A snapshot captures platform, provider market ID, canonical source URL,
question/title, description, exact outcomes, resolution rules and authority,
open/close/deadline fields, clarifications, retrieval time, source hash, and
bounded normalized facts. The contract derives:

- `market_key = sha256("eventum:market:v1|" + lowercase(platform) + "|" + provider_id)`
- `snapshot_id = sha256("eventum:snapshot:v1|" + canonical_json(identity))`

The version is monotonic per provider market key. A changed document creates a
new immutable snapshot; existing comparisons point at their original IDs.

## Relationship taxonomy

| Relation | Meaning |
|---|---|
| `EQUIVALENT` | Same settlement for all materially relevant interpretations; safe aggregation additionally requires a shared canonical hint, equal outcome cardinality, and a complete one-to-one outcome mapping. |
| `CONDITIONAL_EQUIVALENT` | Equivalent only if an explicit condition or assumption holds; not unconditional aggregation. |
| `SUBSET` | Every settlement case in A is represented by B, but B covers additional cases. |
| `SUPERSET` | Inverse of `SUBSET`. |
| `OVERLAPPING` | Some settlement cases overlap, but neither market contains the other. |
| `CONFLICTING` | Shared subject or event context with genuinely incompatible or contradictory settlement behavior; a nested threshold is not conflicting merely because it can resolve differently. |
| `TEMPORAL_MISMATCH` | Material date, deadline, timezone, or period difference. |
| `SOURCE_MISMATCH` | Material resolution-authority or fallback-source difference. |
| `OUTCOME_MISMATCH` | Published outcome spaces do not safely correspond. |
| `UNRELATED` | No shared event/action/entity supports a relationship. |
| `AMBIGUOUS` | Evidence or consensus is insufficient for a safe classification. |

The minimum user-facing distinction is fully equivalent, conditional, one-way
implication, partial overlap, conflicting, unrelated, and ambiguous. The
specialized mismatch relations make the material reason explicit.

For a shared event, adjudication applies a mutually exclusive precedence: reject
unrelated evidence or insufficient evidence first; then test equivalence, set
containment (`SUBSET`/`SUPERSET`), explicit conditional equivalence, partial
overlap, and only then genuine conflict or a specialized mismatch. A market with
`BTC low <= 80,000` contains the settlement cases for `BTC low <= 77,500`, so
when all other published rules align, the former is `SUPERSET` and the latter is
`SUBSET` in the requested direction.

## Comparison record

Each stored result contains relation, `safe_to_compare`,
`safe_to_aggregate`, contract-derived canonical event key when safe,
direction-aware outcome mapping, bounded reason codes, material differences,
concise rationale, both snapshot IDs, evidence hashes, comparison version, and
deterministic comparison ID.

There is no protocol confidence percentage. Any future heuristic must be
clearly labeled non-authoritative and cannot override consensus state.

## Invariants

- `EQUIVALENT`, `UNRELATED`, and `CONFLICTING` are symmetric.
- `SUBSET` and `SUPERSET` invert on reverse lookup.
- Outcome mappings invert with direction, including many-to-one mappings.
- A snapshot cannot compare to itself.
- Duplicate snapshot and pair/version writes are predictable and do not mutate
  historical state.
- Graph edges are direct only; no silent transitivity.
- Ambiguity never upgrades to equivalence.
- Aggregation is false unless the outcome mapping is a complete bijection; a
  many-to-one or one-to-many mapping can remain explanatory but cannot authorize
  aggregation.
