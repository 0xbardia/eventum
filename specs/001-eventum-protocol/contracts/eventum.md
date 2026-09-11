# Contract Interface Contract: Eventum

## Public writes

### `register_market_snapshot`

Accepts the explicit normalized snapshot fields defined in
`MarketSnapshot`. Validates and stores one immutable record, returns its
content-derived ID, and advances the provider-market version pointer.

### `compare_markets`

Accepts two existing distinct snapshot IDs and a comparison version. Copies
both records into memory, invokes the current GenLayer nondeterministic
leader/validator semantic path, validates and bounds the consensus result,
then stores one immutable direct comparison edge.

## Public reads

- `get_protocol_version()`
- `get_market_count()`
- `get_comparison_count()`
- `get_market_snapshot(snapshot_id)`
- `get_latest_market_snapshot(platform, platform_market_id)`
- `get_market_ids(offset, limit)`
- `get_comparison(comparison_id)`
- `get_latest_comparison(snapshot_a_id, snapshot_b_id)`
- `get_relationship(snapshot_a_id, snapshot_b_id)`
- `get_comparison_ids(offset, limit)`
- `get_graph_edges(offset, limit)`

Missing IDs and invalid ranges use explicit user errors. Read output is JSON-like
structured data with bounded strings and arrays. Reverse relationship reads are
computed from the stored canonical edge without creating a second edge.

## Compatibility rules

The public result relation is one of the eleven allowlisted values. Protocol
version and comparison version are explicit strings. The contract does not
expose a confidence percentage and does not accept a backend equivalence flag.

