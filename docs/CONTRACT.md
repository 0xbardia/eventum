# Intelligent Contract

Source: [`contracts/eventum.py`](../contracts/eventum.py)  
SHA-256: `f92810de3e381bea9938fc38c55b2ba0625274f239ecf617905539019f5496d4`  
Protocol version: `eventum/1.0.0`  
Comparison version: `1.0.0`

## State

The contract uses GenLayer `TreeMap`, `DynArray`, and `u256` storage for
immutable snapshots, latest/version indexes, comparison records, pair indexes,
ordered IDs, and counts. Strings, lists, mappings, normalized facts, reason
codes, and differences are bounded before storage.

## Public writes

### `register_market_snapshot`

Arguments are `platform`, provider market ID, source URL, title, description,
outcomes JSON, resolution rules, resolution source, open time, close time,
resolution deadline, clarifications, retrieved timestamp, 64-character source
hash, normalized facts JSON, and canonical event hint. The method validates all
fields, derives the snapshot ID, increments the per-market version, and stores
one immutable record.

### `compare_markets`

Arguments are two snapshot IDs and `1.0.0`. The method canonicalizes pair
storage, rejects self-pairs, constructs a quoted-evidence prompt, calls
`gl.nondet.exec_prompt` through the current GenLayer execution model, runs an
independent validator on stable semantic fields, normalizes the result, and
persists one direct comparison record. Repeating the same pair/version returns
the existing ID.

## Public reads

| Method | Arguments | Purpose |
|---|---|---|
| `get_protocol_version` | none | protocol version |
| `get_market_count` | none | snapshot count |
| `get_comparison_count` | none | comparison count |
| `get_market_snapshot` | snapshot ID | immutable snapshot |
| `get_latest_market_snapshot` | platform, provider ID | latest pointer |
| `get_market_ids` | offset, limit | paginated snapshot IDs |
| `get_comparison` | comparison ID | stored canonical comparison |
| `get_latest_comparison` | snapshot A, snapshot B | latest pair result in requested orientation |
| `get_relationship` | snapshot A, snapshot B | relationship alias with orientation |
| `get_comparison_ids` | offset, limit | paginated comparison IDs |
| `get_graph_edges` | offset, limit | direct edge projection |

All 11 reads were exercised against the finalized Studionet deployment. See
`docs/STUDIO_VERIFICATION.md` and `scripts/verify-studionet.ts`.

The current operator deployment is populated with two finalized market
snapshots, one accepted comparison, and one direct graph edge. Exact current
deployment and transaction evidence is maintained in
`deployments/studionet.json` and the release artifacts. Direct Mode continues
to cover write validation and semantic behavior.

## Prompt and validation

Evidence is enclosed between `UNTRUSTED_EVIDENCE_START` and
`UNTRUSTED_EVIDENCE_END`. The system instructions explicitly treat the
contents as quoted data, list allowed relation/reason enums, require an exact
JSON shape, prohibit invented labels/identity, and ask checkable questions
about event, actor, action, time, threshold, authority, exceptions, and
outcomes. Contract validation rejects unknown enums, unknown outcomes,
unbounded arrays/text, invalid mappings, and invented canonical keys.

The contract derives canonical identity only when both supplied hints match and
the relation is `EQUIVALENT`. Aggregation remains false unless both outcome
spaces have equal cardinality and the mapping is a complete one-to-one
bijection covering the full target outcome space.

## Safe failures

Invalid URLs, missing snapshots, malformed outcomes/facts, invalid hashes,
oversized inputs, duplicate snapshots, self-pairs, unsupported comparison
versions, unknown models results, and invalid pages produce bounded errors or
an `AMBIGUOUS` record. Exceptions are not converted to equivalence.
