# Data Model: Eventum

## Onchain records

### MarketSnapshot

Immutable record keyed by `snapshot_id`:

`market_key`, `version`, `platform`, `platform_market_id`, `source_url`,
`title`, `description`, `outcomes_json`, `resolution_rules`,
`resolution_source`, `open_time`, `close_time`, `resolution_deadline`,
`clarifications`, `retrieved_at`, `source_hash`, `normalized_facts_json`, and
an optional bounded `canonical_event_hint`.

`snapshot_id = sha256(canonical validated fields)`. `market_key` is derived from
provider and provider ID. The latest pointer can move; an existing record
cannot.

### Comparison

Immutable direct edge keyed by `comparison_id`:

`snapshot_a_id`, `snapshot_b_id` (canonical storage order), relation,
`safe_to_compare`, `safe_to_aggregate`, derived canonical event key when safe,
direction-neutral outcome map in JSON, reason codes, material differences,
concise rationale, evidence hashes, and comparison version.

The pair index points to the newest comparison for lookup, while the history
array preserves all comparison IDs. A repeated exact pair/version is rejected
or returns the existing deterministic record according to the contract method's
documented duplicate policy; it never mutates history.

## Offchain records

The release uses `DATABASE_PATH` as the path to a small atomic JSON cache. The
file is an operational cache, not a second protocol authority, and is created
with a `0600` file mode in a `0700` directory. PostgreSQL and SQLite are
deferred until measured multi-process or query requirements justify them.

### `market_snapshots`

Stores provider, provider ID, snapshot ID/version, canonical URL, raw payload,
normalized JSON, source hash, retrieval timestamp, and status. Raw payload is
not authoritative.

### `comparison_cache`

Stores pair IDs, comparison version, contract comparison ID, serialized result,
and finalization timestamp. Cache reads are invalidated if the contract returns
a different latest result.

### `contract_transactions`

Stores tx hash, operation, local request ID, lifecycle state, and error summary;
never private keys.

## Invariants

- Outcome labels are nonempty, bounded, and unique case-insensitively.
- Snapshot source hashes are exactly 64 lowercase/uppercase hex characters.
- A pair has distinct snapshot IDs and canonical sorted storage order.
- Reverse reads invert only directional relations and mappings.
- Aggregation is false unless the normalized result proves a complete
  one-to-one outcome mapping, equal outcome cardinality, and a safe identity.
- Graph queries return stored edges, never inferred edges.
