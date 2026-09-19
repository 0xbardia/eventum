# Snapshot identity

The current contract is `eventum/1.1.1` at
`0x96F23489C251135965b13303A991b2B9579bdF19` on Studionet chain `61999`.

The application first creates an offchain preview from Polymarket Gamma data.
Its submitted `source_hash` and `canonical_event_hint` are registration
inputs only. During `register_market_snapshot`, GenLayer corroborates the
source, derives the canonical event identity, computes `source_evidence_hash`,
and returns the authoritative snapshot ID.

After a finalized registration, Eventum reads the snapshot back from the
contract and uses that record—including the derived canonical hint and
`source_evidence_hash`—for the comparison. The application never presents a
caller-provided source hash as authoritative provenance.

Snapshot identity remains settlement-material and stable across retrieval
metadata changes. Accepted comparisons reference the contract snapshot IDs;
rejected Comparison Runs remain application history and do not create fake
`/comparisons/<id>` pages or graph edges.
